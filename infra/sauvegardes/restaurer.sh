#!/usr/bin/env bash
# Restauration d'une sauvegarde chiffrée produite par sauvegarder.sh.
#
#   CIBLE_DATABASE_URL="postgresql://..." ./infra/sauvegardes/restaurer.sh <fichier.dump.gpg>
#   CIBLE_DATABASE_URL="postgresql://..." ./infra/sauvegardes/restaurer.sh --derniere
#
# --derniere télécharge la sauvegarde de la dernière exécution réussie du workflow
# « Sauvegarde de la base » (nécessite gh, authentifié).
#
# Conseil Neon : restaurer d'abord dans une NOUVELLE branche Neon, vérifier l'application
# sur cette branche, puis basculer DATABASE_URL dessus, plutôt que d'écraser la production.
#
# Variables : CIBLE_DATABASE_URL (obligatoire), SAUVEGARDE_PHRASE_SECRETE (demandée si absente),
#             CONFIRMER=oui pour ne pas demander de confirmation (usage automatisé).
# Prérequis : docker, gpg, sha256sum.
set -euo pipefail

: "${CIBLE_DATABASE_URL:?CIBLE_DATABASE_URL manquante (base dans laquelle restaurer)}"
SOURCE="${1:?Usage : restaurer.sh <fichier.dump.gpg> | --derniere}"
TRAVAIL="$(mktemp -d)"
export DATABASE_URL="$CIBLE_DATABASE_URL"
trap 'rm -rf "$TRAVAIL"' EXIT

pg() {
  local version="$1"; shift
  docker run --rm --network host --user "$(id -u):$(id -g)" -e DATABASE_URL -v "$TRAVAIL:/travail:z" "postgres:${version}-alpine" "$@"
}

if [ "$SOURCE" = "--derniere" ]; then
  RUN=$(gh run list --workflow sauvegarde.yml --status success --limit 1 --json databaseId --jq '.[0].databaseId')
  [ -n "$RUN" ] || { echo "Aucune sauvegarde réussie trouvée sur GitHub." >&2; exit 1; }
  gh run download "$RUN" --dir "$TRAVAIL/telechargement"
  SOURCE=$(find "$TRAVAIL/telechargement" -name '*.dump.gpg' | head -1)
  echo "Sauvegarde téléchargée : $(basename "$SOURCE") (exécution $RUN)"
fi
[ -f "$SOURCE" ] || { echo "Fichier introuvable : $SOURCE" >&2; exit 1; }

if [ -f "$SOURCE.sha256" ]; then
  (cd "$(dirname "$SOURCE")" && sha256sum --check --quiet "$(basename "$SOURCE").sha256")
  echo "Empreinte SHA-256 vérifiée."
fi

if [ -z "${SAUVEGARDE_PHRASE_SECRETE:-}" ]; then
  read -r -s -p "Phrase secrète de la sauvegarde : " SAUVEGARDE_PHRASE_SECRETE; echo
fi
gpg --batch --yes --quiet --pinentry-mode loopback --decrypt \
  --passphrase-file <(printf '%s' "$SAUVEGARDE_PHRASE_SECRETE") \
  --output "$TRAVAIL/sauvegarde.dump" "$SOURCE"

NUM=$(pg 17 sh -c 'psql "$DATABASE_URL" -tAX -c "show server_version_num"')
VERSION=$((NUM / 10000))
BASE=$(pg "$VERSION" sh -c 'psql "$DATABASE_URL" -tAX -c "select current_database()"')
HOTE=$(pg "$VERSION" sh -c 'psql "$DATABASE_URL" -tAX -c "select coalesce(inet_server_addr()::text, '\''local'\'')"')
echo "Base cible : « $BASE » (PostgreSQL $VERSION, serveur $HOTE)"
echo "Son contenu actuel sera REMPLACÉ par la sauvegarde."

if [ "${CONFIRMER:-}" != "oui" ]; then
  read -r -p "Pour confirmer, retapez le nom de la base : " REPONSE
  [ "$REPONSE" = "$BASE" ] || { echo "Restauration annulée."; exit 1; }
fi

# Une seule transaction : en cas d'erreur, la base reste dans son état d'avant
pg "$VERSION" sh -c 'pg_restore -d "$DATABASE_URL" --clean --if-exists --no-owner --no-privileges --single-transaction --exit-on-error /travail/sauvegarde.dump'

PATIENTS=$(pg "$VERSION" sh -c 'psql "$DATABASE_URL" -tAX -c "select count(*) from patients_patient"')
echo "Restauration terminée : $PATIENTS patients dans « $BASE »."

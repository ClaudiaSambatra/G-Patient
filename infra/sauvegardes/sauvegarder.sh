#!/usr/bin/env bash
# Sauvegarde chiffrée de la base PostgreSQL, avec test de restauration.
#
# Fonctionne avec n'importe quel PostgreSQL (Neon, conteneur Docker, serveur) :
#   DATABASE_URL="postgresql://..." SAUVEGARDE_PHRASE_SECRETE="..." ./infra/sauvegardes/sauvegarder.sh
#
# Étapes :
#   1. détection de la version du serveur (outils pg_dump de la même version majeure)
#   2. pg_dump au format personnalisé (compressé)
#   3. test de restauration dans un PostgreSQL jetable et comparaison du nombre de lignes de chaque table
#   4. chiffrement AES-256 (GPG) ; la copie en clair est effacée
#
# Variables : DATABASE_URL, SAUVEGARDE_PHRASE_SECRETE (obligatoires), DOSSIER_SAUVEGARDES (défaut : ./sauvegardes)
# Prérequis : docker, gpg, sha256sum.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL manquante}"
: "${SAUVEGARDE_PHRASE_SECRETE:?SAUVEGARDE_PHRASE_SECRETE manquante}"
DOSSIER="${DOSSIER_SAUVEGARDES:-./sauvegardes}"
HORODATAGE="$(date -u +%Y-%m-%d_%H%M)"
CONTENEUR_TEST="sauvegarde-test-$$"
TRAVAIL="$(mktemp -d)"
export DATABASE_URL

nettoyer() {
  docker rm -f "$CONTENEUR_TEST" >/dev/null 2>&1 || true
  rm -rf "$TRAVAIL"
}
trap nettoyer EXIT

# Client PostgreSQL de la version voulue ; l'URL (et son mot de passe) passe par l'environnement,
# jamais par la ligne de commande
pg() {
  local version="$1"; shift
  docker run --rm --network host --user "$(id -u):$(id -g)" -e DATABASE_URL -v "$TRAVAIL:/travail:z" "postgres:${version}-alpine" "$@"
}

# Nombre exact de lignes de chaque table du schéma public, trié par nom
REQUETE_COMPTAGE="select table_name || ' ' || (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text
from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name"

echo "1/4 Version du serveur"
NUM=$(pg 17 sh -c 'psql "$DATABASE_URL" -tAX -c "show server_version_num"')
VERSION=$((NUM / 10000))
echo "    PostgreSQL ${VERSION} (${NUM})"

echo "2/4 Sauvegarde (pg_dump)"
FICHIER="gestion_patients_${HORODATAGE}.dump"
pg "$VERSION" sh -c 'pg_dump "$DATABASE_URL" --format=custom --compress=9 --no-owner --no-privileges --file "/travail/$1"' _ "$FICHIER"
pg "$VERSION" sh -c 'psql "$DATABASE_URL" -tAX -c "$1"' _ "$REQUETE_COMPTAGE" > "$TRAVAIL/source.txt"
echo "    $(du -h "$TRAVAIL/$FICHIER" | cut -f1), $(wc -l < "$TRAVAIL/source.txt") tables"

echo "3/4 Test de restauration dans une base jetable"
docker run -d --name "$CONTENEUR_TEST" -e POSTGRES_PASSWORD=test -v "$TRAVAIL:/travail:ro,z" "postgres:${VERSION}-alpine" >/dev/null
for _ in $(seq 1 30); do
  docker exec "$CONTENEUR_TEST" pg_isready -U postgres -q 2>/dev/null && break
  sleep 1
done
docker exec "$CONTENEUR_TEST" pg_restore -U postgres -d postgres --no-owner --no-privileges --exit-on-error "/travail/$FICHIER"
docker exec "$CONTENEUR_TEST" psql -U postgres -tAX -c "$REQUETE_COMPTAGE" > "$TRAVAIL/restauree.txt"
if ! diff -u "$TRAVAIL/source.txt" "$TRAVAIL/restauree.txt" > "$TRAVAIL/ecarts.txt"; then
  # Des écarts de lignes sont possibles si l'application a écrit pendant la sauvegarde ;
  # une table absente, en revanche, signale une sauvegarde incomplète
  cat "$TRAVAIL/ecarts.txt"
  if [ "$(cut -d' ' -f1 "$TRAVAIL/source.txt")" != "$(cut -d' ' -f1 "$TRAVAIL/restauree.txt")" ]; then
    echo "ERREUR : la base restaurée n'a pas les mêmes tables que la source." >&2
    exit 1
  fi
  echo "    Attention : nombres de lignes différents (écritures pendant la sauvegarde ?)"
fi
echo "    Restauration OK : $(wc -l < "$TRAVAIL/restauree.txt") tables, $(grep '^patients_patient ' "$TRAVAIL/restauree.txt" | cut -d' ' -f2 || echo 0) patients"

echo "4/4 Chiffrement (AES-256)"
mkdir -p "$DOSSIER"
gpg --batch --yes --quiet --pinentry-mode loopback --symmetric --cipher-algo AES256 \
  --passphrase-file <(printf '%s' "$SAUVEGARDE_PHRASE_SECRETE") \
  --output "$DOSSIER/$FICHIER.gpg" "$TRAVAIL/$FICHIER"
(cd "$DOSSIER" && sha256sum "$FICHIER.gpg" > "$FICHIER.gpg.sha256")
cp "$TRAVAIL/restauree.txt" "$DOSSIER/$FICHIER.tables.txt"
echo "    $DOSSIER/$FICHIER.gpg"

# Informations reprises par le workflow GitHub Actions
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "fichier=$FICHIER.gpg"
    echo "version=$VERSION"
    echo "tables=$(wc -l < "$TRAVAIL/restauree.txt")"
    echo "taille=$(du -h "$DOSSIER/$FICHIER.gpg" | cut -f1)"
  } >> "$GITHUB_OUTPUT"
fi

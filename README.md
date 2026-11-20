# Gestion de Patients — Environnement de développement

[![CI/CD](https://github.com/ClaudiaSambatra/G-Patient/actions/workflows/ci.yml/badge.svg)](https://github.com/ClaudiaSambatra/G-Patient/actions/workflows/ci.yml)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=ClaudiaSambatra_G-Patient&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=ClaudiaSambatra_G-Patient)
[![Couverture](https://sonarcloud.io/api/project_badges/measure?project=ClaudiaSambatra_G-Patient&metric=coverage)](https://sonarcloud.io/summary/new_code?id=ClaudiaSambatra_G-Patient)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=ClaudiaSambatra_G-Patient&metric=bugs)](https://sonarcloud.io/summary/new_code?id=ClaudiaSambatra_G-Patient)

Mono-dépôt du projet de mémoire DevOps : `backend` (Django + DRF), `frontend`
(Next.js), orchestrés avec Docker Compose pour le développement local.

## Prérequis

- [Docker](https://docs.docker.com/get-docker/) et Docker Compose (inclus dans
  Docker Desktop, ou `docker-compose-plugin` sur Linux)
- Git

Rien d'autre n'est nécessaire : Python, Node.js et PostgreSQL tournent dans
les conteneurs, pas besoin de les installer sur ta machine.

## Installation et lancement (première fois)

1. **Cloner / récupérer le projet**, puis se placer à la racine (là où se
   trouve ce `README.md` et le fichier `docker-compose.yml`) :

   ```bash
   cd gestion-patients
   ```

2. **Vérifier les fichiers d'environnement.** Ils sont déjà fournis prêts à
   l'emploi pour le développement local :
   - `backend/.env` (déjà créé, basé sur `backend/.env.example`)
   - `frontend/.env.local` (déjà créé, basé sur `frontend/.env.example`)

   Tu peux les laisser tels quels pour démarrer ; adapte-les si besoin
   (mots de passe, ports...).

3. **Construire les images et démarrer tous les services :**

   ```bash
   docker compose up --build
   ```

   (utilise `docker-compose up --build` si tu as l'ancienne version en
   binaire séparé)

   Cela démarre 5 conteneurs :
   | Service    | URL / Port                          |
   |------------|--------------------------------------|
   | frontend   | http://localhost:3000                |
   | backend    | http://localhost:8000/api/           |
   | mailpit    | http://localhost:8025                |
   | db         | localhost:5432 (PostgreSQL)          |
   | pgadmin    | http://localhost:5050                |

4. **Dans un second terminal**, une fois que les conteneurs tournent,
   applique les migrations et crée un compte administrateur :

   ```bash
   docker compose exec backend python manage.py migrate
   docker compose exec backend python manage.py createsuperuser
   ```

5. Ouvre ensuite :
   - **http://localhost:3000** → le frontend Next.js
   - **http://localhost:8025** → Mailpit (visualiser les emails de récupération / OTP en direct)
   - **http://localhost:8000/admin/** → l'admin Django (connecte-toi avec le
     superuser créé à l'étape 4)
   - **http://localhost:8000/api/patients/** → l'API REST (nécessite un token
     JWT, voir plus bas)
   - **http://localhost:5050** → pgAdmin (email `admin@example.com`,
     mot de passe `admin` — voir "Connecter pgAdmin à la base" ci-dessous)

## Obtenir un token JWT pour tester l'API

```bash
curl -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username": "TON_SUPERUSER", "password": "TON_MOT_DE_PASSE"}'
```

Utilise ensuite le `access` token reçu :

```bash
curl http://localhost:8000/api/patients/ \
  -H "Authorization: Bearer TON_TOKEN"
```

## Connecter pgAdmin à la base

Dans pgAdmin (http://localhost:5050) : clic droit sur "Servers" → "Register"
→ "Server", puis :
- **General / Name** : `gestion_patients` (libre)
- **Connection / Host** : `db` (nom du service Docker, pas `localhost`)
- **Port** : `5432`
- **Username** : `postgres` / **Password** : `postgres`

## Commandes utiles au quotidien

```bash
# Démarrer en arrière-plan
docker compose up -d

# Voir les logs d'un service
docker compose logs -f backend
docker compose logs -f frontend

# Exécuter une commande Django (migrations, shell, tests…)
docker compose exec backend python manage.py <commande>

# Lancer les tests backend
docker compose exec backend pytest

# Arrêter les conteneurs
docker compose down

# Arrêter et supprimer aussi les données PostgreSQL (reset complet)
docker compose down -v
```

## Travailler sans Docker (optionnel, backend)

Si tu préfères lancer le backend directement sur ta machine (nécessite
Python 3.12 et un PostgreSQL local ou distant) :

```bash
cd backend
python -m venv venv
source venv/bin/activate        # sous Windows : venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env            # puis adapte POSTGRES_HOST=localhost
python manage.py migrate
python manage.py runserver
```

Et pour le frontend :

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## Structure du dépôt

```
gestion-patients/
├── backend/            # Django + Django REST Framework
│   ├── config/         # Settings, URLs racine
│   ├── accounts/       # Utilisateurs & rôles (Admin, Médecin, Secrétaire)
│   ├── patients/       # Module 2 — Gestion des patients (API complète)
│   ├── appointments/   # Module 3 — Rendez-vous (modèle de base)
│   ├── consultations/  # Module 4 — Consultations (modèle de base)
│   ├── prescriptions/  # Module 5 — Ordonnances (modèle de base)
│   ├── billing/        # Module 7 — Facturation (modèle de base)
│   ├── audit/          # Module 10 — Journal d'audit (traçabilité des accès)
│   ├── Dockerfile      # Image de production (multi-stage, gunicorn)
│   └── Dockerfile.dev  # Image de développement (hot-reload)
├── frontend/           # Next.js + Tailwind + shadcn/ui
│   ├── src/app/         # Pages (App Router)
│   ├── src/components/ui/  # Composants shadcn/ui
│   ├── Dockerfile      # Image de production (multi-stage, standalone)
│   └── Dockerfile.dev  # Image de développement (hot-reload)
├── infra/              # Ansible, Nginx, Prometheus, Grafana, Loki, Alloy, sauvegardes
└── docker-compose.yml  # Orchestration de dev (backend, frontend, db, pgadmin)
```

## Prochaines étapes (voir le cahier des charges)

- Étape 3 : compléter le backend (endpoints rendez-vous, consultations,
  ordonnances, facturation, tests)
- Étape 4 : construire les pages du frontend (patients, rendez-vous,
  consultations…) avec shadcn/ui
- Étape 5 : pipeline CI (GitHub Actions — lint + tests à chaque push)
- Étape 6 : conteneurisation de prod et CD (Docker Hub / GHCR)
- Étape 7 : supervision (Prometheus/Grafana), journaux (Loki), sécurité (Trivy, OWASP ZAP)

## Récupération de mot de passe par Email

Le système intègre la récupération sécurisée de mot de passe par email :
1. Sur la page de connexion, cliquez sur **"Mot de passe oublié ?"**.
2. Renseignez votre adresse email.
3. Un email contenant un code de vérification à 6 chiffres ainsi qu'un lien direct est envoyé.
4. **En développement local**, ouvrez [http://localhost:8025](http://localhost:8025) (Mailpit) pour voir les emails reçus instantanément.
5. Saisissez le code et choisissez votre nouveau mot de passe (min. 8 caractères) pour vous reconnecter immédiatement.


## Journal d'audit (module 10)

Chaque action sensible est tracée dans la table du journal d'audit : **qui** (compte et rôle), **quoi** (action, ressource et identifiant), **quand**, **d'où** (adresse IP et navigateur) et avec **quel résultat** (code HTTP : une tentative refusée est gardée, elle aussi).

| Action | Ce qui est tracé |
|---|---|
| Connexion / Échec de connexion | chaque tentative sur `/api/auth/token/` ; en cas d'échec, le nom saisi est gardé (essais sur des comptes inexistants) |
| Mot de passe oublié | demandes de code et réinitialisations |
| Consultation | lecture d'un dossier patient, d'une consultation, d'une ordonnance ou d'un examen, et des listes filtrées sur un patient |
| Création / Modification / Suppression | toute écriture d'un utilisateur connecté, sur n'importe quelle ressource de l'API |

- **Fonctionnement** : un middleware Django (`backend/audit/middleware.py`) écrit l'entrée une fois la réponse connue. La connexion est tracée par le sérialiseur JWT, le seul à connaître le compte visé. Les mots de passe et le contenu des requêtes ne sont jamais enregistrés. Une panne du journal ne fait jamais échouer la requête.
- **Ce qui n'est pas tracé** : les requêtes anonymes refusées, la supervision (`/api/health/`, `/api/metrics/`), le renouvellement du jeton et les listes générales, qui rempliraient le journal sans rien apprendre.
- **Adresse IP** : derrière Nginx ou Render, elle est lue dans `X-Forwarded-For`, en ne prenant que la valeur ajoutée par le proxy, car les autres peuvent être falsifiées par le client. Réglage `AUDIT_DERRIERE_PROXY`, activé par défaut quand `DJANGO_DEBUG=False`.
- **Consultation** : page **Journal d'audit** du frontend (administrateurs uniquement), avec des filtres par action, période et refus, et une recherche. Côté API, `GET /api/audit/` accepte `?action=`, `?ressource=`, `?utilisateur=`, `?echecs=1`, `?du=`, `?au=` et `?search=`. Le journal est en **lecture seule**, y compris dans l'admin Django.
- **Conservation** : `python manage.py purger_journal_audit` supprime les entrées de plus de 365 jours (`AUDIT_CONSERVATION_JOURS` ou `--jours`). Les sauvegardes nocturnes de la base contiennent aussi le journal.

## Crédits

- Illustration des écrans de connexion : « Patient waiting for visit doctor illustration concept » par Abdur Razzaq sur [Vecteezy.com](https://www.vecteezy.com/vector-art/2805088-patient-waiting-for-visit-doctor-illustration-concept) (licence gratuite Vecteezy, attribution obligatoire).
- Police : [IBM Plex Sans](https://github.com/IBM/plex) (SIL Open Font License).

## Centralisation des journaux (Grafana Loki)

Les journaux de tous les conteneurs du projet (backend Django, frontend, PostgreSQL, Nginx, Grafana…) sont centralisés dans **Grafana Loki** :

```
conteneurs Docker ──stdout/stderr──▶ Grafana Alloy ──push──▶ Loki ◀──requêtes LogQL── Grafana
```

- **Alloy** (`infra/alloy/config.alloy`) découvre les conteneurs via le socket Docker, ne garde que ceux du projet Compose `gestion-patients` (variable `PROJET_COMPOSE` pour un autre nom), ajoute les étiquettes `service`, `container` et `level` (debug, info, warning, error, critical).
- **Loki** (`infra/loki/loki-config.yml`) stocke les journaux 15 jours, comme Prometheus pour les métriques.
- **Django** écrit ses journaux sur la sortie standard au format `date NIVEAU module message` (niveau réglable avec `DJANGO_LOG_LEVEL`).
- **Grafana** : source de données « Loki » et tableau de bord **Journaux applicatifs** (volume par service, erreurs et avertissements, recherche plein texte).

Lancement avec la supervision : `docker compose -f docker-compose.monitoring.yml up -d`, puis Grafana sur http://localhost:3001 → *Supervision › Journaux applicatifs*, ou *Explore* avec par exemple `{service="backend", level="error"}`.

## Tests de l'API (Postman / Newman)

La collection `postman/gestion-patients.postman_collection.json` déroule un **parcours métier complet** sur l'API, en 47 requêtes et 182 assertions :

| Dossier | Ce qui est vérifié |
|---|---|
| 00 · Santé | API en ligne, erreurs 404 en JSON |
| 01 · Authentification | jetons JWT, renouvellement, refus sans jeton ou avec un mauvais mot de passe |
| 02 · Utilisateurs et rôles | création des comptes médecin et secrétaire, mot de passe robuste imposé, accès interdit selon le rôle (comptes, journal d'audit) |
| 03 · Patients | champs obligatoires, création, âge calculé, recherche paginée, mise à jour |
| 04 · Rendez-vous | créneaux libres de 15 min, prise de RDV, double réservation et date passée refusées, transitions de statut |
| 05 · Pharmacie | stock initial, alerte de seuil, réception de livraison, traçabilité des mouvements |
| 06 · Suppressions et nettoyage | suppressions réservées à l'administrateur, médicament avec historique désactivé et non supprimé, comptes de test désactivés |
| 07 · Journal d'audit | l'échec de connexion, la consultation du dossier, la suppression refusée puis la suppression réelle sont tracés, avec date et adresse IP ; le journal ne peut pas être effacé |

Chaque réponse est aussi contrôlée sur son **format JSON** et son **temps de réponse**. Le seuil est de 300 ms, l'exigence de performance du cahier des charges, et passe à 1 s pour les seules opérations qui hachent un mot de passe avec Argon2, un algorithme lent par conception. Les données de test portent un suffixe unique, si bien que la collection peut tourner plusieurs fois sur la même base.

- **En CI** : le job « Tests d'API (Postman / Newman) » démarre une API jetable (PostgreSQL vierge), lance la collection avec l'image Docker Newman épinglée par son empreinte, affiche un résumé dans l'onglet *Summary* et publie le rapport JUnit (artefact `rapport-newman`). La construction des images attend ce job.
- **En local**, contre une API qui tourne sur le port 8000 :

  ```bash
  docker run --rm --network host -v "$PWD/postman:/etc/newman:ro,z" postman/newman:6.1.3-alpine \
    run gestion-patients.postman_collection.json -e ci.postman_environment.json \
    --env-var baseUrl=http://localhost:8000 \
    --env-var adminUsername=<admin> --env-var adminPassword=<mot de passe>
  ```

- **Dans Postman** : *Import* de la collection et de l'environnement `postman/ci.postman_environment.json`, puis renseigner `adminPassword`.

## Sauvegardes de la base (Neon)

La base de production est hébergée chez **Neon**, avec deux niveaux de protection :

| Niveau | Outil | Usage |
|---|---|---|
| Restauration instantanée | historique de Neon (*point-in-time restore*, console Neon › *Branches* › *Restore*) | annuler une erreur récente, dans la fenêtre d'historique de l'offre Neon |
| Sauvegarde indépendante | workflow **« Sauvegarde de la base »** (`.github/workflows/sauvegarde.yml`) | incident grave, suppression du projet Neon, compte compromis, changement d'hébergeur |

Le workflow tourne **chaque nuit à 2 h** (heure d'Antananarivo). Il peut aussi être lancé à la main : *Actions › Sauvegarde de la base › Run workflow*. Le script `infra/sauvegardes/sauvegarder.sh` :

1. détecte la version de PostgreSQL du serveur et utilise `pg_dump` de la même version ;
2. fait une sauvegarde complète et compressée ;
3. **la restaure dans une base jetable** et compare le nombre de lignes de chaque table avec la source. Une sauvegarde dont la restauration échoue fait échouer le workflow, et GitHub envoie alors un e-mail ;
4. la **chiffre en AES-256** (GPG), car ce sont des données médicales. La copie en clair n'est jamais conservée.

La sauvegarde chiffrée et son empreinte SHA-256 sont conservées **30 jours** comme artefacts du workflow.

### Mise en place (une fois)

Dans *Settings › Secrets and variables › Actions*, ajouter deux secrets :

- `NEON_DATABASE_URL` : la chaîne de connexion Neon **directe**, sans `-pooler` dans le nom d'hôte, car `pg_dump` passe mal par le pooler ;
- `SAUVEGARDE_PHRASE_SECRETE` : une phrase secrète longue, par exemple générée avec `openssl rand -base64 32`. **À garder aussi dans un gestionnaire de mots de passe** : sans elle, les sauvegardes sont illisibles.

Le planning nocturne ne s'active qu'une fois le workflow présent sur `main`. GitHub suspend les workflows planifiés après 60 jours sans activité sur le dépôt.

### Restaurer

```bash
# Dernière sauvegarde réussie, téléchargée depuis GitHub (gh authentifié)
CIBLE_DATABASE_URL="postgresql://..." ./infra/sauvegardes/restaurer.sh --derniere

# Ou un fichier précis
CIBLE_DATABASE_URL="postgresql://..." ./infra/sauvegardes/restaurer.sh gestion_patients_AAAA-MM-JJ_HHMM.dump.gpg
```

Le script vérifie l'empreinte, déchiffre (la phrase secrète est demandée), affiche la base cible et **demande de retaper son nom** avant de la remplacer. La restauration se fait en une seule transaction : en cas d'erreur, la base reste dans son état d'avant.

**Bonne pratique avec Neon** : restaurer dans une **nouvelle branche Neon** (console › *Branches* › *Create branch*), vérifier l'application dessus, puis faire pointer `DATABASE_URL` (Render) vers cette branche. La production n'est ainsi jamais écrasée à l'aveugle.

Les deux scripts fonctionnent avec n'importe quel PostgreSQL. Pour changer d'hébergeur de base, il suffit de modifier `NEON_DATABASE_URL`, et une restauration sert aussi à **migrer** les données vers la nouvelle base.

## Infrastructure as Code (Ansible)

Le dossier `infra/ansible/` prépare un serveur **Ubuntu 22.04 ou 24.04 vierge** et y déploie toute la pile de production (`docker-compose.prod.yml` : application, Nginx, Prometheus, Grafana, Loki), sans aucune action manuelle sur le serveur.

| Rôle | Ce qu'il fait |
|---|---|
| `socle` | paquets de base, mises à jour de sécurité automatiques, utilisateur `deploy`, pare-feu UFW (seuls SSH, HTTP et HTTPS sont ouverts) |
| `docker` | Docker Engine et Compose depuis le dépôt officiel de Docker (un Docker déjà présent est conservé) |
| `application` | fichiers de la pile, `.env` généré à partir des secrets (droits `600`, jamais versionné), téléchargement des images GHCR, lancement, vérification de `/api/health/` |

Le playbook n'utilise que les modules intégrés d'Ansible (`ansible.builtin`), donc aucune collection externe n'est téléchargée. Il est **idempotent** : relancé sur un serveur déjà à jour, il ne modifie rien (`changed=0`).

### Déployer sur un serveur

1. Ajouter le serveur dans `infra/ansible/inventaire.yml`, dans le groupe `serveurs` (adresse, utilisateur SSH, `app_domaine`).
2. Fournir les secrets par l'environnement, puis lancer :

```bash
cd infra/ansible
export APP_DJANGO_SECRET_KEY=... APP_POSTGRES_PASSWORD=... APP_GRAFANA_PASSWORD=...
ansible-playbook site.yml --limit serveurs
```

Changer d'hébergeur revient à changer l'adresse dans l'inventaire et à relancer le playbook.

### Test en CI

Le job **« Infrastructure (Ansible) »** applique le playbook à chaque modification sur la machine virtuelle jetable de GitHub Actions, un Ubuntu neuf, comme sur un vrai serveur. Il :

1. vérifie la syntaxe ;
2. fait une **1re passe** : préparation et déploiement complet ;
3. fait une **2e passe** qui doit afficher `changed=0`, sinon le job échoue. C'est la preuve de l'idempotence ;
4. vérifie que l'API, Grafana et Loki répondent.

Les secrets de ce test sont générés à chaque exécution et masqués dans les journaux. La construction des images attend ce job.

## Sécurité de la chaîne CI/CD

Mesures appliquées (suite à l'incident de code malveillant de novembre 2026 et aux analyses SonarCloud et OWASP ZAP) :

- **Actions GitHub épinglées sur un SHA** de commit et **image OWASP ZAP épinglée par son empreinte** (digest).
- **`npm ci --ignore-scripts`** : aucun script d'installation de dépendance n'est exécuté (CI et Dockerfile).
- **`pip install --only-binary :all: --require-hashes`** : uniquement des paquets précompilés (aucun script `setup.py` exécuté), dont **toutes** les versions, dépendances indirectes comprises, sont verrouillées avec leur empreinte SHA-256 dans `backend/requirements.lock` (et `requirements-dev.lock`). Un paquet modifié sur PyPI est refusé à l'installation (CI, Dockerfile, Render).
  Après une modification de `requirements.txt` ou `requirements-dev.txt`, régénérer les fichiers verrouillés :

  ```bash
  docker run --rm -v "$PWD/backend:/w:z" -w /w python:3.12-slim sh -c '
    pip install -q --only-binary :all: pip-tools==7.5.2 &&
    for f in requirements requirements-dev; do
      pip-compile -q --generate-hashes --allow-unsafe --strip-extras --no-header --annotation-style=line -o $f.lock $f.txt
    done'
  ```
- Job « Sécurité » : blocage du code caché (lignes anormalement longues, signatures connues, tâches VS Code automatiques) et des fichiers `.env` versionnés.
- Tests d'API **Postman / Newman** (image épinglée par son empreinte, rapport JSON contenant les secrets jamais publié).
- Scan dynamique **OWASP ZAP** de l'API (règles classées dans `.zap/rules.tsv`), scan **Trivy** des images, analyse **SonarCloud**.

Alertes SonarCloud acceptées, avec justification :

| Alerte | Justification |
|---|---|
| `COPY . .` dans les Dockerfile (copie récursive) | Les fichiers sensibles (`.env`, `.git`, médias, rapports de couverture…) sont exclus par `.dockerignore`. |
| Image exécutée en `root` dans `Dockerfile.dev` | Images de **développement** local uniquement ; les images de production (`Dockerfile`) tournent avec un utilisateur dédié (`django`, `nextjs`). |
| Droits `0644` / `0755` des fichiers de la pile déployés par Ansible (rôle `application`) | Ces fichiers (Compose, Nginx, Prometheus, Grafana, Loki, Alloy) sont lus à l'intérieur des conteneurs par des utilisateurs différents (`nobody` pour Prometheus, uid 472 pour Grafana, uid 10001 pour Loki) : la lecture par « les autres » est nécessaire. Ils ne contiennent aucun secret (ils sont publics dans le dépôt) ; le seul fichier sensible, `.env`, est en `0600`. |
| Droits `0644` de `/etc/apt/apt.conf.d/20auto-upgrades` (rôle `socle`) | Droits standard des fichiers de configuration d'APT sous Debian/Ubuntu : avec moins, les commandes `apt` d'un utilisateur non administrateur échouent (« Permission denied »). Fichier sans secret, propriété de root. |

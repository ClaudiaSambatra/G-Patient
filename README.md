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
│   ├── Dockerfile      # Image de production (multi-stage, gunicorn)
│   └── Dockerfile.dev  # Image de développement (hot-reload)
├── frontend/           # Next.js + Tailwind + shadcn/ui
│   ├── src/app/         # Pages (App Router)
│   ├── src/components/ui/  # Composants shadcn/ui
│   ├── Dockerfile      # Image de production (multi-stage, standalone)
│   └── Dockerfile.dev  # Image de développement (hot-reload)
├── infra/              # (à venir) Ansible, configs Nginx/Traefik, CI/CD
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

La collection `postman/gestion-patients.postman_collection.json` déroule un **parcours métier complet** sur l'API, en 41 requêtes et 155 assertions :

| Dossier | Ce qui est vérifié |
|---|---|
| 00 · Santé | API en ligne, erreurs 404 en JSON |
| 01 · Authentification | jetons JWT, renouvellement, refus sans jeton ou avec un mauvais mot de passe |
| 02 · Utilisateurs et rôles | création des comptes médecin et secrétaire, mot de passe robuste imposé, accès interdit selon le rôle |
| 03 · Patients | champs obligatoires, création, âge calculé, recherche paginée, mise à jour |
| 04 · Rendez-vous | créneaux libres de 15 min, prise de RDV, double réservation et date passée refusées, transitions de statut |
| 05 · Pharmacie | stock initial, alerte de seuil, réception de livraison, traçabilité des mouvements |
| 06 · Suppressions et nettoyage | suppressions réservées à l'administrateur, médicament avec historique désactivé et non supprimé, comptes de test désactivés |

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

## Sécurité de la chaîne CI/CD

Mesures appliquées (suite à l'incident de code malveillant de novembre 2026 et aux analyses SonarCloud et OWASP ZAP) :

- **Actions GitHub épinglées sur un SHA** de commit et **image OWASP ZAP épinglée par son empreinte** (digest).
- **`npm ci --ignore-scripts`** : aucun script d'installation de dépendance n'est exécuté (CI et Dockerfile).
- **`pip install --only-binary :all:`** : uniquement des paquets précompilés, aucun script `setup.py` exécuté ; versions exactes dans `requirements.txt`.
- Job « Sécurité » : blocage du code caché (lignes anormalement longues, signatures connues, tâches VS Code automatiques) et des fichiers `.env` versionnés.
- Tests d'API **Postman / Newman** (image épinglée par son empreinte, rapport JSON contenant les secrets jamais publié).
- Scan dynamique **OWASP ZAP** de l'API (règles classées dans `.zap/rules.tsv`), scan **Trivy** des images, analyse **SonarCloud**.

Alertes SonarCloud acceptées, avec justification :

| Alerte | Justification |
|---|---|
| `COPY . .` dans les Dockerfile (copie récursive) | Les fichiers sensibles (`.env`, `.git`, médias, rapports de couverture…) sont exclus par `.dockerignore`. |
| Image exécutée en `root` dans `Dockerfile.dev` | Images de **développement** local uniquement ; les images de production (`Dockerfile`) tournent avec un utilisateur dédié (`django`, `nextjs`). |

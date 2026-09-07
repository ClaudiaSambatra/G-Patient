# Gestion de Patients — Environnement de développement

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

   Cela démarre 4 conteneurs :
   | Service    | URL / Port                          |
   |------------|--------------------------------------|
   | frontend   | http://localhost:3000                |
   | backend    | http://localhost:8000/api/           |
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
- Étape 7 : supervision (Prometheus/Grafana), sécurité (Trivy, OWASP ZAP)

# Guide de Déploiement sur Render (render.com)

Ce guide détaille la mise en production complète et automatique de **Gestion de Patients** sur [Render](https://render.com) en utilisant le fichier d'infrastructure déclarative [`render.yaml`](file:///home/tambatra/Tambatraa/Projet/gestion-patients/render.yaml).

---

## 🏗️ Architecture déployée sur Render

Render déploie automatiquement l'ensemble de l'écosystème :
1. **Base de données PostgreSQL managée** (`gestion-patients-db`) :
   - Version PostgreSQL 16 (Plan gratuit).
   - Variables de connexion injectées automatiquement dans le backend.
2. **Backend Web Service (Django REST Framework)** (`gestion-patients-backend`) :
   - Exécution Python 3.12 avec Gunicorn.
   - Migrations et création de l'administrateur exécutées automatiquement au démarrage.
   - Fichiers statiques servis via WhiteNoise.
   - Hôtes autorisés et CORS automatiques pour Render (`.onrender.com`).
3. **Frontend Web Service (Next.js)** (`gestion-patients-frontend`) :
   - Exécution Node.js 20 avec Next.js en production.

---

## 🚀 Étape 1 : Déploiement en 1 clic avec Render Blueprint

1. Créez un compte ou connectez-vous sur [dashboard.render.com](https://dashboard.render.com).
2. Cliquez sur le bouton **New +** en haut à droite, puis sélectionnez **Blueprint**.
3. Associez votre compte GitHub et sélectionnez le dépôt **`ClaudiaSambatra/G-Patient`**.
4. Render détecte immédiatement le fichier [`render.yaml`](file:///home/tambatra/Tambatraa/Projet/gestion-patients/render.yaml) et prépare les 3 ressources :
   - `gestion-patients-db` (PostgreSQL)
   - `gestion-patients-backend` (Web Service)
   - `gestion-patients-frontend` (Web Service)
5. Renseignez la variable demandée :
   - **`ADMIN_PASSWORD`** : Choisissez un mot de passe sécurisé pour le compte administrateur initial (`admin`).
6. Cliquez sur **Apply**.
   Render va provisionner la base de données, compiler et déployer le backend et le frontend.

---

## 🔗 Étape 2 : Lier l'URL du Backend au Frontend

1. Une fois le backend déployé, Render vous donne son URL publique (ex: `https://gestion-patients-backend.onrender.com`).
2. Rendez-vous dans le service **`gestion-patients-frontend`** sur votre Dashboard Render.
3. Allez dans l'onglet **Environment**.
4. Définissez les deux variables suivantes :
   - **`NEXT_PUBLIC_API_URL`** : `https://gestion-patients-backend.onrender.com/api` *(remplacez par votre URL backend)*
   - **`BACKEND_URL`** : `https://gestion-patients-backend.onrender.com`
5. Cliquez sur **Save Changes**. Le frontend se relance automatiquement avec l'URL de votre API !

---

## 🔑 Étape 3 : Connexion et Accès

- **Application Web (Frontend)** : `https://gestion-patients-frontend.onrender.com`
- **Administration Django** : `https://gestion-patients-backend.onrender.com/admin/`
  - Identifiant : `admin`
  - Mot de passe : la valeur que vous avez indiquée dans `ADMIN_PASSWORD`
- **Vérification de santé (Healthcheck)** : `https://gestion-patients-backend.onrender.com/api/health/`

---

## 🔄 Étape 4 : Déploiement continu automatique (Optionnel)

Render déploie automatiquement chaque nouveau push sur la branche `main` dès que GitHub est connecté.

Si vous souhaitez que GitHub Actions déclenche explicitement le déploiement après la validation des tests :
1. Dans Render, allez dans les paramètres de votre service backend et frontend, section **Deploy Hook**.
2. Copiez l'URL du webhook.
3. Dans votre dépôt GitHub, allez dans **Settings > Secrets and variables > Actions**.
4. Ajoutez le secret :
   - Nom : `RENDER_DEPLOY_HOOK`
   - Valeur : l'URL du webhook Render.
Le pipeline CI/CD GitHub Actions notifiera automatiquement Render dès que les 149 tests et les linters seront validés !

#!/bin/sh
set -e

echo "==> Verification et application des migrations..."
python manage.py migrate --noinput

# Sans manifeste des fichiers statiques, WhiteNoise fait échouer les pages qui en utilisent (DEBUG=False).
echo "==> Collecte des fichiers statiques..."
python manage.py collectstatic --noinput

echo "==> Initialisation de l'administrateur..."
python manage.py setup_admin || true

exec "$@"

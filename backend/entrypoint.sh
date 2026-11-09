#!/bin/sh
set -e

echo "==> Verification et application des migrations..."
python manage.py migrate --noinput

echo "==> Initialisation de l'administrateur..."
python manage.py setup_admin || true

exec "$@"

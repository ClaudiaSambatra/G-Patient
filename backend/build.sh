#!/usr/bin/env bash
# Script de build Render pour le backend Django
set -o errexit

pip install --only-binary :all: --require-hashes -r requirements.lock
python manage.py collectstatic --noinput
python manage.py migrate
python manage.py setup_admin

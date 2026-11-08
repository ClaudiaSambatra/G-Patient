#!/usr/bin/env bash
# Script de build Render pour le backend Django
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --noinput

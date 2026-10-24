# --- Étape 1 : builder (installation des dépendances) ----------------------
FROM python:3.12-slim AS builder

WORKDIR /app

# psycopg2-binary embarque déjà libpq (précompilé) : pas besoin de
# build-essential / libpq-dev, ce qui évite une dépendance à apt-get.
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# --- Étape 2 : image finale (légère) ----------------------------------------
FROM python:3.12-slim

WORKDIR /app

RUN addgroup --system django && adduser --system --ingroup django django

COPY --from=builder /install /usr/local
COPY . .

ENV PATH=/home/django/.local/bin:$PATH \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN mkdir -p /app/staticfiles /app/media && chown -R django:django /app
USER django

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]

from django.apps import AppConfig


class PharmacieConfig(AppConfig):
    name = 'pharmacie'
    verbose_name = "Pharmacie et stocks"

    def ready(self):
        # Indicateur Prometheus « médicaments sous le seuil » (module 11 + supervision)
        from . import metrics
        metrics.enregistrer_collecteur()

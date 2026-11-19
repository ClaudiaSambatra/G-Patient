from prometheus_client.core import GaugeMetricFamily, REGISTRY

_enregistre = False


class CollecteurStock:
    """Expose dans /api/metrics/ le nombre de médicaments actifs à ou sous leur seuil d'alerte."""

    def describe(self):
        # Évite que prometheus_client appelle collect() (donc la base) dès l'enregistrement, au démarrage.
        yield GaugeMetricFamily('pharmacie_medicaments_sous_seuil', '')
        yield GaugeMetricFamily('pharmacie_medicaments_en_rupture', '')

    def collect(self):
        from django.db.models import F
        from .models import StockMedicament

        try:
            sous_seuil = StockMedicament.objects.filter(actif=True, quantite__lte=F('seuil_alerte')).count()
            ruptures = StockMedicament.objects.filter(actif=True, quantite=0).count()
        except Exception:
            # Base indisponible (démarrage, migrations, tests sans accès DB) : on n'expose rien.
            return
        g = GaugeMetricFamily(
            'pharmacie_medicaments_sous_seuil',
            "Médicaments actifs dont la quantité est inférieure ou égale au seuil d'alerte",
        )
        g.add_metric([], sous_seuil)
        yield g
        r = GaugeMetricFamily('pharmacie_medicaments_en_rupture', "Médicaments actifs en rupture de stock")
        r.add_metric([], ruptures)
        yield r


def enregistrer_collecteur():
    global _enregistre
    if not _enregistre:
        REGISTRY.register(CollecteurStock())
        _enregistre = True

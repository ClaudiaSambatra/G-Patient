from django.db import transaction

from .models import MouvementStock, StockMedicament


class StockInsuffisant(Exception):
    """Levée quand une sortie demanderait plus que la quantité disponible."""


def enregistrer_mouvement(medicament, type_mouvement, variation, auteur, motif='', facture=None):
    """
    Applique une variation de stock et la trace dans MouvementStock.
    À appeler dans une transaction : le médicament est verrouillé (select_for_update)
    pour éviter deux sorties simultanées sur le même stock.
    """
    with transaction.atomic():
        med = StockMedicament.objects.select_for_update().get(pk=medicament.pk)
        nouvelle_quantite = med.quantite + variation
        if nouvelle_quantite < 0:
            raise StockInsuffisant(
                f"Stock insuffisant pour {med} : {med.quantite} {med.unite}(s) disponible(s), {-variation} demandé(s)."
            )
        ancienne_quantite = med.quantite
        med.quantite = nouvelle_quantite
        med.save(update_fields=['quantite', 'date_modification'])

        # Franchissement du seuil (et seulement à ce moment-là) : e-mail aux gestionnaires du stock,
        # envoyé après validation de la transaction pour ne rien envoyer si l'opération est annulée.
        if med.actif and ancienne_quantite > med.seuil_alerte >= nouvelle_quantite:
            from .notifications import notifier_seuil_atteint
            transaction.on_commit(lambda: notifier_seuil_atteint(med.pk))

        return MouvementStock.objects.create(
            medicament=med,
            type=type_mouvement,
            quantite=variation,
            quantite_apres=nouvelle_quantite,
            motif=motif,
            facture=facture,
            auteur=auteur,
        )


def sortir_medicaments_facture(facture, auteur):
    """
    Sortie de stock des médicaments d'une facture MEDICAMENTS lors de son encaissement.
    Seules les lignes d'ordonnance liées au catalogue sont concernées
    (les médicaments en texte libre sont achetés en pharmacie extérieure).
    """
    if not facture.ordonnance_id:
        return []
    mouvements = []
    lignes = facture.ordonnance.lignes.filter(medicament_stock__isnull=False).select_related('medicament_stock')
    for ligne in lignes:
        mouvements.append(enregistrer_mouvement(
            ligne.medicament_stock,
            MouvementStock.Type.SORTIE,
            -ligne.quantite,
            auteur,
            motif=f"Délivrance — facture n°{facture.pk}",
            facture=facture,
        ))
    return mouvements


def montant_pharmacie(ordonnance):
    """Montant des médicaments du catalogue d'une ordonnance (quantité × prix unitaire)."""
    total = 0
    for ligne in ordonnance.lignes.all():
        if ligne.medicament_stock_id:
            total += ligne.quantite * ligne.medicament_stock.prix_unitaire
    return total

from decimal import Decimal
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from appointments.models import RendezVous
from .models import Facture

@receiver(post_save, sender=RendezVous)
def on_rendezvous_saved(sender, instance, created, **kwargs):
    if created and instance.type == RendezVous.Type.CONSULTATION:
        if not hasattr(instance, 'facture'):
            tarif = getattr(settings, 'TARIF_CONSULTATION', 20000)
            Facture.objects.create(
                patient=instance.patient,
                rendez_vous=instance,
                type=Facture.Type.CONSULTATION,
                montant=Decimal(str(tarif)),
                designation="Frais de consultation",
                actes="Frais de consultation",
                statut=Facture.StatutPaiement.IMPAYEE
            )
    elif not created and instance.statut == RendezVous.Statut.ANNULE:
        if hasattr(instance, 'facture') and instance.facture:
            if instance.facture.statut == Facture.StatutPaiement.IMPAYEE:
                instance.facture.statut = Facture.StatutPaiement.ANNULEE
                instance.facture.save(update_fields=['statut'])

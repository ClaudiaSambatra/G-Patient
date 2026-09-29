from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Utilisateur, Medecin

@receiver(post_save, sender=Utilisateur)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if instance.role == Utilisateur.Role.MEDECIN:
        Medecin.objects.get_or_create(utilisateur=instance)
    else:
        # Si le rôle a changé de MEDECIN à autre chose, on pourrait supprimer le profil
        # mais on peut aussi le laisser ou vérifier s'il existe pour le supprimer
        Medecin.objects.filter(utilisateur=instance).delete()

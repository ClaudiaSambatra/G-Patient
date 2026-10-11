import random
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings

Utilisateur = get_user_model()

class RequestOTPView(APIView):
    permission_classes = []

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Adresse email requise.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = Utilisateur.objects.get(email=email)
        except Utilisateur.DoesNotExist:
            return Response({'error': 'Aucun utilisateur trouvé avec cet email.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Générer OTP à 6 chiffres
        otp = str(random.randint(100000, 999999))
        
        # Stocker en cache pour 10 minutes (600s), en utilisant l'email comme clé
        cache_key = f"otp_reset_{email}"
        cache.set(cache_key, otp, 600)
        
        try:
            send_mail(
                subject='Réinitialisation de votre mot de passe',
                message=f'Bonjour {user.get_full_name() or user.username},\n\nVotre code de réinitialisation est : {otp}\n\nCe code expirera dans 10 minutes.',
                from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@gestionpatients.com',
                recipient_list=[email],
                fail_silently=False,
            )
            print(f"OTP envoyé par email à {email}: {otp}")
            return Response({'message': 'Un code OTP a été envoyé par email.'}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Erreur d'envoi d'email: {e}")
            # Fallback en console si l'email échoue (ex: SMTP mal configuré)
            print(f"========== EMAIL SIMULATION ==========")
            print(f"À : {email}")
            print(f"Message : Votre code de réinitialisation est {otp}. Il expire dans 10 minutes.")
            print(f"======================================")
            return Response({'message': 'Un code OTP a été généré (vérifiez la console backend). Configurez les variables SMTP pour envoyer le vrai email.'}, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    permission_classes = []

    def post(self, request):
        email = request.data.get('email')
        otp = request.data.get('otp')
        new_password = request.data.get('new_password')
        
        if not all([email, otp, new_password]):
            return Response({'error': 'Tous les champs sont requis.'}, status=status.HTTP_400_BAD_REQUEST)
            
        cache_key = f"otp_reset_{email}"
        cached_otp = cache.get(cache_key)
        
        if not cached_otp or str(cached_otp) != str(otp):
            return Response({'error': 'Code OTP invalide ou expiré.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = Utilisateur.objects.get(email=email)
            user.set_password(new_password)
            user.save()
            
            # Supprimer l'OTP du cache
            cache.delete(cache_key)
            
            return Response({'message': 'Mot de passe mis à jour avec succès.'}, status=status.HTTP_200_OK)
        except Utilisateur.DoesNotExist:
            return Response({'error': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)

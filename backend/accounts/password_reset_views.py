import sys
import secrets
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.core.cache import cache
from django.core.mail import EmailMultiAlternatives
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import PasswordResetToken

Utilisateur = get_user_model()


class RequestOTPView(APIView):
    """
    Endpoint pour demander un code de réinitialisation de mot de passe par email.
    Génère un code OTP à 6 chiffres et un jeton unique, enregistrés en base de données.
    Envoie un email HTML + texte avec le code et un lien direct.
    """
    permission_classes = []

    def post(self, request):
        email = request.data.get('email', '').strip()
        if not email:
            return Response(
                {'error': 'Veuillez saisir votre adresse email.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = Utilisateur.objects.filter(email__iexact=email).first()
        if not user:
            return Response(
                {'error': 'Aucun compte trouvé avec cette adresse email.'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Invalider les anciens jetons non utilisés de cet utilisateur
        PasswordResetToken.objects.filter(utilisateur=user, is_used=False).update(is_used=True)

        # Générer un code OTP à 6 chiffres et un token unique
        otp_code = f"{secrets.randbelow(900000) + 100000}"
        unique_token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(minutes=15)

        # Enregistrer en base de données
        PasswordResetToken.objects.create(
            utilisateur=user,
            code=otp_code,
            token=unique_token,
            expires_at=expires_at,
        )

        # Stocker également en cache (redondance rapide)
        cache_key = f"otp_reset_{user.email.lower()}"
        cache.set(cache_key, otp_code, 900)

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')
        reset_link = f"{frontend_url}/reset-password?email={user.email}&code={otp_code}"

        user_display = user.get_full_name() or user.username
        subject = "[Gestion Patients] Réinitialisation de votre mot de passe"
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@gestion-patients.local')
        recipient_list = [user.email]

        # Corps en texte brut
        text_content = (
            f"Bonjour {user_display},\n\n"
            f"Vous avez demandé la réinitialisation de votre mot de passe pour votre espace Gestion de Patients.\n\n"
            f"Votre code de vérification est : {otp_code}\n\n"
            f"Ou cliquez directement sur ce lien pour choisir un nouveau mot de passe :\n"
            f"{reset_link}\n\n"
            f"Ce code expirera dans 15 minutes.\n"
            f"Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.\n\n"
            f"L'équipe Médicale"
        )

        # Corps au format HTML
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background-color: #f8fafc;
              color: #1e293b;
              margin: 0;
              padding: 24px;
            }}
            .card {{
              max-width: 520px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 16px;
              padding: 32px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
              border: 1px solid #e2e8f0;
            }}
            .header {{
              text-align: center;
              margin-bottom: 24px;
            }}
            .header h1 {{
              color: #1A5FFF;
              font-size: 22px;
              margin: 0 0 6px 0;
            }}
            .header p {{
              color: #64748b;
              font-size: 13px;
              margin: 0;
            }}
            .code-box {{
              background: #EFF6FF;
              border: 2px dashed #1A5FFF;
              border-radius: 12px;
              padding: 16px;
              text-align: center;
              margin: 24px 0;
            }}
            .otp-code {{
              font-size: 32px;
              font-weight: 700;
              letter-spacing: 6px;
              color: #1A5FFF;
              font-family: monospace;
            }}
            .btn {{
              display: inline-block;
              background-color: #1A5FFF;
              color: #ffffff !important;
              text-decoration: none;
              padding: 12px 28px;
              border-radius: 10px;
              font-weight: 600;
              font-size: 14px;
              margin-top: 12px;
            }}
            .footer {{
              margin-top: 32px;
              padding-top: 16px;
              border-top: 1px solid #e2e8f0;
              font-size: 12px;
              color: #94a3b8;
              text-align: center;
            }}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>Gestion de Patients</h1>
              <p>Réinitialisation de mot de passe</p>
            </div>
            <p>Bonjour <strong>{user_display}</strong>,</p>
            <p>Vous avez demandé la réinitialisation de votre mot de passe. Voici votre code de vérification :</p>
            <div class="code-box">
              <div class="otp-code">{otp_code}</div>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #1A5FFF; font-weight: 500;">Valable 15 minutes</p>
            </div>
            <div style="text-align: center; margin-bottom: 20px;">
              <a href="{reset_link}" class="btn">Réinitialiser directement</a>
            </div>
            <p style="font-size: 13px; color: #64748b;">
              Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
              <a href="{reset_link}" style="color: #1A5FFF; word-break: break-all;">{reset_link}</a>
            </p>
            <div class="footer">
              Si vous n'avez pas demandé cette réinitialisation, ignorez cet email en toute sécurité.<br>
              Centre Médical — Espace Gestion de Patients
            </div>
          </div>
        </body>
        </html>
        """

        try:
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=from_email,
                to=recipient_list,
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=False)
            
            print(f"OTP envoyé par email à {user.email}: {otp_code}", flush=True)
            return Response(
                {
                    'message': f'Un code de vérification a été envoyé à {user.email}.',
                    'email': user.email
                }, 
                status=status.HTTP_200_OK
            )
        except Exception as e:
            print(f"Erreur d'envoi d'email SMTP: {e}", file=sys.stderr, flush=True)
            # Log de simulation en console
            print("========== EMAIL SIMULATION ==========", flush=True)
            print(f"Destinataire : {user.email}", flush=True)
            print(f"Code OTP : {otp_code}", flush=True)
            print(f"Lien direct : {reset_link}", flush=True)
            print("======================================", flush=True)
            return Response(
                {
                    'message': f'Un code de réinitialisation a été généré pour {user.email}.',
                    'email': user.email,
                    'simulation': True
                }, 
                status=status.HTTP_200_OK
            )


class ResetPasswordView(APIView):
    """
    Endpoint pour appliquer le nouveau mot de passe après vérification du code OTP ou du token.
    """
    permission_classes = []

    def post(self, request):
        email = request.data.get('email', '').strip()
        otp = str(request.data.get('otp', '')).strip()
        new_password = request.data.get('new_password', '')
        
        if not all([email, otp, new_password]):
            return Response(
                {'error': 'Tous les champs sont requis (email, code, nouveau mot de passe).'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        user = Utilisateur.objects.filter(email__iexact=email).first()
        if not user:
            return Response(
                {'error': 'Aucun utilisateur trouvé avec cette adresse email.'}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Recherche du jeton en base de données (par code OTP ou token URL)
        existing_tokens = PasswordResetToken.objects.filter(
            utilisateur=user
        ).filter(Q(code=otp) | Q(token=otp))

        valid_token = existing_tokens.filter(
            is_used=False,
            expires_at__gte=timezone.now()
        ).first()

        if not valid_token:
            # S'il existe un enregistrement pour ce code mais non valide (expiré ou déjà utilisé)
            if existing_tokens.exists():
                return Response(
                    {'error': 'Le code de vérification a expiré ou a déjà été utilisé.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Fallback cache uniquement si aucun enregistrement DB n'existe
            cached_otp = cache.get(f"otp_reset_{user.email.lower()}")
            if not (cached_otp and str(cached_otp) == str(otp)):
                return Response(
                    {'error': 'Le code de vérification est invalide ou a expiré.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Validation de sécurité du mot de passe
        try:
            validate_password(new_password, user=user)
        except ValidationError as e:
            return Response(
                {'error': ' '.join(e.messages)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mise à jour du mot de passe
        user.set_password(new_password)
        user.save()

        # Invalider le token utilisé
        if valid_token:
            valid_token.is_used = True
            valid_token.save(update_fields=['is_used'])
            
        cache.delete(f"otp_reset_{user.email.lower()}")

        return Response(
            {'message': 'Votre mot de passe a été réinitialisé avec succès ! Vous pouvez maintenant vous connecter.'}, 
            status=status.HTTP_200_OK
        )

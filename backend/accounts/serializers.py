from rest_framework import serializers
<<<<<<< HEAD
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Utilisateur, Medecin


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Ajouter des informations utiles (rôle, etc.) dans le payload du token
        token['username'] = user.username
        token['role'] = user.role
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name

        return token


class UtilisateurSerializer(serializers.ModelSerializer):
    """
    Sérialiseur complet pour l'affichage et la gestion des utilisateurs.
    """
    class Meta:
        model = Utilisateur
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
            'telephone',
            'is_active',
            'is_staff',
            'is_superuser',
            'date_joined',
            'last_login',
        ]
        read_only_fields = ['id', 'is_staff', 'is_superuser', 'date_joined', 'last_login']


class UtilisateurCreateSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour la création d'un utilisateur par un administrateur.
    Hache le mot de passe de manière sécurisée via create_user.
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        min_length=6,
        help_text="Mot de passe d'au moins 6 caractères"
    )

    class Meta:
        model = Utilisateur
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
            'telephone',
            'password',
            'is_active',
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = Utilisateur.objects.create_user(password=password, **validated_data)
        return user


class UtilisateurUpdateSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour la mise à jour des informations d'un utilisateur existant.
    """
    class Meta:
        model = Utilisateur
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
            'telephone',
            'is_active',
        ]
        read_only_fields = ['id']


class ResetPasswordSerializer(serializers.Serializer):
    """
    Sérialiseur pour la réinitialisation du mot de passe d'un utilisateur par l'administrateur.
    """
    new_password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=6,
        style={'input_type': 'password'}
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=6,
        style={'input_type': 'password'}
    )

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Les mots de passe ne correspondent pas."})
        return attrs


class MedecinSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour la lecture des informations médecins.
    Idéal pour peupler les listes déroulantes de rendez-vous.
    """
    nom = serializers.CharField(source='utilisateur.last_name', read_only=True)
    prenom = serializers.CharField(source='utilisateur.first_name', read_only=True)
    email = serializers.CharField(source='utilisateur.email', read_only=True)

    class Meta:
        model = Medecin
        fields = ['id', 'nom', 'prenom', 'email', 'specialite', 'numero_ordre']

=======
from .models import Utilisateur


class UtilisateurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilisateur
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'telephone']
        read_only_fields = ['id', 'role']
>>>>>>> 86992173ce1b8931dd2418e19997e70d831a2897

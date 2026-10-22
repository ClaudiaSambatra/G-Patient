from django.db import transaction
from rest_framework import viewsets, filters, permissions
from rest_framework.pagination import PageNumberPagination
from .models import Consultation
from .serializers import ConsultationSerializer
from accounts.permissions import IsSecretaireOuMedecinOuAdmin, IsMedecin

class ConsultationPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class IsAuteurMedecin(permissions.BasePermission):
    """
    Permission accordée :
    - En lecture (GET/HEAD/OPTIONS) : aux utilisateurs autorisés (Secrétaire, Médecin, Admin).
      Cependant, un médecin ne peut consulter les détails que de ses propres consultations.
    - En écriture (PUT/PATCH/DELETE) : au médecin auteur de la consultation, ou à l'administrateur.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            request.user and request.user.is_authenticated
            and (request.user.role in ['MEDECIN', 'ADMIN'] or request.user.is_superuser)
        )

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ADMIN' or request.user.is_superuser:
            return True
        if request.method in permissions.SAFE_METHODS:
            if request.user.role == 'MEDECIN':
                if obj.medecin == request.user:
                    return True
                from appointments.models import RendezVous
                return RendezVous.objects.filter(
                    medecin__utilisateur=request.user,
                    type=RendezVous.Type.CONTROLE,
                    consultation_origine=obj
                ).exists()
            return True
        return request.user.role == 'MEDECIN' and obj.medecin == request.user

class ConsultationViewSet(viewsets.ModelViewSet):
    """
    CRUD pour les consultations.
    - Création : Réservée aux médecins (pour un de leurs RDV au statut CONFIRME).
    - Modification : Réservée exclusivement au médecin auteur.
    - Lecture : Secrétaires et Admins ont accès en lecture seule globale ;
      Le médecin ne voit que ses propres consultations.
    - Passage automatique et transactionnel du RDV à TERMINE lors de la création.
    """
    serializer_class = ConsultationSerializer
    pagination_class = ConsultationPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['motif', 'patient__nom', 'patient__prenom', 'diagnostic']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsMedecin(), IsAuteurMedecin()]
        return [permissions.IsAuthenticated(), IsSecretaireOuMedecinOuAdmin(), IsAuteurMedecin()]

    def get_queryset(self):
        user = self.request.user
        queryset = Consultation.objects.all().select_related('patient', 'medecin', 'rendez_vous')

        if user.role == 'MEDECIN' and self.action == 'list':
            from appointments.models import RendezVous
            from django.db.models import Q
            consult_origine_ids = RendezVous.objects.filter(
                medecin__utilisateur=user,
                type=RendezVous.Type.CONTROLE,
                consultation_origine__isnull=False
            ).values_list('consultation_origine_id', flat=True)
            queryset = queryset.filter(Q(medecin=user) | Q(id__in=consult_origine_ids)).distinct()

        # Filtres via URL params
        rdv_id = self.request.query_params.get('rendez_vous')
        patient_id = self.request.query_params.get('patient')
        date_debut = self.request.query_params.get('date_debut')
        date_fin = self.request.query_params.get('date_fin')

        if rdv_id:
            queryset = queryset.filter(rendez_vous_id=rdv_id)
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        if date_debut:
            queryset = queryset.filter(date_consultation__date__gte=date_debut)
        if date_fin:
            queryset = queryset.filter(date_consultation__date__lte=date_fin)

        return queryset

    def perform_create(self, serializer):
        with transaction.atomic():
            # Assigner le médecin : si admin, utiliser le médecin du rendez-vous
            rendez_vous = serializer.validated_data.get('rendez_vous')
            if (self.request.user.role == 'ADMIN' or self.request.user.is_superuser) and rendez_vous and rendez_vous.medecin:
                medecin_user = rendez_vous.medecin.utilisateur
            else:
                medecin_user = self.request.user

            consultation = serializer.save(medecin=medecin_user)
            
            # Mettre à jour le statut du rendez-vous lié si existant
            if consultation.rendez_vous:
                rdv = consultation.rendez_vous
                rdv.statut = 'TERMINE'
                rdv.save(update_fields=['statut', 'date_modification'])


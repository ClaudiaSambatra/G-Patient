from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsAdmin
from config.parametres import param_date, param_identifiant
from .models import EntreeJournal
from .serializers import EntreeJournalSerializer


class EntreeJournalViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Consultation du journal d'audit, réservée aux administrateurs (lecture seule).
    Filtres : ?action=, ?ressource= (préfixe), ?utilisateur=<id>, ?echecs=1, ?du= et ?au= (AAAA-MM-JJ),
    ?search= (nom d'utilisateur, adresse, IP).
    """
    serializer_class = EntreeJournalSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nom_utilisateur', 'chemin', 'adresse_ip']

    def get_queryset(self):
        queryset = EntreeJournal.objects.all()
        params = self.request.query_params
        if params.get('action'):
            queryset = queryset.filter(action=params['action'])
        if params.get('ressource'):
            queryset = queryset.filter(ressource__startswith=params['ressource'])
        utilisateur = param_identifiant(self.request, 'utilisateur')
        if utilisateur:
            queryset = queryset.filter(utilisateur_id=utilisateur)
        if params.get('echecs') == '1':
            queryset = queryset.filter(statut__gte=400)
        du, au = param_date(self.request, 'du'), param_date(self.request, 'au')
        if du:
            queryset = queryset.filter(date__date__gte=du)
        if au:
            queryset = queryset.filter(date__date__lte=au)
        return queryset

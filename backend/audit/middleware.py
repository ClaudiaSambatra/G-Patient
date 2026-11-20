from .journal import action_requete, enregistrer


class JournalAuditMiddleware:
    """
    Trace les requêtes sensibles de l'API une fois la réponse connue.
    L'authentification JWT est faite par DRF dans la vue : à ce stade, request.user
    est donc bien l'utilisateur du jeton.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        action = action_requete(request)
        if action:
            enregistrer(request, action, response.status_code)
        return response

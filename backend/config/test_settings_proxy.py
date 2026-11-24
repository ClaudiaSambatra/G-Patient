import importlib

import config.settings as module_settings


def _settings_avec(monkeypatch, valeur):
    """Recharge le module de réglages avec DJANGO_DERRIERE_PROXY_HTTPS défini (ou non)."""
    # reload() garde les attributs du chargement précédent : on retire ceux que le bloc peut créer
    for nom in ('SECURE_PROXY_SSL_HEADER', 'SESSION_COOKIE_SECURE', 'CSRF_COOKIE_SECURE'):
        vars(module_settings).pop(nom, None)
    if valeur is None:
        monkeypatch.delenv('DJANGO_DERRIERE_PROXY_HTTPS', raising=False)
    else:
        monkeypatch.setenv('DJANGO_DERRIERE_PROXY_HTTPS', valeur)
    return importlib.reload(module_settings)


def test_derriere_un_proxy_https_django_fait_confiance_a_x_forwarded_proto(monkeypatch):
    try:
        reglages = _settings_avec(monkeypatch, 'True')
        assert reglages.SECURE_PROXY_SSL_HEADER == ('HTTP_X_FORWARDED_PROTO', 'https')
        assert reglages.SESSION_COOKIE_SECURE is True
        assert reglages.CSRF_COOKIE_SECURE is True
    finally:
        _settings_avec(monkeypatch, None)


def test_sans_proxy_https_aucun_reglage_de_proxy(monkeypatch):
    reglages = _settings_avec(monkeypatch, None)
    assert not hasattr(reglages, 'SECURE_PROXY_SSL_HEADER')

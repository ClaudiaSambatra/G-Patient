"""
Reçu de paiement au format ticket (rouleau thermique de 80 mm) : la hauteur de la page
suit la longueur du contenu, comme un ticket de caisse.
"""
import io

from django.conf import settings
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from config.documents_pdf import e, nom_medecin

LARGEUR_TICKET = 80 * mm
MARGE = 4 * mm
# Le cadre de page de ReportLab ajoute 6 pt de marge intérieure de chaque côté
LARGEUR_UTILE = LARGEUR_TICKET - 2 * MARGE - 12

NOIR = colors.black
GRIS = colors.HexColor('#444444')

STYLES = {
    'cabinet': ParagraphStyle('t_cabinet', fontName='Helvetica-Bold', fontSize=10, leading=12,
                              alignment=TA_CENTER, textColor=NOIR),
    'centre': ParagraphStyle('t_centre', fontName='Helvetica', fontSize=7.5, leading=9.5,
                             alignment=TA_CENTER, textColor=GRIS),
    'titre': ParagraphStyle('t_titre', fontName='Helvetica-Bold', fontSize=9, leading=11,
                            alignment=TA_CENTER, textColor=NOIR),
    'texte': ParagraphStyle('t_texte', fontName='Helvetica', fontSize=8, leading=10, textColor=NOIR),
    'detail': ParagraphStyle('t_detail', fontName='Helvetica', fontSize=7, leading=9, textColor=GRIS),
    'droite': ParagraphStyle('t_droite', fontName='Helvetica', fontSize=8, leading=10,
                             alignment=TA_RIGHT, textColor=NOIR),
    'total': ParagraphStyle('t_total', fontName='Helvetica-Bold', fontSize=11, leading=14, textColor=NOIR),
    'total_montant': ParagraphStyle('t_total_montant', fontName='Helvetica-Bold', fontSize=11, leading=14,
                                    alignment=TA_RIGHT, textColor=NOIR),
}


def ar(montant):
    """20000 → « 20 000 Ar »."""
    return f"{montant:,.0f}".replace(',', ' ') + ' Ar'


def pointilles():
    return HRFlowable(width='100%', thickness=0.6, color=NOIR, dash=(2, 2), spaceBefore=4, spaceAfter=4)


def ligne_deux_colonnes(gauche, droite, style_gauche='texte', style_droite='droite', part_droite=0.38):
    tableau = Table([[Paragraph(gauche, STYLES[style_gauche]), Paragraph(droite, STYLES[style_droite])]],
                    colWidths=[LARGEUR_UTILE * (1 - part_droite), LARGEUR_UTILE * part_droite])
    tableau.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
    ]))
    return tableau


def lignes_consultation(facture):
    lignes = [ligne_deux_colonnes(e(facture.designation or 'Frais de consultation'), ar(facture.montant))]
    rdv = facture.rendez_vous
    if rdv:
        quand = timezone.localtime(rdv.date_heure).strftime('%d/%m/%Y %H:%M')
        lignes.append(Paragraph(f"{e(nom_medecin(rdv.medecin.utilisateur))} — RDV du {quand}", STYLES['detail']))
    return lignes


def lignes_medicaments(facture):
    """Une ligne par médicament délivré par le cabinet : nom, puis « quantité × prix » et le total."""
    ordonnance = facture.ordonnance
    if not ordonnance:
        return [ligne_deux_colonnes(e(facture.designation or 'Médicaments'), ar(facture.montant))]

    lignes, exterieurs = [], []
    for ligne in ordonnance.lignes.select_related('medicament_stock'):
        med = ligne.medicament_stock
        if not med:
            exterieurs.append(' '.join(m for m in (ligne.medicament, ligne.dosage) if m))
            continue
        lignes.append(Paragraph(f"<b>{e(med)}</b>", STYLES['texte']))
        lignes.append(ligne_deux_colonnes(
            f"{ligne.quantite} {e(med.unite)}(s) × {ar(med.prix_unitaire)}",
            ar(ligne.quantite * med.prix_unitaire), style_gauche='detail',
        ))
    if not lignes:
        lignes.append(ligne_deux_colonnes(e(facture.designation or 'Médicaments'), ar(facture.montant)))
    lignes.append(Spacer(1, 2))
    lignes.append(Paragraph(f"Ordonnance {e(ordonnance.numero)}", STYLES['detail']))
    if exterieurs:
        lignes.append(Paragraph(f"Non délivré ici (pharmacie) : {e(', '.join(exterieurs))}", STYLES['detail']))
    return lignes


def hauteur_contenu(contenu):
    hauteur = 0
    for element in contenu:
        _, h = element.wrap(LARGEUR_UTILE, 10_000)
        hauteur += h + element.getSpaceBefore() + element.getSpaceAfter()
    return hauteur


def generate_recu_pdf(facture):
    paiement = facture.date_paiement or facture.date_creation
    caissier = (facture.encaisse_par.get_full_name() or facture.encaisse_par.username) \
        if facture.encaisse_par else 'Secrétariat'

    contenu = [
        Paragraph(e(settings.CABINET_NOM), STYLES['cabinet']),
        Paragraph(e(settings.CABINET_ADRESSE), STYLES['centre']),
        Paragraph(f"Tél. : {e(settings.CABINET_TELEPHONE)}", STYLES['centre']),
        pointilles(),
        Paragraph(f"REÇU N° REC-{facture.pk:05d}", STYLES['titre']),
        Paragraph(timezone.localtime(paiement).strftime('%d/%m/%Y à %H:%M'), STYLES['centre']),
        Spacer(1, 3),
        Paragraph(f"Patient : <b>{e(facture.patient.nom)} {e(facture.patient.prenom)}</b>", STYLES['texte']),
        Paragraph(f"Caissier : {e(caissier)}", STYLES['texte']),
        pointilles(),
    ]
    if facture.type == facture.Type.MEDICAMENTS:
        contenu += lignes_medicaments(facture)
    else:
        contenu += lignes_consultation(facture)
    contenu += [
        pointilles(),
        ligne_deux_colonnes('TOTAL', ar(facture.montant), 'total', 'total_montant', part_droite=0.55),
        Paragraph('PAYÉ', STYLES['titre']),
        pointilles(),
        Paragraph('Merci de votre confiance.', STYLES['centre']),
        Paragraph('Conservez ce reçu, il vous sera demandé pour tout suivi.', STYLES['centre']),
    ]

    hauteur = hauteur_contenu(contenu) + 2 * MARGE + 12 + 6 * mm
    tampon = io.BytesIO()
    doc = SimpleDocTemplate(
        tampon, pagesize=(LARGEUR_TICKET, hauteur), title=f"Reçu REC-{facture.pk:05d}",
        author=settings.CABINET_NOM, leftMargin=MARGE, rightMargin=MARGE, topMargin=MARGE, bottomMargin=MARGE,
    )
    doc.build(contenu)
    return tampon.getvalue()

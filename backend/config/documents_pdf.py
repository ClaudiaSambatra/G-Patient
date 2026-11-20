"""
Mise en page commune des documents médicaux A4 (ordonnance, demande d'examens) :
en-tête du cabinet et du praticien, encadré patient, signature et pied de page numéroté.
"""
import io
from xml.sax.saxutils import escape

from django.conf import settings
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ENCRE = colors.HexColor('#0f172a')
GRIS = colors.HexColor('#64748b')
FILET = colors.HexColor('#cbd5e1')
FOND = colors.HexColor('#f8fafc')
MARQUE = colors.HexColor('#141845')
ALERTE = colors.HexColor('#dc2626')

MARGE = 18 * mm
# Le cadre de page de ReportLab ajoute 6 pt de marge intérieure de chaque côté
PADDING_CADRE = 6
LARGEUR_UTILE = A4[0] - 2 * MARGE - 2 * PADDING_CADRE

STYLES = {
    'cabinet': ParagraphStyle('cabinet', fontName='Helvetica-Bold', fontSize=13, leading=16, textColor=MARQUE),
    'cabinet_sub': ParagraphStyle('cabinet_sub', fontName='Helvetica', fontSize=8.5, leading=11, textColor=GRIS),
    'medecin': ParagraphStyle('medecin', fontName='Helvetica-Bold', fontSize=11, leading=14, textColor=ENCRE,
                              alignment=TA_RIGHT),
    'medecin_sub': ParagraphStyle('medecin_sub', fontName='Helvetica', fontSize=8.5, leading=11, textColor=GRIS,
                                  alignment=TA_RIGHT),
    'titre': ParagraphStyle('titre', fontName='Helvetica-Bold', fontSize=15, leading=19, textColor=MARQUE,
                            alignment=TA_CENTER, spaceBefore=4, spaceAfter=10),
    'etiquette': ParagraphStyle('etiquette', fontName='Helvetica-Bold', fontSize=7, leading=9, textColor=GRIS),
    'valeur': ParagraphStyle('valeur', fontName='Helvetica-Bold', fontSize=10, leading=13, textColor=ENCRE),
    'texte': ParagraphStyle('texte', fontName='Helvetica', fontSize=9.5, leading=13, textColor=ENCRE),
    'detail': ParagraphStyle('detail', fontName='Helvetica', fontSize=8.5, leading=11.5, textColor=GRIS),
    'section': ParagraphStyle('section', fontName='Helvetica-Bold', fontSize=10, leading=13, textColor=MARQUE,
                              spaceBefore=8, spaceAfter=4),
    'alerte': ParagraphStyle('alerte', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=ALERTE),
    'signature': ParagraphStyle('signature', fontName='Helvetica', fontSize=9, leading=12, textColor=ENCRE,
                                alignment=TA_CENTER),
}


def e(valeur):
    """Texte échappé pour les paragraphes ReportLab (un « & » ou un « < » dans un nom casserait le rendu)."""
    return escape(str(valeur or ''))


def nom_medecin(utilisateur):
    return f"Dr {utilisateur.last_name} {utilisateur.first_name}".strip() if utilisateur.last_name \
        else f"Dr {utilisateur.username}"


def date_longue(dt):
    mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
            'septembre', 'octobre', 'novembre', 'décembre']
    jour = timezone.localtime(dt).date() if hasattr(dt, 'hour') else dt
    return f"{jour.day} {mois[jour.month - 1]} {jour.year}"


def en_tete(medecin):
    """Cabinet à gauche, praticien (spécialité, n° d'ordre) à droite, puis un filet."""
    profil = getattr(medecin, 'medecin_profile', None)
    droite = [Paragraph(e(nom_medecin(medecin)), STYLES['medecin'])]
    if profil and profil.specialite:
        droite.append(Paragraph(e(profil.specialite), STYLES['medecin_sub']))
    if profil and profil.numero_ordre:
        droite.append(Paragraph(f"N° d'ordre : {e(profil.numero_ordre)}", STYLES['medecin_sub']))
    if medecin.telephone:
        droite.append(Paragraph(f"Tél. : {e(medecin.telephone)}", STYLES['medecin_sub']))
    gauche = [
        Paragraph(e(settings.CABINET_NOM), STYLES['cabinet']),
        Paragraph(e(settings.CABINET_ADRESSE), STYLES['cabinet_sub']),
        Paragraph(f"Tél. : {e(settings.CABINET_TELEPHONE)}", STYLES['cabinet_sub']),
    ]
    tableau = Table([[gauche, droite]], colWidths=[LARGEUR_UTILE * 0.55, LARGEUR_UTILE * 0.45])
    tableau.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    return [tableau, Spacer(1, 3 * mm), HRFlowable(width='100%', thickness=1.5, color=MARQUE, spaceAfter=5 * mm)]


def encadre_patient(patient, numero, date_document, poids=None):
    """Encadré gris : identité du patient à gauche, numéro et date du document à droite."""
    sexe = patient.get_sexe_display()
    infos = f"{sexe}, {patient.age} ans" if patient.age is not None else sexe
    if poids:
        infos += f" — {poids:g} kg"
    gauche = [
        Paragraph('PATIENT', STYLES['etiquette']),
        Paragraph(f"{e(patient.nom)} {e(patient.prenom)}", STYLES['valeur']),
        Paragraph(e(infos), STYLES['detail']),
    ]
    if patient.allergies:
        gauche.append(Paragraph(f"Allergies : {e(patient.allergies)}", STYLES['alerte']))
    droite = [
        Paragraph('NUMÉRO', STYLES['etiquette']),
        Paragraph(e(numero), STYLES['valeur']),
        Paragraph(f"Le {date_longue(date_document)}", STYLES['detail']),
    ]
    tableau = Table([[gauche, droite]], colWidths=[LARGEUR_UTILE * 0.62, LARGEUR_UTILE * 0.38])
    tableau.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.75, FILET),
        ('LINEAFTER', (0, 0), (0, 0), 0.75, FILET),
        ('BACKGROUND', (0, 0), (-1, -1), FOND),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 9),
    ]))
    return [tableau, Spacer(1, 4 * mm)]


def bloc_signature(medecin, date_document):
    """« Fait à …, le … » et un cadre pour le cachet et la signature, gardés ensemble en bas du document."""
    cadre = Table(
        [[Paragraph(f"Fait à {e(settings.CABINET_VILLE)}, le {date_longue(date_document)}", STYLES['signature'])],
         [Paragraph(e(nom_medecin(medecin)), STYLES['signature'])],
         [Spacer(1, 22 * mm)],
         [Paragraph('<font color="#94a3b8" size="7.5">Cachet et signature</font>', STYLES['signature'])]],
        colWidths=[70 * mm],
    )
    cadre.setStyle(TableStyle([('BOX', (0, 1), (-1, -1), 0.75, FILET), ('ALIGN', (0, 0), (-1, -1), 'CENTER')]))
    ligne = Table([['', cadre]], colWidths=[LARGEUR_UTILE - 70 * mm, 70 * mm])
    ligne.setStyle(TableStyle([('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0)]))
    return KeepTogether([Spacer(1, 8 * mm), ligne])


def construire_a4(titre_document, numero, contenu, mention, annule=False):
    """Assemble le PDF A4 : pied de page (mention, numéro, page) et filigrane « ANNULÉ » si besoin."""
    def decorer(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(FILET)
        gauche, droite = MARGE + PADDING_CADRE, A4[0] - MARGE - PADDING_CADRE
        canvas.line(gauche, 14 * mm, droite, 14 * mm)
        canvas.setFont('Helvetica', 7.5)
        canvas.setFillColor(GRIS)
        canvas.drawString(gauche, 10 * mm, mention)
        canvas.drawRightString(droite, 10 * mm, f"{numero} — page {doc.page}")
        if annule:
            canvas.setFont('Helvetica-Bold', 70)
            canvas.setFillColor(colors.Color(0.86, 0.15, 0.15, alpha=0.15))
            canvas.translate(A4[0] / 2, A4[1] / 2)
            canvas.rotate(40)
            canvas.drawCentredString(0, 0, 'ANNULÉE')
        canvas.restoreState()

    tampon = io.BytesIO()
    doc = SimpleDocTemplate(
        tampon, pagesize=A4, title=f"{titre_document} {numero}", author=settings.CABINET_NOM,
        leftMargin=MARGE, rightMargin=MARGE, topMargin=15 * mm, bottomMargin=20 * mm,
    )
    doc.build(contenu, onFirstPage=decorer, onLaterPages=decorer)
    return tampon.getvalue()

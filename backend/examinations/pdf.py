from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import KeepTogether, Paragraph, Spacer, Table, TableStyle

from config.documents_pdf import (
    FILET, LARGEUR_UTILE, MARQUE, STYLES, bloc_signature, construire_document, e, en_tete, encadre_patient,
)

from .models import LigneDemandeExamen

TITRES_CATEGORIES = {
    LigneDemandeExamen.Categorie.BIOLOGIE: 'Biologie — laboratoire',
    LigneDemandeExamen.Categorie.IMAGERIE: 'Imagerie médicale',
    LigneDemandeExamen.Categorie.AUTRE: 'Autres examens',
}


def renseignements(texte):
    """Encadré des renseignements cliniques destinés au biologiste ou au radiologue."""
    tableau = Table([[[Paragraph('RENSEIGNEMENTS CLINIQUES', STYLES['etiquette']),
                       Paragraph(e(texte).replace('\n', '<br/>'), STYLES['texte'])]]],
                    colWidths=[LARGEUR_UTILE])
    tableau.setStyle(TableStyle([
        ('LINEBEFORE', (0, 0), (0, -1), 2.5, MARQUE),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#eef2ff')),
        ('LEFTPADDING', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    return [tableau, Spacer(1, 3 * mm)]


def case_a_cocher():
    case = Table([['']], colWidths=[3 * mm], rowHeights=[3 * mm])
    case.setStyle(TableStyle([('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#475569'))]))
    return case


def section_categorie(categorie, lignes):
    """Titre de la catégorie puis un tableau case à cocher / examen / instructions."""
    donnees = [[Paragraph('', STYLES['etiquette']), Paragraph('EXAMEN', STYLES['etiquette']),
                Paragraph('INSTRUCTIONS', STYLES['etiquette'])]]
    for ligne in lignes:
        donnees.append([
            case_a_cocher(),
            Paragraph(f"<b>{e(ligne.nom_examen)}</b>", STYLES['texte']),
            Paragraph(e(ligne.instructions) or '—', STYLES['detail']),
        ])
    tableau = Table(donnees, colWidths=[6 * mm, LARGEUR_UTILE * 0.5, LARGEUR_UTILE * 0.5 - 6 * mm],
                    repeatRows=1)
    tableau.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, FILET),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
    ]))
    return KeepTogether([Paragraph(e(TITRES_CATEGORIES.get(categorie, categorie)), STYLES['section']), tableau])


def generer_demande_examen_pdf(demande):
    contenu = en_tete(demande.medecin)
    contenu += encadre_patient(demande.patient, demande.numero, demande.date_creation)
    contenu.append(Paragraph("DEMANDE D'EXAMENS", STYLES['titre']))
    if demande.renseignements_cliniques:
        contenu += renseignements(demande.renseignements_cliniques)

    lignes = list(demande.lignes.all())
    for categorie in LigneDemandeExamen.Categorie.values:
        du_groupe = [ligne for ligne in lignes if ligne.categorie == categorie]
        if du_groupe:
            contenu.append(section_categorie(categorie, du_groupe))

    contenu.append(bloc_signature(demande.medecin, demande.date_creation))
    return construire_document(
        "Demande d'examens", demande.numero, contenu,
        mention="À présenter au laboratoire ou au centre d'imagerie.",
        annule=demande.statut == demande.Statut.ANNULEE,
    )

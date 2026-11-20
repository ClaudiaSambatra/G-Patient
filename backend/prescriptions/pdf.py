from reportlab.lib.units import mm
from reportlab.platypus import KeepTogether, Paragraph, Spacer, Table, TableStyle

from config.documents_pdf import (
    FILET, LARGEUR_UTILE, STYLES, bloc_signature, construire_document, e, en_tete, encadre_patient,
)


def posologie(ligne):
    """« 1 comprimé, 3 fois par jour, pendant 5 jours — voie orale »."""
    morceaux = [m for m in (ligne.dose_par_prise, ligne.frequence) if m]
    texte = ', '.join(morceaux)
    if ligne.duree:
        texte += f"{', ' if texte else ''}pendant {ligne.duree}"
    if ligne.voie_administration:
        texte += f"{' — ' if texte else ''}voie {ligne.voie_administration.lower()}"
    return texte


def bloc_ligne(numero, ligne):
    nom = f"<b>{numero}. {e(' '.join(m for m in (ligne.medicament, ligne.dosage) if m))}</b>"
    if ligne.forme:
        nom += f" <font color='#64748b' size='7.5'>({e(ligne.forme)})</font>"
    details = [Paragraph(nom, STYLES['texte'])]
    texte_posologie = posologie(ligne)
    if texte_posologie:
        details.append(Paragraph(e(texte_posologie), STYLES['texte']))
    if ligne.instructions:
        details.append(Paragraph(f"<i>{e(ligne.instructions)}</i>", STYLES['detail']))
    if ligne.medicament_stock_id:
        unite = ligne.medicament_stock.unite if ligne.medicament_stock else 'unité'
        details.append(Paragraph(f"Quantité : {ligne.quantite} {e(unite)}(s) — délivré par le cabinet",
                                 STYLES['detail']))
    tableau = Table([[details]], colWidths=[LARGEUR_UTILE])
    tableau.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, FILET),
        ('LEFTPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    return KeepTogether([tableau])


def generer_ordonnance_pdf(ordonnance):
    consultation = ordonnance.consultation
    constantes = getattr(consultation, 'constantes', None)
    poids = float(constantes.poids) if constantes and constantes.poids else None

    contenu = en_tete(consultation.medecin)
    contenu += encadre_patient(consultation.patient, ordonnance.numero, ordonnance.date_creation, poids)
    contenu.append(Paragraph('ORDONNANCE', STYLES['titre']))

    lignes = list(ordonnance.lignes.all())
    if lignes:
        contenu += [bloc_ligne(i, ligne) for i, ligne in enumerate(lignes, 1)]
    else:
        # Anciennes ordonnances saisies en texte libre
        contenu.append(Paragraph(e(ordonnance.medicaments).replace('\n', '<br/>'), STYLES['texte']))
        if ordonnance.posologie:
            contenu.append(Spacer(1, 3 * mm))
            contenu.append(Paragraph(f"<b>Posologie :</b> {e(ordonnance.posologie)}", STYLES['texte']))
        if ordonnance.duree:
            contenu.append(Paragraph(f"<b>Durée :</b> {e(ordonnance.duree)}", STYLES['texte']))

    contenu.append(bloc_signature(consultation.medecin, ordonnance.date_creation))
    return construire_document(
        'Ordonnance', ordonnance.numero, contenu,
        mention="Ordonnance à conserver. Ne pas dépasser les doses prescrites.",
        annule=ordonnance.statut == ordonnance.Statut.ANNULEE,
    )

import io
from django.utils import timezone
from reportlab.lib.pagesizes import A5
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER


def generate_recu_pdf(facture):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A5,
        rightMargin=30,
        leftMargin=30,
        topMargin=30,
        bottomMargin=30
    )

    styles = getSampleStyleSheet()

    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Normal'],
        fontSize=15,
        leading=19,
        textColor=colors.HexColor('#0f766e'),
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )

    sub_header_style = ParagraphStyle(
        'SubHeaderStyle',
        parent=styles['Normal'],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#475569'),
        alignment=TA_CENTER
    )

    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading2'],
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#1e293b'),
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )

    paid_badge_style = ParagraphStyle(
        'PaidBadgeStyle',
        parent=styles['Normal'],
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#15803d'),
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )

    normal_style = ParagraphStyle(
        'ReceiptNormal',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#1e293b')
    )

    bold_style = ParagraphStyle(
        'ReceiptBold',
        parent=normal_style,
        fontName='Helvetica-Bold'
    )

    story = []

    # En-tête de l'établissement
    story.append(Paragraph("CENTRE MÉDICAL GESTION PATIENTS", header_style))
    story.append(Paragraph("Soins Médicaux &amp; Consultations • Tél: +261 34 00 000 00", sub_header_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1'), spaceAfter=12))

    # Titre du reçu
    story.append(Paragraph(f"REÇU DE PAIEMENT N° REC-{facture.pk:05d}", title_style))
    story.append(Paragraph("— MENTION : PAYÉ —", paid_badge_style))
    story.append(Spacer(1, 12))

    # Détails du reçu
    date_paiement_str = (
        timezone.localtime(facture.date_paiement).strftime("%d/%m/%Y %H:%M")
        if facture.date_paiement
        else timezone.localtime(facture.date_creation).strftime("%d/%m/%Y %H:%M")
    )

    patient_nom = f"{facture.patient.nom} {facture.patient.prenom}"
    encaisse_par_nom = (
        facture.encaisse_par.get_full_name() or facture.encaisse_par.username
        if facture.encaisse_par
        else "Accueil / Secrétariat"
    )
    designation = facture.designation or facture.actes or "Frais médicaux"

    table_data = [
        [Paragraph("Date :", bold_style), Paragraph(date_paiement_str, normal_style)],
        [Paragraph("Patient :", bold_style), Paragraph(patient_nom, normal_style)],
        [Paragraph("Type :", bold_style), Paragraph(facture.get_type_display(), normal_style)],
        [Paragraph("Désignation :", bold_style), Paragraph(designation, normal_style)],
        [Paragraph("Montant total :", bold_style), Paragraph(f"<b>{facture.montant:,.0f} Ar</b>".replace(',', ' '), bold_style)],
        [Paragraph("Encaissé par :", bold_style), Paragraph(encaisse_par_nom, normal_style)],
        [Paragraph("Statut :", bold_style), Paragraph("<font color='#15803d'><b>Payé</b></font>", bold_style)],
    ]

    t = Table(table_data, colWidths=[110, 250])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor('#f1f5f9')),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f0fdf4')),
    ]))
    story.append(t)

    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#e2e8f0'), spaceAfter=8))
    story.append(Paragraph("<i>Document valant reçu officiel de règlement. Conservez ce reçu pour tout retrait de médicaments ou suivi.</i>", sub_header_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()

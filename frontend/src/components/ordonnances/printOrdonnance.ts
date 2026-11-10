import { Ordonnance, getAge } from "./types"

export function handlePrintOrdonnance(ord: Ordonnance) {
  const printWindow = window.open("", "_blank")
  if (!printWindow) return

  const patientAge = getAge(ord.patient_date_naissance)
  const hasLignes = ord.lignes && ord.lignes.length > 0

  const lignesRows = hasLignes
    ? ord.lignes!
        .map(
          (l, index) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 8px; font-weight: 600; color: #0f766e;">${index + 1}</td>
        <td style="padding: 10px 8px;">
          <div style="font-weight: bold; font-size: 1.05em; color: #0f172a;">${l.medicament} ${l.dosage || ""}</div>
          ${l.forme ? `<div style="font-size: 0.85em; color: #64748b;">Forme : ${l.forme}</div>` : ""}
        </td>
        <td style="padding: 10px 8px;">
          <div style="font-weight: 500;">${l.dose_par_prise || ""}${l.frequence ? ` — ${l.frequence}` : ""}</div>
          ${l.voie_administration ? `<div style="font-size: 0.85em; color: #64748b;">Voie ${l.voie_administration}</div>` : ""}
        </td>
        <td style="padding: 10px 8px; font-weight: 600; color: #334155;">${l.duree || "—"}</td>
        <td style="padding: 10px 8px; font-style: italic; color: #475569; font-size: 0.9em;">${l.instructions || "Selon prescription"}</td>
      </tr>
    `
        )
        .join("")
    : `
      <tr>
        <td colspan="5" style="padding: 16px; font-size: 1.05em; line-height: 1.8; white-space: pre-wrap;">
          <strong>Prescription :</strong><br/>
          ${ord.medicaments}
          ${ord.posologie ? `<br/><br/><strong>Posologie :</strong> ${ord.posologie}` : ""}
          ${ord.duree ? `<br/><strong>Durée :</strong> ${ord.duree}` : ""}
        </td>
      </tr>
    `

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <title>Ordonnance ${ord.numero} - ${ord.patient_nom} ${ord.patient_prenom}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 20mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            background: #fff;
            margin: 0;
            padding: 20px;
            font-size: 13px;
            line-height: 1.5;
          }
          .header-table {
            width: 100%;
            border-bottom: 2.5px solid #0f766e;
            padding-bottom: 14px;
            margin-bottom: 22px;
          }
          .brand-title {
            font-size: 1.45em;
            font-weight: 800;
            color: #0f766e;
            letter-spacing: -0.5px;
          }
          .brand-sub {
            font-size: 0.85em;
            color: #475569;
            margin-top: 2px;
            font-weight: 500;
          }
          .doctor-box {
            text-align: right;
          }
          .doctor-name {
            font-size: 1.15em;
            font-weight: 700;
            color: #0f172a;
          }
          .doctor-sub {
            font-size: 0.9em;
            color: #0d9488;
            font-weight: 600;
          }
          .doctor-meta {
            font-size: 0.85em;
            color: #64748b;
          }
          .meta-grid {
            width: 100%;
            margin-bottom: 24px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            background-color: #f8fafc;
          }
          .meta-cell {
            padding: 10px 14px;
            vertical-align: top;
          }
          .label {
            font-size: 0.75em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            font-weight: 700;
            margin-bottom: 2px;
          }
          .value {
            font-size: 1em;
            font-weight: 700;
            color: #0f172a;
          }
          .badge-num {
            display: inline-block;
            background-color: #e0f2fe;
            color: #0369a1;
            padding: 2px 8px;
            border-radius: 4px;
            font-family: monospace;
            font-weight: 700;
          }
          .prescription-title {
            text-align: center;
            font-size: 1.2em;
            font-weight: 800;
            letter-spacing: 1px;
            color: #0f766e;
            margin: 18px 0;
            text-transform: uppercase;
          }
          .presc-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          .presc-table th {
            background-color: #f1f5f9;
            color: #334155;
            font-size: 0.8em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 8px;
            text-align: left;
            border-bottom: 2px solid #cbd5e1;
          }
          .footer-section {
            margin-top: 45px;
            page-break-inside: avoid;
          }
          .stamp-box {
            width: 250px;
            height: 120px;
            border: 1.5px dashed #94a3b8;
            border-radius: 8px;
            margin-left: auto;
            text-align: center;
            padding: 8px;
            color: #64748b;
            font-size: 0.85em;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .legal-mention {
            margin-top: 35px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            font-size: 0.75em;
            color: #94a3b8;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td style="vertical-align: top;">
              <div class="brand-title">CENTRE MÉDICAL GESTION PATIENTS</div>
              <div class="brand-sub">Soins généraux & Spécialisés • Plateau Médical</div>
              <div class="brand-sub">Contact : +261 34 00 000 00 • Antananarivo</div>
            </td>
            <td class="doctor-box" style="vertical-align: top;">
              <div class="doctor-name">${ord.medecin_nom}</div>
              ${ord.medecin_specialite ? `<div class="doctor-sub">${ord.medecin_specialite}</div>` : ""}
              ${ord.medecin_numero_ordre ? `<div class="doctor-meta">Ordre National : ${ord.medecin_numero_ordre}</div>` : ""}
            </td>
          </tr>
        </table>

        <table class="meta-grid">
          <tr>
            <td class="meta-cell" style="width: 50%; border-right: 1px solid #cbd5e1;">
              <div class="label">Patient</div>
              <div class="value">${ord.patient_nom} ${ord.patient_prenom}</div>
              ${patientAge ? `<div style="font-size: 0.85em; color: #475569; margin-top: 2px;">Âge : ${patientAge}</div>` : ""}
              ${ord.patient_allergies ? `<div style="font-size: 0.8em; color: #dc2626; font-weight: 600; margin-top: 3px;">Allergies signalées : ${ord.patient_allergies}</div>` : ""}
            </td>
            <td class="meta-cell" style="width: 50%;">
              <div class="label">Numéro d'ordonnance officiel</div>
              <div class="value"><span class="badge-num">${ord.numero}</span></div>
              <div style="font-size: 0.85em; color: #475569; margin-top: 4px;">
                Délivrée le : <strong>${new Date(ord.date_creation).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</strong>
              </div>
            </td>
          </tr>
        </table>

        <div class="prescription-title">ORDONNANCE MÉDICALE</div>

        <table class="presc-table">
          <thead>
            <tr>
              <th style="width: 5%;">#</th>
              <th style="width: 35%;">Médicament & Dosage</th>
              <th style="width: 25%;">Posologie & Administration</th>
              <th style="width: 15%;">Durée</th>
              <th style="width: 20%;">Instructions particulières</th>
            </tr>
          </thead>
          <tbody>
            ${lignesRows}
          </tbody>
        </table>

        <div class="footer-section">
          <div class="stamp-box">
            <span style="font-weight: 600; text-transform: uppercase; font-size: 0.8em; letter-spacing: 0.5px;">Cachet & Signature du Praticien</span>
            <span style="font-size: 0.75em; color: #94a3b8;">Document médical authentifié</span>
          </div>
        </div>

        <div class="legal-mention">
          Ordonnance valable pour la délivrance des spécialités prescrites conformément à la législation en vigueur.
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

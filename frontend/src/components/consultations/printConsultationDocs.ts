import { Consultation } from "./types"

export function handlePrintPrescription(
  ord: any,
  selectedConsultation?: Consultation | null
) {
  const printWindow = window.open("", "_blank")
  if (!printWindow) return

  const hasLignes = ord.lignes && ord.lignes.length > 0
  const numOrd = ord.numero || `ORD-${ord.id}`

  const lignesRows = hasLignes
    ? ord.lignes
        .map(
          (l: any, index: number) => `
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
        <title>Ordonnance ${numOrd} - ${ord.patient_nom || selectedConsultation?.patient_nom}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm 20mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; padding: 20px; font-size: 13px; line-height: 1.5; }
          .header-table { width: 100%; border-bottom: 2.5px solid #0f766e; padding-bottom: 14px; margin-bottom: 20px; }
          .brand-title { font-size: 1.45em; font-weight: 800; color: #0f766e; }
          .brand-sub { font-size: 0.85em; color: #475569; }
          .doctor-box { text-align: right; }
          .doctor-name { font-size: 1.15em; font-weight: 700; color: #0f172a; }
          .doctor-sub { font-size: 0.9em; color: #0d9488; font-weight: 600; }
          .meta-grid { width: 100%; margin-bottom: 22px; border: 1px solid #cbd5e1; border-radius: 8px; background-color: #f8fafc; }
          .meta-cell { padding: 10px 14px; vertical-align: top; }
          .label { font-size: 0.75em; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .value { font-size: 1em; font-weight: 700; color: #0f172a; }
          .badge-num { display: inline-block; background-color: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-family: monospace; font-weight: 700; }
          .prescription-title { text-align: center; font-size: 1.2em; font-weight: 800; color: #0f766e; margin: 16px 0; text-transform: uppercase; }
          .presc-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .presc-table th { background-color: #f1f5f9; color: #334155; font-size: 0.8em; text-transform: uppercase; padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1; }
          .footer-section { margin-top: 40px; page-break-inside: avoid; }
          .stamp-box { width: 240px; height: 110px; border: 1.5px dashed #94a3b8; border-radius: 8px; margin-left: auto; text-align: center; padding: 8px; color: #64748b; font-size: 0.85em; display: flex; flex-direction: column; justify-content: space-between; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td>
              <div class="brand-title">CENTRE MÉDICAL GESTION PATIENTS</div>
              <div class="brand-sub">Soins généraux & Spécialisés • Antananarivo</div>
            </td>
            <td class="doctor-box">
              <div class="doctor-name">${ord.medecin_nom || selectedConsultation?.medecin_nom}</div>
              ${ord.medecin_specialite ? `<div class="doctor-sub">${ord.medecin_specialite}</div>` : ""}
            </td>
          </tr>
        </table>

        <table class="meta-grid">
          <tr>
            <td class="meta-cell" style="width: 50%; border-right: 1px solid #cbd5e1;">
              <div class="label">Patient</div>
              <div class="value">${selectedConsultation?.patient_nom} ${selectedConsultation?.patient_prenom}</div>
            </td>
            <td class="meta-cell" style="width: 50%;">
              <div class="label">Numéro d'ordonnance officiel</div>
              <div class="value"><span class="badge-num">${numOrd}</span></div>
              <div style="font-size: 0.85em; color: #475569; margin-top: 4px;">
                Délivrée le : <strong>${new Date(ord.date_creation).toLocaleDateString("fr-FR")}</strong>
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
              <th style="width: 20%;">Instructions</th>
            </tr>
          </thead>
          <tbody>
            ${lignesRows}
          </tbody>
        </table>

        <div class="footer-section">
          <div class="stamp-box">
            <span style="font-weight: 600; text-transform: uppercase; font-size: 0.8em;">Cachet & Signature du Médecin</span>
            <span style="font-size: 0.75em; color: #94a3b8;">Document médical authentifié</span>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

export function handlePrintExam(
  exam: any,
  selectedConsultation?: Consultation | null
) {
  const printWindow = window.open("", "_blank")
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres pop-up pour imprimer la demande d'examens.")
    return
  }

  const numExam = exam.numero || `EXAM-#${exam.id}`
  const lignesRows =
    exam.lignes && exam.lignes.length > 0
      ? exam.lignes
          .map(
            (l: any, idx: number) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 9px; text-align: center; color: #64748b; font-weight: bold;">${idx + 1}</td>
          <td style="padding: 9px; font-weight: 600; color: #0284c7;">
            ${l.categorie === "BIOLOGIE" ? "🔬 Biologie" : l.categorie === "IMAGERIE" ? "🩻 Imagerie" : "📋 Exploration"}
          </td>
          <td style="padding: 9px; font-weight: 700; color: #0f172a;">${l.nom_examen}</td>
          <td style="padding: 9px; color: #475569;">${l.instructions || "—"}</td>
          <td style="padding: 9px; text-align: center;">
            <div style="width: 14px; height: 14px; border: 1.5px solid #94a3b8; border-radius: 3px; margin: 0 auto;"></div>
          </td>
        </tr>
      `
          )
          .join("")
      : `<tr><td colspan="5" style="padding: 12px; text-align: center; font-style: italic; color: #64748b;">Aucun examen spécifié</td></tr>`

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <title>Demande d'examens ${numExam} - ${selectedConsultation?.patient_nom} ${selectedConsultation?.patient_prenom}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm 20mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; padding: 20px; font-size: 13px; line-height: 1.5; }
          .header-table { width: 100%; border-bottom: 2.5px solid #0369a1; padding-bottom: 14px; margin-bottom: 20px; }
          .brand-title { font-size: 1.45em; font-weight: 800; color: #0369a1; }
          .brand-sub { font-size: 0.85em; color: #475569; }
          .doctor-box { text-align: right; }
          .doctor-name { font-size: 1.15em; font-weight: 700; color: #0f172a; }
          .doctor-sub { font-size: 0.9em; color: #0284c7; font-weight: 600; }
          .meta-grid { width: 100%; margin-bottom: 20px; border: 1px solid #cbd5e1; border-radius: 8px; background-color: #f8fafc; }
          .meta-cell { padding: 10px 14px; vertical-align: top; }
          .label { font-size: 0.75em; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .value { font-size: 1em; font-weight: 700; color: #0f172a; }
          .badge-num { display: inline-block; background-color: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-family: monospace; font-weight: 700; }
          .exam-title { text-align: center; font-size: 1.2em; font-weight: 800; color: #0369a1; margin: 16px 0; text-transform: uppercase; }
          .exam-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .exam-table th { background-color: #f1f5f9; color: #334155; font-size: 0.8em; text-transform: uppercase; padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1; }
          .clinical-box { background: #f0f9ff; border-left: 4px solid #0284c7; padding: 10px 14px; border-radius: 0 6px 6px 0; margin-bottom: 16px; font-size: 0.9em; color: #0369a1; }
          .footer-section { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid; }
          .stamp-box { width: 230px; height: 100px; border: 1.5px dashed #94a3b8; border-radius: 8px; text-align: center; padding: 8px; color: #64748b; font-size: 0.85em; display: flex; flex-direction: column; justify-content: space-between; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td>
              <div class="brand-title">CENTRE MÉDICAL GESTION PATIENTS</div>
              <div class="brand-sub">Service Médical • Examens complémentaires externes</div>
            </td>
            <td class="doctor-box">
              <div class="doctor-name">${exam.medecin_nom || selectedConsultation?.medecin_nom}</div>
              ${exam.medecin_specialite ? `<div class="doctor-sub">${exam.medecin_specialite}</div>` : ""}
            </td>
          </tr>
        </table>

        <table class="meta-grid">
          <tr>
            <td class="meta-cell" style="width: 50%; border-right: 1px solid #cbd5e1;">
              <div class="label">Patient</div>
              <div class="value">${selectedConsultation?.patient_nom} ${selectedConsultation?.patient_prenom}</div>
            </td>
            <td class="meta-cell" style="width: 50%;">
              <div class="label">Demande d'examens médicaux</div>
              <div class="value"><span class="badge-num">${numExam}</span></div>
              <div style="font-size: 0.85em; color: #475569; margin-top: 4px;">
                Date de prescription : <strong>${new Date(exam.date_creation).toLocaleDateString("fr-FR")}</strong>
              </div>
            </td>
          </tr>
        </table>

        <div class="exam-title">PRESCRIPTION D'EXAMENS MÉDICAUX</div>

        ${
          exam.renseignements_cliniques
            ? `
          <div class="clinical-box">
            <strong>Renseignements cliniques / Diagnostic d'orientation :</strong><br/>
            ${exam.renseignements_cliniques}
          </div>
        `
            : ""
        }

        <table class="exam-table">
          <thead>
            <tr>
              <th style="width: 5%;">#</th>
              <th style="width: 25%;">Catégorie</th>
              <th style="width: 35%;">Examen demandé</th>
              <th style="width: 25%;">Instructions particulières</th>
              <th style="width: 10%; text-align: center;">Réalisé</th>
            </tr>
          </thead>
          <tbody>
            ${lignesRows}
          </tbody>
        </table>

        <div class="footer-section">
          <div style="font-size: 0.75em; color: #64748b; max-width: 55%; line-height: 1.4;">
            <em>Examens à réaliser auprès d'un laboratoire ou centre d'imagerie médicale agréé. Règlements directs auprès du prestataire. Ce document ne donne lieu à aucune facturation par notre centre.</em>
          </div>
          <div class="stamp-box">
            <span style="font-weight: 600; text-transform: uppercase; font-size: 0.8em;">Cachet & Signature du Médecin</span>
            <span style="font-size: 0.75em; color: #94a3b8;">Document médical authentifié</span>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

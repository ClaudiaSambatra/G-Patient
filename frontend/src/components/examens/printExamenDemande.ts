import { DemandeExamen, getAge } from "./types"

export function handlePrintDemandeExamen(demande: DemandeExamen) {
  const printWindow = window.open("", "_blank")
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres pop-up pour imprimer la demande d'examens.")
    return
  }

  const age = getAge(demande.patient_date_naissance)
  const dateFormatted = new Date(demande.date_creation).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  const lignesTableHtml =
    demande.lignes && demande.lignes.length > 0
      ? `
      <table class="exam-table">
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">N°</th>
            <th style="width: 140px;">Catégorie</th>
            <th>Examen demandé</th>
            <th>Précautions / Instructions cliniques</th>
            <th style="width: 70px; text-align: center;">Réalisé</th>
          </tr>
        </thead>
        <tbody>
          ${demande.lignes
            .map(
              (l, idx) => `
            <tr>
              <td style="text-align: center; font-weight: bold; color: #64748b;">${idx + 1}</td>
              <td>
                <span class="badge ${
                  l.categorie === "BIOLOGIE"
                    ? "badge-bio"
                    : l.categorie === "IMAGERIE"
                    ? "badge-img"
                    : "badge-autre"
                }">
                  ${
                    l.categorie === "BIOLOGIE"
                      ? "Biologie médicale"
                      : l.categorie === "IMAGERIE"
                      ? "Imagerie / Radio"
                      : "Exploration"
                  }
                </span>
              </td>
              <td style="font-weight: 600; font-size: 1.05em; color: #0f172a;">${l.nom_examen}</td>
              <td style="color: #475569; font-style: ${l.instructions ? "normal" : "italic"};">
                ${l.instructions || "—"}
              </td>
              <td style="text-align: center;">
                <div class="checkbox-box"></div>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `
      : `<p style="font-style: italic; color: #64748b;">Aucun examen prescrit.</p>`

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <title>Demande d'examens ${demande.numero} - ${demande.patient_nom} ${demande.patient_prenom}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm 20mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; padding: 20px; font-size: 13px; line-height: 1.5; }
          .header-table { width: 100%; border-bottom: 2.5px solid #0891b2; padding-bottom: 14px; margin-bottom: 20px; }
          .brand-title { font-size: 1.45em; font-weight: 800; color: #0891b2; letter-spacing: -0.5px; }
          .brand-sub { font-size: 0.85em; color: #475569; margin-top: 2px; font-weight: 500; }
          .doctor-box { text-align: right; }
          .doctor-name { font-size: 1.15em; font-weight: 700; color: #0f172a; }
          .doctor-sub { font-size: 0.9em; color: #0284c7; font-weight: 600; }
          .doctor-meta { font-size: 0.85em; color: #64748b; }
          .meta-grid { width: 100%; margin-bottom: 20px; border: 1px solid #cbd5e1; border-radius: 8px; background-color: #f8fafc; }
          .meta-cell { padding: 10px 14px; vertical-align: top; }
          .label { font-size: 0.75em; text-transform: uppercase; letter-spacing: 0.6px; color: #64748b; font-weight: 700; margin-bottom: 3px; }
          .value { font-size: 0.95em; font-weight: 600; color: #0f172a; }
          .value-num { font-family: ui-monospace, SFMono-Regular, monospace; font-size: 1.1em; font-weight: 800; color: #0891b2; }
          .status-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75em; font-weight: 700; text-transform: uppercase; margin-left: 6px; }
          .status-active { background: #dcfce7; color: #166534; }
          .status-mod { background: #fef3c7; color: #92400e; }
          .status-ann { background: #fee2e2; color: #991b1b; }
          .section-title { font-size: 1.15em; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #0891b2; margin-top: 15px; margin-bottom: 10px; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 6px; }
          .clinical-info { background: #f0fdfa; border-left: 4px solid #0d9488; padding: 10px 14px; border-radius: 0 6px 6px 0; margin-bottom: 18px; font-size: 0.9em; color: #0f766e; }
          .exam-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          .exam-table th { background: #f1f5f9; color: #334155; font-weight: 700; font-size: 0.8em; text-transform: uppercase; padding: 8px 10px; border: 1px solid #cbd5e1; text-align: left; }
          .exam-table td { padding: 9px 10px; border: 1px solid #e2e8f0; vertical-align: middle; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 0.75em; font-weight: 600; }
          .badge-bio { background: #ecfeff; color: #0891b2; border: 1px solid #a5f3fc; }
          .badge-img { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
          .badge-autre { background: #f3f4f6; color: #4b5563; border: 1px solid #e5e7eb; }
          .checkbox-box { width: 16px; height: 16px; border: 1.5px solid #94a3b8; border-radius: 3px; margin: 0 auto; }
          .footer-info { margin-top: 25px; padding-top: 14px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; }
          .legal-mention { font-size: 0.75em; color: #64748b; max-width: 60%; line-height: 1.4; }
          .signature-box { text-align: center; width: 220px; }
          .signature-line { margin-top: 45px; border-top: 1px solid #0f172a; padding-top: 4px; font-size: 0.85em; font-weight: 600; color: #334155; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td>
              <div class="brand-title">CENTRE MÉDICAL & CLINIQUE</div>
              <div class="brand-sub">Service des Consultations et Prescriptions Externes</div>
              <div class="brand-sub">Tél: +261 20 22 000 00 • Antananarivo, Madagascar</div>
            </td>
            <td class="doctor-box">
              <div class="doctor-name">${demande.medecin_nom || "Praticien"}</div>
              <div class="doctor-sub">${demande.medecin_specialite || "Médecine Générale"}</div>
              ${demande.medecin_numero_ordre ? `<div class="doctor-meta">N° Ordre : ${demande.medecin_numero_ordre}</div>` : ""}
            </td>
          </tr>
        </table>

        <table class="meta-grid">
          <tr>
            <td class="meta-cell" style="width: 50%; border-right: 1px solid #cbd5e1;">
              <div class="label">Patient</div>
              <div class="value" style="font-size: 1.05em;">${demande.patient_nom} ${demande.patient_prenom}</div>
              <div style="font-size: 0.85em; color: #475569; margin-top: 2px;">
                ${age ? `Âge : ${age} • ` : ""}
                ${demande.patient_date_naissance ? `Né le ${new Date(demande.patient_date_naissance).toLocaleDateString("fr-FR")} • ` : ""}
                ${demande.patient_contact ? `Tél : ${demande.patient_contact}` : ""}
              </div>
            </td>
            <td class="meta-cell" style="width: 50%;">
              <div class="label">Demande d'examens médicaux</div>
              <div class="value-num">
                ${demande.numero}
                <span class="status-tag ${demande.statut === "ACTIVE" ? "status-active" : demande.statut === "MODIFIEE" ? "status-mod" : "status-ann"}">
                  ${demande.statut}
                </span>
              </div>
              <div style="font-size: 0.85em; color: #475569; margin-top: 2px;">
                Date de délivrance : <strong>${dateFormatted}</strong>
              </div>
            </td>
          </tr>
        </table>

        <div class="section-title">
          DEMANDE D'ANALYSES ET D'EXPLORATIONS COMPLÉMENTAIRES
        </div>

        ${demande.renseignements_cliniques ? `
          <div class="clinical-info">
            <strong>Renseignements cliniques / Diagnostic d'orientation :</strong><br/>
            ${demande.renseignements_cliniques}
          </div>
        ` : ""}

        ${lignesTableHtml}

        <div class="footer-info">
          <div class="legal-mention">
            <strong>À l'attention du laboratoire ou centre d'imagerie :</strong><br/>
            Prière de réaliser les examens ci-dessus mentionnés et de transmettre les résultats au patient.<br/>
            <em>Règlement direct des prestations auprès du prestataire exécutant. Ce document ne donne lieu à aucune facturation interne par notre centre.</em>
          </div>
          <div class="signature-box">
            <div style="font-size: 0.8em; color: #64748b;">Signature et Cachet du Praticien</div>
            <div class="signature-line">
              ${demande.medecin_nom || "Signature"}
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

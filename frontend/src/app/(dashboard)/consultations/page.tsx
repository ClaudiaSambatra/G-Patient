"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { CurrentUser } from "@/components/sidebar"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  FileText, 
  Search, 
  RefreshCw, 
  Calendar,
  User,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  XCircle,
  FileSignature,
  FilterX,
  CheckCircle2,
  AlertCircle,
  Printer,
  Activity,
  History,
  AlertTriangle,
  Clock,
  Heart,
  Thermometer,
  Scale,
  Sparkles,
  Pill,
  FlaskConical,
  Microscope,
  Trash2,
  Plus,
  ShieldAlert,
  Info
} from "lucide-react"

interface ConstantesVitales {
  id?: number
  temperature?: string | number | null
  poids?: string | number | null
  taille?: string | number | null
  tension_arterielle?: string | null
  frequence_cardiaque?: number | null
  date_prise?: string
}

interface ConsultationHistoriqueItem {
  id: number
  auteur: number
  auteur_nom: string
  date_modification: string
  motif_correction: string
  champs_modifies: string[]
  anciennes_valeurs: Record<string, any>
  nouvelles_valeurs: Record<string, any>
}

interface Consultation {
  id: number
  patient: number
  patient_nom: string
  patient_prenom: string
  patient_date_naissance?: string
  patient_contact?: string
  patient_allergies?: string
  patient_antecedents?: string
  medecin: number
  medecin_nom: string
  rendez_vous: number | null
  date_consultation: string
  motif: string
  observations: string
  diagnostic: string
  compte_rendu?: string
  date_controle_recommandee?: string | null
  constantes?: ConstantesVitales | null
  historique?: ConsultationHistoriqueItem[]
  statut_paiement?: "PAYE" | "IMPAYE" | "GRATUIT"
}

interface ConsultationListResponse {
  count: number
  next: string | null
  previous: string | null
  results: Consultation[]
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: unknown } }).response
    if (res?.data) {
      if (typeof res.data === "string") return res.data
      if (typeof res.data === "object") {
        const values = Object.values(res.data)
        if (values.length > 0) {
          const first = values[0]
          if (Array.isArray(first)) return String(first[0])
          if (typeof first === "string") return first
        }
      }
    }
  }
  return fallback
}

function computeAge(dateStr?: string): number | null {
  if (!dateStr) return null
  const b = new Date(dateStr)
  if (isNaN(b.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - b.getFullYear()
  const m = today.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) {
    age--
  }
  return age >= 0 ? age : null
}

function computeBMI(poids?: string | number | null, taille?: string | number | null) {
  if (!poids || !taille) return null
  const p = typeof poids === "string" ? parseFloat(poids) : poids
  const t = typeof taille === "string" ? parseFloat(taille) : taille
  if (!p || !t || p <= 0 || t <= 0) return null
  const hM = t / 100
  const imc = p / (hM * hM)
  if (isNaN(imc) || imc <= 0) return null
  const val = Math.round(imc * 10) / 10
  let label = "Corpulence normale"
  let color = "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800"
  if (val < 18.5) {
    label = "Insuffisance pondérale"
    color = "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-800"
  } else if (val >= 25 && val < 30) {
    label = "Surpoids"
    color = "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800"
  } else if (val >= 30) {
    label = "Obésité"
    color = "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-800"
  }
  return { val, label, color }
}

function getInitials(nom?: string, prenom?: string): string {
  const n = (nom || "").trim().charAt(0).toUpperCase()
  const p = (prenom || "").trim().charAt(0).toUpperCase()
  return `${n}${p}` || "PT"
}

export default function ConsultationsPage() {
  const queryClient = useQueryClient()

  // Filtres et recherche
  const [search, setSearch] = useState("")
  const [dateDebut, setDateDebut] = useState("")
  const [dateFin, setDateFin] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Modales
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    motif: "",
    observations: "",
    diagnostic: "",
    compte_rendu: "",
    date_controle_recommandee: "",
    motif_correction: "",
    constantes: {
      temperature: "",
      poids: "",
      taille: "",
      tension_arterielle: "",
      frequence_cardiaque: ""
    }
  })
  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false)
  const [prescriptionForm, setPrescriptionForm] = useState({
    medicaments: "",
    posologie: "",
    duree: ""
  })

  // Notifications
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)

  function showNotification(type: "success" | "error", message: string) {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr))
    }, 5000)
  }

  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await apiClient.get<CurrentUser>("/accounts/me/")
      return data
    },
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["consultations", search, dateDebut, dateFin, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (dateDebut) params.append("date_debut", dateDebut)
      if (dateFin) params.append("date_fin", dateFin)
      params.append("page", String(page))
      params.append("page_size", String(pageSize))
      const { data } = await apiClient.get<ConsultationListResponse>(`/consultations/?${params.toString()}`)
      return data
    },
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.count / pageSize)) : 1

  // Statistiques calculées pour l'en-tête
  const todayStr = new Date().toISOString().split("T")[0]
  const consultationsList = data?.results || []
  const todayCount = consultationsList.filter(c => c.date_consultation.startsWith(todayStr)).length
  const withVitalsCount = consultationsList.filter(c => c.constantes && (c.constantes.temperature || c.constantes.tension_arterielle || c.constantes.poids)).length
  const withControlCount = consultationsList.filter(c => c.date_controle_recommandee).length

  // Mutation modification de consultation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConsultation) return
      const payload: Record<string, any> = {
        motif: editForm.motif,
        observations: editForm.observations,
        diagnostic: editForm.diagnostic,
        compte_rendu: editForm.compte_rendu,
        date_controle_recommandee: editForm.date_controle_recommandee || null,
        motif_correction: editForm.motif_correction
      }
      const c = editForm.constantes
      if (c.temperature || c.poids || c.taille || c.tension_arterielle || c.frequence_cardiaque) {
        payload.constantes = {
          temperature: c.temperature ? parseFloat(c.temperature) : null,
          poids: c.poids ? parseFloat(c.poids) : null,
          taille: c.taille ? parseFloat(c.taille) : null,
          tension_arterielle: c.tension_arterielle || null,
          frequence_cardiaque: c.frequence_cardiaque ? parseInt(c.frequence_cardiaque) : null
        }
      }
      return apiClient.patch<Consultation>(`/consultations/${selectedConsultation.id}/`, payload)
    },
    onSuccess: (res) => {
      setIsEditing(false)
      if (res?.data) {
        setSelectedConsultation(res.data)
      }
      queryClient.invalidateQueries({ queryKey: ["consultations"] })
      showNotification("success", "Consultation mise à jour avec succès.")
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de la modification de la consultation.")
      showNotification("error", msg)
    }
  })

  // Mutation création d'ordonnance liée
  const createPrescriptionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConsultation) return
      return apiClient.post("/prescriptions/", {
        consultation: selectedConsultation.id,
        ...prescriptionForm
      })
    },
    onSuccess: () => {
      setIsPrescriptionOpen(false)
      setPrescriptionForm({ medicaments: "", posologie: "", duree: "" })
      queryClient.invalidateQueries({ queryKey: ["ordonnances"] })
      queryClient.invalidateQueries({ queryKey: ["consultation-prescriptions"] })
      showNotification("success", "Ordonnance créée avec succès.")
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de la création de l'ordonnance.")
      showNotification("error", msg)
    }
  })

  // Prescriptions de la consultation sélectionnée
  const { data: consultationPrescriptions = [] } = useQuery({
    queryKey: ["consultation-prescriptions", selectedConsultation?.id],
    queryFn: async () => {
      if (!selectedConsultation?.id) return []
      const { data } = await apiClient.get<{ results: any[] }>(`/prescriptions/?consultation=${selectedConsultation.id}`)
      return data.results || []
    },
    enabled: Boolean(selectedConsultation?.id)
  })

  // Demandes d'examens médicaux de la consultation sélectionnée
  const { data: consultationExamens = [] } = useQuery({
    queryKey: ["consultation-examens", selectedConsultation?.id],
    queryFn: async () => {
      if (!selectedConsultation?.id) return []
      const { data } = await apiClient.get<{ results: any[] } | any[]>(
        `/examinations/?consultation=${selectedConsultation.id}`
      )
      return Array.isArray(data) ? data : ((data.results || []) as any[])
    },
    enabled: Boolean(selectedConsultation?.id)
  })

  const [isExamModalOpen, setIsExamModalOpen] = useState(false)
  const [examForm, setExamForm] = useState<{
    renseignements_cliniques: string
    lignes: Array<{
      nom_examen: string
      categorie: "BIOLOGIE" | "IMAGERIE" | "AUTRE"
      instructions: string
    }>
  }>({
    renseignements_cliniques: "",
    lignes: [{ nom_examen: "", categorie: "BIOLOGIE", instructions: "" }]
  })

  const createExamMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConsultation) throw new Error("Aucune consultation sélectionnée.")
      const validLignes = examForm.lignes
        .filter((l) => l.nom_examen.trim().length > 0)
        .map((l, index) => ({
          nom_examen: l.nom_examen.trim(),
          categorie: l.categorie,
          instructions: l.instructions.trim(),
          ordre: index + 1
        }))
      if (validLignes.length === 0) {
        throw new Error("Veuillez renseigner au moins un examen médical.")
      }
      const payload = {
        consultation: selectedConsultation.id,
        renseignements_cliniques: examForm.renseignements_cliniques.trim(),
        lignes: validLignes
      }
      const { data } = await apiClient.post("/examinations/", payload)
      return data
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["consultation-examens", selectedConsultation?.id] })
      queryClient.invalidateQueries({ queryKey: ["demandes-examens"] })
      setIsExamModalOpen(false)
      setExamForm({
        renseignements_cliniques: "",
        lignes: [{ nom_examen: "", categorie: "BIOLOGIE", instructions: "" }]
      })
      showNotification("success", `Demande d'examens ${data.numero} créée avec succès.`)
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de la création de la demande d'examens.")
      showNotification("error", msg)
    }
  })

  // Modal Facturation Médicaments
  const [factureMedModal, setFactureMedModal] = useState<{
    isOpen: boolean
    ordonnanceId: number
    patientId: number
    designation: string
    montant: string
  } | null>(null)

  const createFactureMedicamentsMutation = useMutation({
    mutationFn: async () => {
      if (!factureMedModal) return
      return apiClient.post("/billing/", {
        ordonnance: factureMedModal.ordonnanceId,
        patient: factureMedModal.patientId,
        type: "MEDICAMENTS",
        designation: factureMedModal.designation,
        actes: factureMedModal.designation,
        montant: Number(factureMedModal.montant)
      })
    },
    onSuccess: () => {
      setFactureMedModal(null)
      queryClient.invalidateQueries({ queryKey: ["factures"] })
      queryClient.invalidateQueries({ queryKey: ["consultation-prescriptions"] })
      showNotification("success", "Facture des médicaments créée avec succès.")
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de la création de la facture des médicaments.")
      showNotification("error", msg)
    }
  })

  function handlePrintPrescription(ord: any) {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const hasLignes = ord.lignes && ord.lignes.length > 0
    const numOrd = ord.numero || `ORD-${ord.id}`

    const lignesRows = hasLignes
      ? ord.lignes.map((l: any, index: number) => `
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
      `).join("")
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
                <div class="label">Patient(e)</div>
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

  function handlePrintExam(exam: any) {
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      alert("Veuillez autoriser les fenêtres pop-up pour imprimer la demande d'examens.")
      return
    }

    const numExam = exam.numero || `EXAM-#${exam.id}`
    const lignesRows = (exam.lignes && exam.lignes.length > 0)
      ? exam.lignes.map((l: any, idx: number) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 9px; text-align: center; color: #64748b; font-weight: bold;">${idx + 1}</td>
          <td style="padding: 9px; font-weight: 600; color: #0284c7;">
            ${l.categorie === 'BIOLOGIE' ? '🔬 Biologie' : (l.categorie === 'IMAGERIE' ? '🩻 Imagerie' : '📋 Exploration')}
          </td>
          <td style="padding: 9px; font-weight: 700; color: #0f172a;">${l.nom_examen}</td>
          <td style="padding: 9px; color: #475569;">${l.instructions || '—'}</td>
          <td style="padding: 9px; text-align: center;">
            <div style="width: 14px; height: 14px; border: 1.5px solid #94a3b8; border-radius: 3px; margin: 0 auto;"></div>
          </td>
        </tr>
      `).join("")
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
                <div class="label">Patient(e)</div>
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

          ${exam.renseignements_cliniques ? `
            <div class="clinical-box">
              <strong>Renseignements cliniques / Diagnostic d'orientation :</strong><br/>
              ${exam.renseignements_cliniques}
            </div>
          ` : ""}

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

  function handleOpenDetail(consultation: Consultation) {
    setSelectedConsultation(consultation)
    setIsEditing(false)
    setEditForm({
      motif: consultation.motif || "",
      observations: consultation.observations || "",
      diagnostic: consultation.diagnostic || "",
      compte_rendu: consultation.compte_rendu || "",
      date_controle_recommandee: consultation.date_controle_recommandee || "",
      motif_correction: "",
      constantes: {
        temperature: consultation.constantes?.temperature?.toString() || "",
        poids: consultation.constantes?.poids?.toString() || "",
        taille: consultation.constantes?.taille?.toString() || "",
        tension_arterielle: consultation.constantes?.tension_arterielle || "",
        frequence_cardiaque: consultation.constantes?.frequence_cardiaque?.toString() || ""
      }
    })
  }

  function handleResetFilters() {
    setSearch("")
    setDateDebut("")
    setDateFin("")
    setPage(1)
  }

  const isAuthor = currentUser?.role === "ADMIN" || currentUser?.is_superuser || (currentUser?.role === "MEDECIN" && selectedConsultation?.medecin === currentUser?.id)

  // Live BMI in edit form
  const editBmi = computeBMI(editForm.constantes.poids, editForm.constantes.taille)

  return (
    <div className="flex-1 flex flex-col">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium animate-in slide-in-from-top-2 duration-200 ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-800"
              : "bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950 dark:text-rose-100 dark:border-rose-800"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="size-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 text-muted-foreground hover:text-foreground"
          >
            <XCircle className="size-4" />
          </button>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Titre & En-tête */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20 dark:bg-primary/20">
                <FileText className="size-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2.5">
                  Consultations médicales
                  <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-foreground">
                    {data?.count ?? 0} dossiers
                  </span>
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Registre médical, constantes vitales, diagnostics et suivi des patients
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => refetch()}
              title="Rafraîchir les consultations"
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground"
            >
              <RefreshCw className={`size-4 ${isLoading ? "animate-spin text-primary" : ""}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
          </div>
        </div>

        {/* Cartes KPI Statistiques */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-2xl border-border/80 shadow-xs hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                <FileText className="size-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Consultations</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">{data?.count ?? 0}</p>
                <p className="text-[11px] text-muted-foreground truncate">Dossiers répertoriés</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/80 shadow-xs hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <Calendar className="size-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Aujourd&apos;hui</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">{todayCount}</p>
                <p className="text-[11px] text-muted-foreground truncate">Sur la page affichée</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/80 shadow-xs hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                <Activity className="size-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Constantes Vitales</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">{withVitalsCount}</p>
                <p className="text-[11px] text-muted-foreground truncate">Mesures enregistrées</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/80 shadow-xs hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                <Clock className="size-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Suivis Recommandés</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">{withControlCount}</p>
                <p className="text-[11px] text-muted-foreground truncate">Contrôles planifiés</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Barre de filtres et recherche */}
        <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden p-4 bg-card/60 backdrop-blur-xs">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Recherche textuelle */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher par nom de patient, motif, diagnostic..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>

            {/* Filtres par date */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <Calendar className="size-3.5 text-primary" />
                <span>Du :</span>
              </div>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => {
                  setDateDebut(e.target.value)
                  setPage(1)
                }}
                className="h-10 rounded-xl border border-border bg-background px-3 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium ml-1">
                <span>Au :</span>
              </div>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => {
                  setDateFin(e.target.value)
                  setPage(1)
                }}
                className="h-10 rounded-xl border border-border bg-background px-3 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />

              {(search || dateDebut || dateFin) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-10 rounded-xl text-xs gap-1.5 text-muted-foreground hover:text-foreground border-dashed"
                >
                  <FilterX className="size-3.5" /> Réinitialiser filtres
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Tableau des consultations */}
        <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-border/60 bg-muted/20 py-3.5 px-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <CardTitle className="text-base font-semibold">Registre des consultations</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">
              Page {page} sur {totalPages} ({data?.count ?? 0} résultat{(data?.count ?? 0) > 1 ? "s" : ""})
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                <RefreshCw className="mx-auto size-6 animate-spin mb-3 text-primary" />
                <p className="font-medium text-foreground">Chargement des dossiers médicaux…</p>
                <p className="text-xs text-muted-foreground mt-0.5">Veuillez patienter quelques instants</p>
              </div>
            ) : consultationsList.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground/60 mb-3">
                  <FileText className="size-7" />
                </div>
                <p className="font-semibold text-foreground text-base">Aucune consultation trouvée</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Aucun dossier médical ne correspond à vos critères de recherche. Essayez de réinitialiser les filtres.
                </p>
                {(search || dateDebut || dateFin) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetFilters}
                    className="mt-4 rounded-xl text-xs"
                  >
                    Effacer les filtres
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-6">Date & Heure</th>
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4">Médecin</th>
                      <th className="py-3 px-4">Motif &amp; Diagnostic</th>
                      <th className="py-3 px-4">Indicateurs</th>
                      <th className="py-3 px-4">Paiement</th>
                      <th className="py-3 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {consultationsList.map((c) => {
                      const hasVitals = Boolean(
                        c.constantes && (
                          c.constantes.temperature ||
                          c.constantes.tension_arterielle ||
                          c.constantes.frequence_cardiaque ||
                          c.constantes.poids ||
                          c.constantes.taille
                        )
                      )
                      const hasControl = Boolean(c.date_controle_recommandee)
                      const initials = getInitials(c.patient_nom, c.patient_prenom)

                      return (
                        <tr 
                          key={c.id} 
                          onClick={() => handleOpenDetail(c)}
                          className="transition-colors hover:bg-muted/40 cursor-pointer group"
                        >
                          {/* Date & Heure */}
                          <td className="py-3.5 px-6 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Calendar className="size-4" />
                              </div>
                              <div>
                                <span className="font-semibold text-foreground block">
                                  {new Date(c.date_consultation).toLocaleDateString("fr-FR", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="size-3" />
                                  {new Date(c.date_consultation).toLocaleTimeString("fr-FR", {
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Patient */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs ring-2 ring-primary/20">
                                {initials}
                              </div>
                              <div>
                                <span className="font-semibold text-foreground group-hover:text-primary transition-colors block">
                                  {c.patient_nom} {c.patient_prenom}
                                </span>
                                <span className="text-[11px] text-muted-foreground block">
                                  {c.patient_contact ? c.patient_contact : "Sans contact renseigné"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Médecin */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground border border-border/50">
                              <Stethoscope className="size-3.5 text-primary" />
                              <span>{c.medecin_nom}</span>
                            </div>
                          </td>

                          {/* Motif & Diagnostic */}
                          <td className="py-3.5 px-4 max-w-[240px]">
                            <div className="truncate font-medium text-foreground text-xs" title={c.motif}>
                              {c.motif || "Motif non précisé"}
                            </div>
                            <div className="truncate text-[11px] text-muted-foreground mt-0.5" title={c.diagnostic}>
                              <span className="font-medium text-slate-700 dark:text-slate-300">Diag : </span>
                              {c.diagnostic || "En attente"}
                            </div>
                          </td>

                          {/* Indicateurs (Constantes, Contrôle) */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1 items-start">
                              {hasVitals ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                                  <Activity className="size-3" /> Constantes
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground/60 italic">Sans constantes</span>
                              )}

                              {hasControl && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800">
                                  <Calendar className="size-3" /> Suivi prévu
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Statut Paiement */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {c.statut_paiement === "PAYE" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400">
                                <CheckCircle2 className="size-3" /> Payé
                              </span>
                            )}
                            {c.statut_paiement === "IMPAYE" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-400">
                                <AlertCircle className="size-3" /> Impayé
                              </span>
                            )}
                            {(!c.statut_paiement || c.statut_paiement === "GRATUIT") && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300">
                                Gratuit
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-6 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDetail(c)}
                              className="rounded-xl h-8 px-3 gap-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground border-primary/30 transition-all shadow-2xs"
                            >
                              <Eye className="size-3.5" /> Consulter
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {data && data.count > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/60 px-6 py-4 bg-muted/10 text-xs text-muted-foreground">
                <div>
                  Page <strong className="text-foreground">{page}</strong> sur <strong className="text-foreground">{totalPages}</strong> ({data.count} consultation{data.count > 1 ? "s" : ""})
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 gap-1.5 rounded-xl text-xs"
                  >
                    <ChevronLeft className="size-3.5" /> Précédent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 gap-1.5 rounded-xl text-xs"
                  >
                    Suivant <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* MODAL VUE DÉTAIL D'UNE CONSULTATION (DOSSIER MÉDICAL COMPLET) */}
      {selectedConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-3xl rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Entête du Dossier Médical */}
            <div className="flex items-start justify-between border-b border-border/60 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="flex size-13 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-lg ring-2 ring-primary/20">
                  {getInitials(selectedConsultation.patient_nom, selectedConsultation.patient_prenom)}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-xl font-bold text-foreground">
                      {selectedConsultation.patient_nom} {selectedConsultation.patient_prenom}
                    </h3>
                    {selectedConsultation.statut_paiement === "PAYE" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400">
                        <CheckCircle2 className="size-3" /> Payé
                      </span>
                    )}
                    {selectedConsultation.statut_paiement === "IMPAYE" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-400">
                        Impayé
                      </span>
                    )}
                    {(!selectedConsultation.statut_paiement || selectedConsultation.statut_paiement === "GRATUIT") && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300">
                        Contrôle gratuit
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Stethoscope className="size-3.5 text-primary" />
                      {selectedConsultation.medecin_nom}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5 text-primary" />
                      {new Date(selectedConsultation.date_consultation).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                    {selectedConsultation.patient_date_naissance && (
                      <>
                        <span>•</span>
                        <span>
                          {computeAge(selectedConsultation.patient_date_naissance)} ans (né le {new Date(selectedConsultation.patient_date_naissance).toLocaleDateString("fr-FR")})
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedConsultation(null)
                  setIsEditing(false)
                }}
                className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            {isEditing ? (
              /* FORMULAIRE DE MODIFICATION TRAÇABLE */
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  updateMutation.mutate()
                }}
                className="mt-6 space-y-5 text-sm"
              >
                {/* Avertissement Traçabilité Médicale */}
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold">
                    <ShieldAlert className="size-5 text-amber-600 shrink-0" />
                    <span>Modification réglementée du dossier médical</span>
                  </div>
                  <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                    Conformément aux exigences de traçabilité médico-légale, toute modification d&apos;une consultation validée fait l&apos;objet d&apos;un enregistrement horodaté dans l&apos;audit trail avec consignation de l&apos;auteur et des anciennes valeurs.
                  </p>
                  <div className="pt-2">
                    <Label htmlFor="edit-motif-correction" className="text-xs font-bold text-amber-950 dark:text-amber-200">
                      Motif obligatoire de la correction / addenda *
                    </Label>
                    <Input
                      id="edit-motif-correction"
                      required
                      placeholder="Ex : Réévaluation diagnostique après examen radiologique, ajustement du traitement..."
                      value={editForm.motif_correction}
                      onChange={(e) => setEditForm(prev => ({ ...prev, motif_correction: e.target.value }))}
                      className="mt-1 bg-background"
                    />
                  </div>
                </div>

                {/* Motif & Diagnostic */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-motif">Motif de consultation *</Label>
                    <Input
                      id="edit-motif"
                      required
                      value={editForm.motif}
                      onChange={(e) => setEditForm(prev => ({ ...prev, motif: e.target.value }))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-diag">Diagnostic *</Label>
                    <textarea
                      id="edit-diag"
                      required
                      rows={3}
                      value={editForm.diagnostic}
                      onChange={(e) => setEditForm(prev => ({ ...prev, diagnostic: e.target.value }))}
                      className="mt-1 flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring font-medium"
                    />
                  </div>
                </div>

                {/* Constantes Physiologiques avec IMC interactif */}
                <div className="rounded-2xl border border-border/70 p-4 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Activity className="size-4 text-primary" /> Constantes physiologiques
                    </Label>
                    {editBmi && (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${editBmi.color}`}>
                        IMC : {editBmi.val} kg/m² ({editBmi.label})
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                      <span className="text-[11px] font-medium text-muted-foreground block mb-1">Température (°C)</span>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="37.0"
                        value={editForm.constantes.temperature}
                        onChange={(e) => setEditForm(prev => ({
                          ...prev,
                          constantes: { ...prev.constantes, temperature: e.target.value }
                        }))}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-muted-foreground block mb-1">Tension (ex: 120/80)</span>
                      <Input
                        placeholder="120/80"
                        value={editForm.constantes.tension_arterielle}
                        onChange={(e) => setEditForm(prev => ({
                          ...prev,
                          constantes: { ...prev.constantes, tension_arterielle: e.target.value }
                        }))}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-muted-foreground block mb-1">Fréq. card. (bpm)</span>
                      <Input
                        type="number"
                        placeholder="72"
                        value={editForm.constantes.frequence_cardiaque}
                        onChange={(e) => setEditForm(prev => ({
                          ...prev,
                          constantes: { ...prev.constantes, frequence_cardiaque: e.target.value }
                        }))}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-muted-foreground block mb-1">Poids (kg)</span>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="70.0"
                        value={editForm.constantes.poids}
                        onChange={(e) => setEditForm(prev => ({
                          ...prev,
                          constantes: { ...prev.constantes, poids: e.target.value }
                        }))}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-muted-foreground block mb-1">Taille (cm)</span>
                      <Input
                        type="number"
                        step="0.5"
                        placeholder="175"
                        value={editForm.constantes.taille}
                        onChange={(e) => setEditForm(prev => ({
                          ...prev,
                          constantes: { ...prev.constantes, taille: e.target.value }
                        }))}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Observations & Compte-rendu */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-obs">Observations cliniques</Label>
                    <textarea
                      id="edit-obs"
                      rows={3}
                      value={editForm.observations}
                      onChange={(e) => setEditForm(prev => ({ ...prev, observations: e.target.value }))}
                      className="mt-1 flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-cr">Compte-rendu médical</Label>
                    <textarea
                      id="edit-cr"
                      rows={3}
                      value={editForm.compte_rendu}
                      onChange={(e) => setEditForm(prev => ({ ...prev, compte_rendu: e.target.value }))}
                      className="mt-1 flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>

                {/* Date de contrôle recommandée */}
                <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 space-y-1.5">
                  <Label htmlFor="edit-date-ctrl" className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <Calendar className="size-4 text-blue-600" /> Date de contrôle recommandée (indicative)
                  </Label>
                  <Input
                    id="edit-date-ctrl"
                    type="date"
                    value={editForm.date_controle_recommandee}
                    onChange={(e) => setEditForm(prev => ({ ...prev, date_controle_recommandee: e.target.value }))}
                    className="max-w-xs bg-background"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Sélectionnez une date précise sur le calendrier. Cette mention est indicative et ne bloque aucun créneau automatique.
                  </p>
                </div>

                {/* Actions du formulaire */}
                <div className="flex justify-end gap-3 pt-5 border-t border-border/60">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="rounded-xl">
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending || !editForm.motif_correction.trim()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
                  >
                    {updateMutation.isPending ? "Enregistrement..." : "Enregistrer la modification"}
                  </Button>
                </div>
              </form>
            ) : (
              /* AFFICHAGE DU DOSSIER MÉDICAL */
              <div className="mt-6 space-y-6 text-sm">
                {/* 1. Alerte Médicale Prioritaire : Allergies & Antécédents */}
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                    <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                    Dossier médical patient — Alertes cliniques
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-background/90 p-3 rounded-xl border border-border/60 shadow-2xs">
                      <span className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1 mb-1">
                        <AlertCircle className="size-3.5" /> Allergies signalées :
                      </span>
                      <span className="text-foreground font-medium">
                        {selectedConsultation.patient_allergies || <span className="italic text-muted-foreground font-normal">Aucune allergie connue répertoriée</span>}
                      </span>
                    </div>
                    <div className="bg-background/90 p-3 rounded-xl border border-border/60 shadow-2xs">
                      <span className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1 mb-1">
                        <FileText className="size-3.5" /> Antécédents médicaux :
                      </span>
                      <span className="text-foreground font-medium">
                        {selectedConsultation.patient_antecedents || <span className="italic text-muted-foreground font-normal">Aucun antécédent médical répertorié</span>}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Constantes Physiologiques & IMC */}
                {selectedConsultation.constantes && (
                  <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="size-4 text-primary" /> Constantes physiologiques de la visite
                      </span>
                      {(() => {
                        const bmi = computeBMI(selectedConsultation.constantes.poids, selectedConsultation.constantes.taille)
                        return bmi ? (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${bmi.color}`}>
                            IMC : {bmi.val} kg/m² ({bmi.label})
                          </span>
                        ) : null
                      })()}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {/* Température */}
                      <div className="bg-muted/30 p-3 rounded-xl border border-border/60 text-center">
                        <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground mb-1">
                          <Thermometer className="size-3 text-rose-500" />
                          <span>Température</span>
                        </div>
                        <span className="text-base font-bold text-foreground">
                          {selectedConsultation.constantes.temperature ? `${selectedConsultation.constantes.temperature} °C` : "—"}
                        </span>
                      </div>

                      {/* Tension artérielle */}
                      <div className="bg-muted/30 p-3 rounded-xl border border-border/60 text-center">
                        <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground mb-1">
                          <Activity className="size-3 text-primary" />
                          <span>Tension</span>
                        </div>
                        <span className="text-base font-bold text-foreground">
                          {selectedConsultation.constantes.tension_arterielle || "—"}
                        </span>
                      </div>

                      {/* Pouls */}
                      <div className="bg-muted/30 p-3 rounded-xl border border-border/60 text-center">
                        <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground mb-1">
                          <Heart className="size-3 text-rose-500" />
                          <span>Fréq. card.</span>
                        </div>
                        <span className="text-base font-bold text-foreground">
                          {selectedConsultation.constantes.frequence_cardiaque ? `${selectedConsultation.constantes.frequence_cardiaque} bpm` : "—"}
                        </span>
                      </div>

                      {/* Poids */}
                      <div className="bg-muted/30 p-3 rounded-xl border border-border/60 text-center">
                        <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground mb-1">
                          <Scale className="size-3 text-amber-500" />
                          <span>Poids</span>
                        </div>
                        <span className="text-base font-bold text-foreground">
                          {selectedConsultation.constantes.poids ? `${selectedConsultation.constantes.poids} kg` : "—"}
                        </span>
                      </div>

                      {/* Taille */}
                      <div className="bg-muted/30 p-3 rounded-xl border border-border/60 text-center">
                        <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground mb-1">
                          <User className="size-3 text-blue-500" />
                          <span>Taille</span>
                        </div>
                        <span className="text-base font-bold text-foreground">
                          {selectedConsultation.constantes.taille ? `${selectedConsultation.constantes.taille} cm` : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Recommandation de Suivi / Contrôle Médical */}
                {selectedConsultation.date_controle_recommandee && (
                  <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400">
                        <Calendar className="size-5" />
                      </div>
                      <div>
                        <span className="font-bold text-foreground text-sm block">
                          Date de contrôle recommandée : {new Date(selectedConsultation.date_controle_recommandee).toLocaleDateString("fr-FR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric"
                          })}
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Recommandation médicale à titre indicatif. Le patient peut revenir sans réservation préalable.
                        </p>
                      </div>
                    </div>
                    <span className="hidden sm:inline-flex rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                      Suivi prévu
                    </span>
                  </div>
                )}

                {/* 4. Examen Clinique & Diagnostic */}
                <div className="grid grid-cols-1 gap-4">
                  {/* Motif de consultation */}
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4 space-y-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                      Motif de la consultation
                    </span>
                    <p className="text-base font-semibold text-foreground">
                      {selectedConsultation.motif}
                    </p>
                  </div>

                  {/* Diagnostic */}
                  <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                      <Sparkles className="size-3.5" />
                      Conclusion Diagnostique
                    </div>
                    <p className="text-base font-bold text-foreground whitespace-pre-wrap">
                      {selectedConsultation.diagnostic || <span className="italic font-normal text-muted-foreground">Aucun diagnostic saisi</span>}
                    </p>
                  </div>

                  {/* Observations Cliniques & Compte-rendu */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-1">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                        Observations cliniques
                      </span>
                      <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                        {selectedConsultation.observations || <span className="italic text-muted-foreground">Aucune observation consignée</span>}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-1">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                        Compte-rendu médical
                      </span>
                      <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                        {selectedConsultation.compte_rendu || <span className="italic text-muted-foreground">Aucun compte-rendu spécifique</span>}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 5. Prescriptions et Ordonnances */}
                <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Pill className="size-4 text-primary" />
                      Ordonnances et Prescriptions ({consultationPrescriptions.length})
                    </h4>

                    {(currentUser?.role === "MEDECIN" || currentUser?.role === "ADMIN") && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setIsPrescriptionOpen(true)}
                        className="h-7 text-xs px-2.5 gap-1.5 text-primary border-primary/30 hover:bg-primary/10 rounded-lg"
                      >
                        <FileSignature className="size-3.5" /> Nouvelle ordonnance
                      </Button>
                    )}
                  </div>

                  {consultationPrescriptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">
                      Aucune ordonnance n&apos;a été délivrée lors de cette consultation.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {consultationPrescriptions.map((ord: any) => (
                        <div key={ord.id} className="rounded-xl border border-border/80 bg-muted/20 p-3.5 text-xs space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                {ord.numero || `Ordonnance n°${ord.id}`}
                              </span>
                              {ord.statut === "ACTIVE" && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Active</span>
                              )}
                              {ord.statut === "MODIFIEE" && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">Modifiée</span>
                              )}
                              {ord.statut === "ANNULEE" && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">Annulée</span>
                              )}
                              <span className="text-muted-foreground font-normal text-[11px]">
                                Émise le {new Date(ord.date_creation).toLocaleDateString("fr-FR")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handlePrintPrescription(ord)}
                                className="h-7 text-xs px-2.5 gap-1 rounded-lg"
                              >
                                <Printer className="size-3" /> Imprimer
                              </Button>
                              {(currentUser?.role === "ADMIN" || currentUser?.role === "SECRETAIRE") && !ord.facture_id && ord.statut !== "ANNULEE" && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setFactureMedModal({
                                    isOpen: true,
                                    ordonnanceId: ord.id,
                                    patientId: selectedConsultation.patient,
                                    designation: `Médicaments ordonnance ${ord.numero || ord.id}`,
                                    montant: ""
                                  })}
                                  className="h-7 text-xs px-2.5 gap-1 text-emerald-700 hover:bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:hover:bg-emerald-950/40 rounded-lg"
                                >
                                  Facturer médicaments
                                </Button>
                              )}
                              {ord.facture_statut === "PAYEE" && (
                                <span className="text-[10px] text-emerald-600 font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30">
                                  ✓ Facture payée
                                </span>
                              )}
                              {ord.facture_statut === "IMPAYEE" && (
                                <span className="text-[10px] text-amber-600 font-semibold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30">
                                  ⏳ Facture impayée
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="bg-background/80 p-2.5 rounded-lg border border-border/50 font-mono text-foreground whitespace-pre-wrap">
                            {ord.medicaments}
                          </div>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                            <span><strong>Posologie :</strong> {ord.posologie}</span>
                            <span>•</span>
                            <span><strong>Durée :</strong> {ord.duree}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5b. Demandes d'Examens Médicaux (Biologie & Imagerie) */}
                <div className="rounded-2xl border border-border/60 bg-muted/15 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FlaskConical className="size-4 text-sky-600 dark:text-sky-400" />
                      Demandes d&apos;examens médicaux ({consultationExamens.length})
                    </h4>

                    {(currentUser?.role === "MEDECIN" || currentUser?.role === "ADMIN") && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setExamForm({
                            renseignements_cliniques: "",
                            lignes: [{ nom_examen: "", categorie: "BIOLOGIE", instructions: "" }]
                          })
                          setIsExamModalOpen(true)
                        }}
                        className="h-7 text-xs px-2.5 gap-1.5 text-sky-600 border-sky-300 hover:bg-sky-50 dark:text-sky-400 dark:border-sky-800 dark:hover:bg-sky-950/40 rounded-lg"
                      >
                        <Plus className="size-3.5" /> Nouvelle demande d&apos;examens
                      </Button>
                    )}
                  </div>

                  {consultationExamens.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">
                      Aucune demande d&apos;examens prescrite lors de cette consultation.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {consultationExamens.map((exam: any) => (
                        <div key={exam.id} className="rounded-xl border border-sky-200/70 dark:border-sky-900/60 bg-sky-50/20 dark:bg-sky-950/10 p-3.5 text-xs space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                                {exam.numero || `Demande n°${exam.id}`}
                              </span>
                              {exam.statut === "ACTIVE" && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Active</span>
                              )}
                              {exam.statut === "MODIFIEE" && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">Modifiée</span>
                              )}
                              {exam.statut === "ANNULEE" && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">Annulée</span>
                              )}
                              <span className="text-muted-foreground font-normal text-[11px]">
                                Émise le {new Date(exam.date_creation).toLocaleDateString("fr-FR")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handlePrintExam(exam)}
                                className="h-7 text-xs px-2.5 gap-1 rounded-lg border-sky-300 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300"
                              >
                                <Printer className="size-3" /> Imprimer
                              </Button>
                            </div>
                          </div>

                          {exam.renseignements_cliniques && (
                            <div className="text-[11px] text-muted-foreground bg-background/60 p-2 rounded-lg border border-border/40">
                              <strong className="text-foreground">Renseignements :</strong> {exam.renseignements_cliniques}
                            </div>
                          )}

                          <div className="space-y-1.5">
                            {(exam.lignes || []).map((l: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded-md bg-background/80 border border-border/40">
                                <span className="font-semibold text-foreground flex items-center gap-1.5">
                                  <span>{l.categorie === 'BIOLOGIE' ? '🔬' : (l.categorie === 'IMAGERIE' ? '🩻' : '📋')}</span>
                                  {l.nom_examen}
                                </span>
                                {l.instructions && (
                                  <span className="text-[11px] text-muted-foreground italic">
                                    {l.instructions}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="text-[10px] text-muted-foreground italic">
                            Examens réalisés auprès d&apos;un prestataire externe agréé (non facturés en interne).
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 6. Historique des Modifications (Audit Trail) */}
                {selectedConsultation.historique && selectedConsultation.historique.length > 0 && (
                  <div className="rounded-2xl border border-border/60 bg-muted/15 p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <History className="size-4 text-amber-600" />
                      Historique des modifications &amp; Traçabilité ({selectedConsultation.historique.length})
                    </h4>
                    <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                      {selectedConsultation.historique.map((h) => (
                        <div key={h.id} className="rounded-xl border border-border/60 bg-card p-3 text-xs space-y-1.5 shadow-2xs">
                          <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                            <span className="font-semibold text-foreground flex items-center gap-1">
                              <User className="size-3 text-primary" /> Modifié par {h.auteur_nom}
                            </span>
                            <span>{new Date(h.date_modification).toLocaleString("fr-FR")}</span>
                          </div>
                          <div className="text-foreground">
                            <span className="font-semibold text-amber-700 dark:text-amber-400">Justification : </span>
                            {h.motif_correction}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex flex-wrap gap-1">
                            <span className="font-medium">Champs modifiés :</span>
                            {h.champs_modifies.map((champ, idx) => (
                              <span key={idx} className="rounded-md bg-muted px-1.5 py-0.2 text-[10px] font-mono">
                                {champ}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions de fermeture et d'édition */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-border/60">
                  <div>
                    {isAuthor && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditForm({
                            motif: selectedConsultation.motif || "",
                            observations: selectedConsultation.observations || "",
                            diagnostic: selectedConsultation.diagnostic || "",
                            compte_rendu: selectedConsultation.compte_rendu || "",
                            date_controle_recommandee: selectedConsultation.date_controle_recommandee || "",
                            motif_correction: "",
                            constantes: {
                              temperature: selectedConsultation.constantes?.temperature?.toString() || "",
                              poids: selectedConsultation.constantes?.poids?.toString() || "",
                              taille: selectedConsultation.constantes?.taille?.toString() || "",
                              tension_arterielle: selectedConsultation.constantes?.tension_arterielle || "",
                              frequence_cardiaque: selectedConsultation.constantes?.frequence_cardiaque?.toString() || ""
                            }
                          })
                          setIsEditing(true)
                        }}
                        className="flex items-center gap-1.5 rounded-xl text-xs font-semibold"
                      >
                        <Edit className="size-3.5" /> Modifier cette consultation
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => setSelectedConsultation(null)}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold px-4"
                    >
                      Fermer le dossier
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL CRÉATION ORDONNANCE */}
      {isPrescriptionOpen && selectedConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileSignature className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Rédiger une ordonnance
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Patient : <strong className="text-foreground">{selectedConsultation.patient_nom} {selectedConsultation.patient_prenom}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrescriptionOpen(false)}
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createPrescriptionMutation.mutate()
              }}
              className="mt-5 space-y-4"
            >
              <div>
                <Label htmlFor="page-presc-medicaments">Médicaments prescrits * (un médicament par ligne)</Label>
                <textarea
                  id="page-presc-medicaments"
                  required
                  rows={4}
                  placeholder="Ex : Paracétamol 1g comprimé&#10;Amoxicilline 500mg gélule"
                  value={prescriptionForm.medicaments}
                  onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, medicaments: e.target.value }))}
                  className="mt-1 flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                />
              </div>

              <div>
                <Label htmlFor="page-presc-posologie">Posologie détaillée *</Label>
                <textarea
                  id="page-presc-posologie"
                  required
                  rows={3}
                  placeholder="Ex : 1 comprimé matin, midi et soir au milieu des repas"
                  value={prescriptionForm.posologie}
                  onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, posologie: e.target.value }))}
                  className="mt-1 flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <Label htmlFor="page-presc-duree">Durée du traitement *</Label>
                <Input
                  id="page-presc-duree"
                  required
                  placeholder="Ex : 7 jours"
                  value={prescriptionForm.duree}
                  onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, duree: e.target.value }))}
                  className="mt-1 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
                <Button type="button" variant="outline" onClick={() => setIsPrescriptionOpen(false)} className="rounded-xl">
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={createPrescriptionMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
                >
                  {createPrescriptionMutation.isPending ? "Enregistrement..." : "Valider l'ordonnance"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FACTURATION MÉDICAMENTS (SECRÉTAIRE / ADMIN) */}
      {factureMedModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <FileSignature className="size-5 text-emerald-600" />
                Créer la facture des médicaments
              </h3>
              <button
                type="button"
                onClick={() => setFactureMedModal(null)}
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createFactureMedicamentsMutation.mutate()
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <Label htmlFor="facture-med-desig">Désignation *</Label>
                <Input
                  id="facture-med-desig"
                  required
                  value={factureMedModal.designation}
                  onChange={(e) => setFactureMedModal(prev => prev ? { ...prev, designation: e.target.value } : null)}
                  placeholder="Ex: Médicaments, ordonnance n°12"
                  className="mt-1 rounded-xl"
                />
              </div>

              <div>
                <Label htmlFor="facture-med-montant">Montant total (Ar) *</Label>
                <Input
                  id="facture-med-montant"
                  type="number"
                  required
                  min="0"
                  step="500"
                  value={factureMedModal.montant}
                  onChange={(e) => setFactureMedModal(prev => prev ? { ...prev, montant: e.target.value } : null)}
                  placeholder="Ex: 35000"
                  className="mt-1 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFactureMedModal(null)}
                  className="rounded-xl"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={createFactureMedicamentsMutation.isPending || !factureMedModal.montant}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
                >
                  {createFactureMedicamentsMutation.isPending ? "Création..." : "Enregistrer la facture"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CRÉATION DE DEMANDE D'EXAMENS MÉDICAUX */}
      {isExamModalOpen && selectedConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300">
                  <FlaskConical className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Prescrire des examens médicaux
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Patient : <strong className="text-foreground">{selectedConsultation.patient_nom} {selectedConsultation.patient_prenom}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExamModalOpen(false)}
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createExamMutation.mutate()
              }}
              className="mt-5 space-y-4"
            >
              <div>
                <Label htmlFor="modal-exam-renseignements" className="font-semibold text-xs">
                  Renseignements cliniques indicatifs pour le biologiste / radiologue
                </Label>
                <textarea
                  id="modal-exam-renseignements"
                  rows={2}
                  placeholder="Ex : Suspicion de foyer infectieux, bilan préopératoire, fièvre prolongée..."
                  value={examForm.renseignements_cliniques}
                  onChange={(e) => setExamForm((prev) => ({ ...prev, renseignements_cliniques: e.target.value }))}
                  className="mt-1 flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-xs flex items-center gap-1.5">
                    <Microscope className="size-3.5 text-sky-600" /> Examens prescrits ({examForm.lignes.length}) *
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setExamForm((prev) => ({
                        ...prev,
                        lignes: [...prev.lignes, { nom_examen: "", categorie: "BIOLOGIE", instructions: "" }]
                      }))
                    }}
                    className="h-7 text-xs rounded-lg gap-1 border-sky-300 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300"
                  >
                    <Plus className="size-3.5" /> Ajouter un examen
                  </Button>
                </div>

                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {examForm.lignes.map((ligne, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-muted-foreground">Examen #{idx + 1}</span>
                        {examForm.lignes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setExamForm((prev) => ({
                                ...prev,
                                lignes: prev.lignes.filter((_, i) => i !== idx)
                              }))
                            }}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div className="md:col-span-2">
                          <Input
                            required
                            placeholder="Nom de l'examen (ex: NFS + CRP, Radio thorax)"
                            value={ligne.nom_examen}
                            onChange={(e) => {
                              const val = e.target.value
                              setExamForm((prev) => {
                                const next = [...prev.lignes]
                                next[idx] = { ...next[idx], nom_examen: val }
                                return { ...prev, lignes: next }
                              })
                            }}
                            className="h-8 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <select
                            value={ligne.categorie}
                            onChange={(e) => {
                              const val = e.target.value as any
                              setExamForm((prev) => {
                                const next = [...prev.lignes]
                                next[idx] = { ...next[idx], categorie: val }
                                return { ...prev, lignes: next }
                              })
                            }}
                            className="flex w-full h-8 rounded-lg border border-input bg-background px-2 text-xs"
                          >
                            <option value="BIOLOGIE">🔬 Biologie</option>
                            <option value="IMAGERIE">🩻 Imagerie</option>
                            <option value="AUTRE">📋 Autre</option>
                          </select>
                        </div>
                      </div>

                      <Input
                        placeholder="Précautions / Instructions (ex: à jeun, vessie pleine...)"
                        value={ligne.instructions}
                        onChange={(e) => {
                          const val = e.target.value
                          setExamForm((prev) => {
                            const next = [...prev.lignes]
                            next[idx] = { ...next[idx], instructions: val }
                            return { ...prev, lignes: next }
                          })
                        }}
                        className="h-8 rounded-lg text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsExamModalOpen(false)}
                  className="rounded-xl"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={createExamMutation.isPending}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl"
                >
                  {createExamMutation.isPending ? "Prescription..." : "Valider la demande d'examens"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

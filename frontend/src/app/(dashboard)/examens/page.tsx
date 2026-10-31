"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { CurrentUser } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { 
  FlaskConical, 
  Search, 
  RefreshCw, 
  Calendar, 
  User, 
  Stethoscope, 
  Plus, 
  Printer, 
  XCircle, 
  CheckCircle2, 
  AlertCircle, 
  Pencil, 
  Ban, 
  History, 
  Trash2, 
  FileText, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  Activity,
  Microscope,
  ScanLine
} from "lucide-react"

export interface LigneDemandeExamen {
  id?: number
  nom_examen: string
  categorie: "BIOLOGIE" | "IMAGERIE" | "AUTRE"
  categorie_display?: string
  instructions?: string
  ordre?: number
}

export interface DemandeExamenHistorique {
  id: number
  auteur_nom: string
  date_modification: string
  motif_correction: string
  champs_modifies: string[]
  anciennes_lignes: LigneDemandeExamen[]
  nouvelles_lignes: LigneDemandeExamen[]
}

export interface DemandeExamen {
  id: number
  numero: string
  statut: "ACTIVE" | "MODIFIEE" | "ANNULEE"
  consultation: number
  patient?: number
  patient_id?: number
  patient_nom: string
  patient_prenom: string
  patient_date_naissance?: string
  patient_contact?: string
  medecin_id?: number
  medecin_nom: string
  medecin_specialite?: string
  medecin_numero_ordre?: string
  renseignements_cliniques?: string
  lignes?: LigneDemandeExamen[]
  historique?: DemandeExamenHistorique[]
  date_creation: string
  date_modification?: string
}

interface Consultation {
  id: number
  patient: number
  patient_nom: string
  patient_prenom: string
  medecin: number
  medecin_nom: string
  motif: string
  date_consultation: string
}

const CATEGORIES_EXAMEN = [
  { value: "BIOLOGIE", label: "Analyse biologique / Laboratoire", icon: "🔬" },
  { value: "IMAGERIE", label: "Imagerie médicale / Radiologie", icon: "🩻" },
  { value: "AUTRE", label: "Autre examen / Exploration", icon: "📋" }
]

function getAge(dateNaissanceStr?: string): string {
  if (!dateNaissanceStr) return ""
  const birthDate = new Date(dateNaissanceStr)
  if (isNaN(birthDate.getTime())) return ""
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return `${age} ans`
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
          if (Array.isArray(first) && first.length > 0) return String(first[0])
          if (typeof first === "string") return first
        }
      }
    }
  }
  return fallback
}

export default function ExamensPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [filterStatut, setFilterStatut] = useState<string>("ALL")
  const [filterCategorie, setFilterCategorie] = useState<string>("ALL")
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editModal, setEditModal] = useState<{
    isOpen: boolean
    demande: DemandeExamen | null
    motif_correction: string
    renseignements_cliniques: string
    lignes: LigneDemandeExamen[]
  }>({
    isOpen: false,
    demande: null,
    motif_correction: "",
    renseignements_cliniques: "",
    lignes: []
  })
  const [historyModal, setHistoryModal] = useState<{
    isOpen: boolean
    demande: DemandeExamen | null
  }>({
    isOpen: false,
    demande: null
  })
  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean
    demande: DemandeExamen | null
    motif: string
  }>({
    isOpen: false,
    demande: null,
    motif: ""
  })
  const [expandedExamId, setExpandedExamId] = useState<number | null>(null)

  // Dynamic lines state for creation
  const [formConsultation, setFormConsultation] = useState("")
  const [formRenseignements, setFormRenseignements] = useState("")
  const [formLignes, setFormLignes] = useState<LigneDemandeExamen[]>([
    {
      nom_examen: "",
      categorie: "BIOLOGIE",
      instructions: ""
    }
  ])

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
    queryKey: ["demandes-examens", search, filterStatut, filterCategorie],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (filterStatut && filterStatut !== "ALL") params.append("statut", filterStatut)
      if (filterCategorie && filterCategorie !== "ALL") params.append("categorie", filterCategorie)
      const { data } = await apiClient.get<{ results: DemandeExamen[] } | DemandeExamen[]>(
        `/examinations/?${params.toString()}`
      )
      return Array.isArray(data) ? data : ((data.results || []) as DemandeExamen[])
    },
  })

  const { data: consultations } = useQuery({
    queryKey: ["consultations_list_for_exam"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: Consultation[] } | Consultation[]>(`/consultations/`)
      return Array.isArray(data) ? data : ((data.results || []) as Consultation[])
    },
    enabled: isCreateOpen
  })

  // Helpers for dynamic lines
  const addLine = () => {
    setFormLignes((prev) => [
      ...prev,
      {
        nom_examen: "",
        categorie: "BIOLOGIE",
        instructions: ""
      }
    ])
  }

  const updateLine = (index: number, field: keyof LigneDemandeExamen, value: string) => {
    setFormLignes((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const removeLine = (index: number) => {
    if (formLignes.length <= 1) return
    setFormLignes((prev) => prev.filter((_, i) => i !== index))
  }

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!formConsultation) {
        throw new Error("Veuillez sélectionner une consultation.")
      }
      const validLignes = formLignes
        .filter((l) => l.nom_examen.trim().length > 0)
        .map((l, index) => ({
          nom_examen: l.nom_examen.trim(),
          categorie: l.categorie,
          instructions: l.instructions?.trim() || "",
          ordre: index + 1
        }))

      if (validLignes.length === 0) {
        throw new Error("Veuillez spécifier au moins un examen médical.")
      }

      const payload = {
        consultation: parseInt(formConsultation, 10),
        renseignements_cliniques: formRenseignements.trim(),
        lignes: validLignes
      }

      const { data } = await apiClient.post("/examinations/", payload)
      return data
    },
    onSuccess: (newExam) => {
      queryClient.invalidateQueries({ queryKey: ["demandes-examens"] })
      setIsCreateOpen(false)
      setFormConsultation("")
      setFormRenseignements("")
      setFormLignes([
        {
          nom_examen: "",
          categorie: "BIOLOGIE",
          instructions: ""
        }
      ])
      showNotification("success", `Demande d'examens ${newExam.numero} créée avec succès.`)
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de la création de la demande.")
      showNotification("error", msg)
    }
  })

  // Edit Mutation
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editModal.demande) return
      const motif = editModal.motif_correction.trim()
      if (!motif) {
        throw new Error("Le motif de correction est obligatoire.")
      }

      const validLignes = editModal.lignes
        .filter((l) => l.nom_examen.trim().length > 0)
        .map((l, index) => ({
          nom_examen: l.nom_examen.trim(),
          categorie: l.categorie,
          instructions: l.instructions?.trim() || "",
          ordre: index + 1
        }))

      if (validLignes.length === 0) {
        throw new Error("La demande doit comporter au moins un examen.")
      }

      const payload = {
        motif_correction: motif,
        renseignements_cliniques: editModal.renseignements_cliniques.trim(),
        lignes: validLignes
      }

      const { data } = await apiClient.put(`/examinations/${editModal.demande.id}/`, payload)
      return data
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["demandes-examens"] })
      setEditModal({
        isOpen: false,
        demande: null,
        motif_correction: "",
        renseignements_cliniques: "",
        lignes: []
      })
      showNotification("success", `Demande ${updated.numero} modifiée avec succès.`)
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de la mise à jour.")
      showNotification("error", msg)
    }
  })

  // Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!cancelModal.demande) return
      const motif = cancelModal.motif.trim()
      if (!motif) {
        throw new Error("Le motif d'annulation est obligatoire.")
      }
      const { data } = await apiClient.post(`/examinations/${cancelModal.demande.id}/annuler/`, {
        motif
      })
      return data
    },
    onSuccess: (cancelled) => {
      queryClient.invalidateQueries({ queryKey: ["demandes-examens"] })
      setCancelModal({ isOpen: false, demande: null, motif: "" })
      showNotification("success", `Demande d'examens ${cancelled.numero} annulée avec succès.`)
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de l'annulation.")
      showNotification("error", msg)
    }
  })

  // Impression A4 Standardisée
  const handlePrint = (demande: DemandeExamen) => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      alert("Veuillez autoriser les fenêtres pop-up pour imprimer la demande d'examens.")
      return
    }

    const age = getAge(demande.patient_date_naissance)
    const dateFormatted = new Date(demande.date_creation).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    })

    const lignesTableHtml = (demande.lignes && demande.lignes.length > 0)
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
            ${demande.lignes.map((l, idx) => `
              <tr>
                <td style="text-align: center; font-weight: bold; color: #64748b;">${idx + 1}</td>
                <td>
                  <span class="badge ${l.categorie === 'BIOLOGIE' ? 'badge-bio' : (l.categorie === 'IMAGERIE' ? 'badge-img' : 'badge-autre')}">
                    ${l.categorie === 'BIOLOGIE' ? 'Biologie médicale' : (l.categorie === 'IMAGERIE' ? 'Imagerie / Radio' : 'Exploration')}
                  </span>
                </td>
                <td style="font-weight: 600; font-size: 1.05em; color: #0f172a;">${l.nom_examen}</td>
                <td style="color: #475569; font-style: ${l.instructions ? 'normal' : 'italic'};">
                  ${l.instructions || '—'}
                </td>
                <td style="text-align: center;">
                  <div class="checkbox-box"></div>
                </td>
              </tr>
            `).join("")}
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
              border-bottom: 2.5px solid #0369a1;
              padding-bottom: 14px;
              margin-bottom: 20px;
            }
            .brand-title {
              font-size: 1.45em;
              font-weight: 800;
              color: #0369a1;
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
              color: #0284c7;
              font-weight: 600;
            }
            .doctor-meta {
              font-size: 0.85em;
              color: #64748b;
            }
            .meta-grid {
              width: 100%;
              margin-bottom: 20px;
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
              letter-spacing: 0.6px;
              color: #64748b;
              font-weight: 700;
              margin-bottom: 3px;
            }
            .value {
              font-size: 0.95em;
              font-weight: 600;
              color: #0f172a;
            }
            .value-num {
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              font-size: 1.1em;
              font-weight: 800;
              color: #0369a1;
            }
            .status-tag {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 0.75em;
              font-weight: 700;
              text-transform: uppercase;
              margin-left: 6px;
            }
            .status-active { background: #dcfce7; color: #166534; }
            .status-mod { background: #fef3c7; color: #92400e; }
            .status-ann { background: #fee2e2; color: #991b1b; }
            .section-title {
              font-size: 1.15em;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.8px;
              color: #0369a1;
              margin-top: 15px;
              margin-bottom: 10px;
              display: flex;
              align-items: center;
              gap: 8px;
              border-bottom: 1.5px solid #e2e8f0;
              padding-bottom: 6px;
            }
            .clinical-info {
              background: #f0f9ff;
              border-left: 4px solid #0284c7;
              padding: 10px 14px;
              border-radius: 0 6px 6px 0;
              margin-bottom: 18px;
              font-size: 0.9em;
              color: #0369a1;
            }
            .exam-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 24px;
            }
            .exam-table th {
              background: #f1f5f9;
              color: #334155;
              font-weight: 700;
              font-size: 0.8em;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              padding: 8px 10px;
              border: 1px solid #cbd5e1;
              text-align: left;
            }
            .exam-table td {
              padding: 9px 10px;
              border: 1px solid #e2e8f0;
              vertical-align: middle;
            }
            .badge {
              display: inline-block;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 0.75em;
              font-weight: 600;
            }
            .badge-bio { background: #ecfeff; color: #0891b2; border: 1px solid #a5f3fc; }
            .badge-img { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
            .badge-autre { background: #f3f4f6; color: #4b5563; border: 1px solid #e5e7eb; }
            .checkbox-box {
              width: 16px;
              height: 16px;
              border: 1.5px solid #94a3b8;
              border-radius: 3px;
              margin: 0 auto;
            }
            .footer-info {
              margin-top: 25px;
              padding-top: 14px;
              border-top: 1px dashed #cbd5e1;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .legal-mention {
              font-size: 0.75em;
              color: #64748b;
              max-width: 60%;
              line-height: 1.4;
            }
            .signature-box {
              text-align: center;
              width: 220px;
            }
            .signature-line {
              margin-top: 45px;
              border-top: 1px solid #0f172a;
              padding-top: 4px;
              font-size: 0.85em;
              font-weight: 600;
              color: #334155;
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div class="brand-title">CENTRE MÉDICAL & SOINS</div>
                <div class="brand-sub">Service de Consultation Médicale & Télé-orientation</div>
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
                  ${demande.patient_date_naissance ? `Né(e) le ${new Date(demande.patient_date_naissance).toLocaleDateString('fr-FR')} • ` : ""}
                  ${demande.patient_contact ? `Tél : ${demande.patient_contact}` : ""}
                </div>
              </td>
              <td class="meta-cell" style="width: 50%;">
                <div class="label">Demande d'examens médicaux</div>
                <div class="value-num">
                  ${demande.numero}
                  <span class="status-tag ${demande.statut === 'ACTIVE' ? 'status-active' : (demande.statut === 'MODIFIEE' ? 'status-mod' : 'status-ann')}">
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

  const isDoctor = currentUser?.role === "MEDECIN"
  const isAdmin = currentUser?.role === "ADMIN"
  const canPrescribe = isDoctor || isAdmin
  const demandesList = data || []

  // Stats
  const totalDemandes = demandesList.length
  const activesCount = demandesList.filter((d) => d.statut === "ACTIVE").length
  const modifieesCount = demandesList.filter((d) => d.statut === "MODIFIEE").length
  const annuleesCount = demandesList.filter((d) => d.statut === "ANNULEE").length

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl shadow-lg border animate-in slide-in-from-top-4 ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800"
              : "bg-red-50 text-red-900 border-red-200 dark:bg-red-950/60 dark:text-red-200 dark:border-red-800"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="size-5 shrink-0 text-red-600 dark:text-red-400" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <FlaskConical className="size-7 text-primary" />
            Demandes d&apos;examens médicaux
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Prescription structurée d&apos;analyses de biologie et d&apos;imagerie externe (sans facturation interne).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="rounded-xl gap-2 hover:bg-muted text-muted-foreground"
          >
            <RefreshCw className="size-4" />
            Actualiser
          </Button>

          {canPrescribe && (
            <Button
              onClick={() => {
                setFormConsultation("")
                setFormRenseignements("")
                setFormLignes([
                  {
                    nom_examen: "",
                    categorie: "BIOLOGIE",
                    instructions: ""
                  }
                ])
                setIsCreateOpen(true)
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-sm gap-2"
            >
              <Plus className="size-4" />
              Nouvelle demande d&apos;examens
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Total demandes</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">{totalDemandes}</p>
            </div>
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FlaskConical className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Actives</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">{activesCount}</p>
            </div>
            <div className="size-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center justify-center">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Modifiées (Traçabilité)</p>
              <p className="text-2xl font-extrabold text-amber-600 mt-1">{modifieesCount}</p>
            </div>
            <div className="size-10 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 flex items-center justify-center">
              <History className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Annulées</p>
              <p className="text-2xl font-extrabold text-red-600 mt-1">{annuleesCount}</p>
            </div>
            <div className="size-10 rounded-xl bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 flex items-center justify-center">
              <Ban className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="rounded-2xl border-border/70 shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par n° de demande, patient, médecin, nom d'examen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-xl bg-muted/40 border-border/60"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
                className="h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="ACTIVE">Actives</option>
                <option value="MODIFIEE">Modifiées</option>
                <option value="ANNULEE">Annulées</option>
              </select>

              <select
                value={filterCategorie}
                onChange={(e) => setFilterCategorie(e.target.value)}
                className="h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">Toutes catégories</option>
                <option value="BIOLOGIE">Biologie / Laboratoire</option>
                <option value="IMAGERIE">Imagerie / Radiologie</option>
                <option value="AUTRE">Autres explorations</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tableau du Registre */}
      <Card className="rounded-2xl border-border/70 shadow-xs overflow-hidden">
        <CardHeader className="p-5 border-b border-border/60 bg-muted/20">
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span>Registre des Demandes d&apos;examens</span>
            <span className="text-xs font-normal text-muted-foreground">
              {demandesList.length} demande(s) trouvée(s)
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-3">
              <RefreshCw className="size-6 animate-spin text-primary" />
              <span>Chargement des demandes d&apos;examens...</span>
            </div>
          ) : demandesList.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              <FlaskConical className="size-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-semibold text-foreground">Aucune demande d&apos;examens trouvée</p>
              <p className="text-xs text-muted-foreground mt-1">
                Créez une prescription depuis une consultation ou modifiez vos critères de recherche.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                    <th className="py-3 px-4">Numéro</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Médecin prescripteur</th>
                    <th className="py-3 px-4">Examens prescrits</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {demandesList.map((demande) => {
                    const isExpanded = expandedExamId === demande.id
                    const canEditOrCancel = (isAdmin || (isDoctor && currentUser?.id === demande.medecin_id)) && demande.statut !== "ANNULEE"

                    return (
                      <tr
                        key={demande.id}
                        className="hover:bg-muted/30 transition-colors group"
                      >
                        {/* Numéro */}
                        <td className="py-3.5 px-4 font-mono font-bold text-xs text-primary">
                          <button
                            type="button"
                            onClick={() => setExpandedExamId(isExpanded ? null : demande.id)}
                            className="flex items-center gap-1.5 hover:underline text-left"
                          >
                            {demande.numero || `#${demande.id}`}
                            {isExpanded ? (
                              <ChevronUp className="size-3 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="size-3 text-muted-foreground" />
                            )}
                          </button>
                        </td>

                        {/* Statut */}
                        <td className="py-3.5 px-4">
                          {demande.statut === "ACTIVE" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              <span className="size-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          )}
                          {demande.statut === "MODIFIEE" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              <History className="size-3" />
                              Modifiée
                            </span>
                          )}
                          {demande.statut === "ANNULEE" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                              <Ban className="size-3" />
                              Annulée
                            </span>
                          )}
                        </td>

                        {/* Patient */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-foreground">
                            {demande.patient_nom} {demande.patient_prenom}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {getAge(demande.patient_date_naissance)} {demande.patient_contact && `• ${demande.patient_contact}`}
                          </div>
                        </td>

                        {/* Médecin */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-foreground">
                            {demande.medecin_nom || "Dr."}
                          </div>
                          {demande.medecin_specialite && (
                            <div className="text-xs text-muted-foreground">
                              {demande.medecin_specialite}
                            </div>
                          )}
                        </td>

                        {/* Examens prescrits (Aperçu) */}
                        <td className="py-3.5 px-4 max-w-xs">
                          {demande.lignes && demande.lignes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {demande.lignes.slice(0, 2).map((l, idx) => (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                                    l.categorie === 'BIOLOGIE'
                                      ? 'bg-cyan-50 text-cyan-800 border border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800'
                                      : l.categorie === 'IMAGERIE'
                                      ? 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                                      : 'bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                  }`}
                                >
                                  {l.categorie === 'BIOLOGIE' ? '🔬' : (l.categorie === 'IMAGERIE' ? '🩻' : '📋')}
                                  {l.nom_examen}
                                </span>
                              ))}
                              {demande.lignes.length > 2 && (
                                <span className="text-[11px] text-muted-foreground self-center">
                                  +{demande.lignes.length - 2} autre(s)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Aucun examen</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(demande.date_creation).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Imprimer */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrint(demande)}
                              className="h-8 px-2.5 rounded-lg text-xs gap-1 border-border/80 hover:bg-muted"
                              title="Imprimer la demande (A4)"
                            >
                              <Printer className="size-3.5 text-sky-600" />
                              <span className="hidden sm:inline">Imprimer</span>
                            </Button>

                            {/* Historique */}
                            {demande.historique && demande.historique.length > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setHistoryModal({ isOpen: true, demande })}
                                className="h-8 px-2 rounded-lg text-xs gap-1 border-amber-200 text-amber-700 bg-amber-50/50 hover:bg-amber-100/50 dark:border-amber-800 dark:text-amber-300 dark:bg-amber-950/40"
                                title="Historique des modifications"
                              >
                                <History className="size-3.5" />
                              </Button>
                            )}

                            {/* Modifier */}
                            {canEditOrCancel && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditModal({
                                    isOpen: true,
                                    demande,
                                    motif_correction: "",
                                    renseignements_cliniques: demande.renseignements_cliniques || "",
                                    lignes: (demande.lignes || []).map((l) => ({ ...l }))
                                  })
                                }}
                                className="h-8 px-2 rounded-lg text-xs gap-1 border-border/80 hover:bg-muted"
                                title="Modifier la demande (avec motif obligatoire)"
                              >
                                <Pencil className="size-3.5 text-muted-foreground" />
                              </Button>
                            )}

                            {/* Annuler */}
                            {canEditOrCancel && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCancelModal({ isOpen: true, demande, motif: "" })}
                                className="h-8 px-2 rounded-lg text-xs gap-1 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                                title="Annuler la demande"
                              >
                                <Ban className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL CRÉATION DE DEMANDE D'EXAMENS */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FlaskConical className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Nouvelle demande d&apos;examens médicaux
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Biologie médicale & Imagerie externe (sans facturation interne)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createMutation.mutate()
              }}
              className="mt-5 space-y-5"
            >
              {/* Consultation Selector */}
              <div>
                <Label htmlFor="exam-consultation" className="font-semibold">
                  Consultation médicale associée *
                </Label>
                <select
                  id="exam-consultation"
                  required
                  value={formConsultation}
                  onChange={(e) => setFormConsultation(e.target.value)}
                  className="mt-1 flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">-- Sélectionner une consultation --</option>
                  {(consultations || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.id} — {c.patient_nom} {c.patient_prenom} ({c.motif}) du {new Date(c.date_consultation).toLocaleDateString("fr-FR")}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Le patient et le médecin prescripteur sont automatiquement et fidèlement liés à la consultation.
                </p>
              </div>

              {/* Renseignements cliniques */}
              <div>
                <Label htmlFor="exam-renseignements" className="font-semibold">
                  Renseignements cliniques indicatifs pour le biologiste / radiologue
                </Label>
                <Textarea
                  id="exam-renseignements"
                  rows={2}
                  placeholder="Ex : Suspicion de pneumopathie alvéolaire, fièvre persistante à J+5..."
                  value={formRenseignements}
                  onChange={(e) => setFormRenseignements(e.target.value)}
                  className="mt-1 rounded-xl"
                />
              </div>

              {/* Lignes d'examens dynamiques */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold flex items-center gap-2">
                    <Microscope className="size-4 text-primary" />
                    Examens prescrits ({formLignes.length}) *
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addLine}
                    className="h-7 text-xs rounded-lg gap-1 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <Plus className="size-3.5" /> Ajouter un examen
                  </Button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {formLignes.map((ligne, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border border-border/80 bg-muted/20 space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground">
                          Examen #{idx + 1}
                        </span>
                        {formLignes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="text-red-500 hover:text-red-700 p-1 rounded-lg transition-colors"
                            title="Supprimer cette ligne"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <Label className="text-xs">Nom de l&apos;examen *</Label>
                          <Input
                            required
                            placeholder="Ex : NFS + CRP, Radiographie pulmonaire..."
                            value={ligne.nom_examen}
                            onChange={(e) => updateLine(idx, "nom_examen", e.target.value)}
                            className="mt-1 h-8 rounded-lg text-xs"
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Catégorie *</Label>
                          <select
                            value={ligne.categorie}
                            onChange={(e) => updateLine(idx, "categorie", e.target.value as any)}
                            className="mt-1 flex w-full h-8 rounded-lg border border-input bg-background px-2 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            {CATEGORIES_EXAMEN.map((cat) => (
                              <option key={cat.value} value={cat.value}>
                                {cat.icon} {cat.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Instructions / Précautions cliniques</Label>
                        <Input
                          placeholder="Ex : À jeun le matin, vessie pleine, face et profil..."
                          value={ligne.instructions || ""}
                          onChange={(e) => updateLine(idx, "instructions", e.target.value)}
                          className="mt-1 h-8 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
                >
                  {createMutation.isPending ? "Création en cours..." : "Valider la prescription d'examens"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MODIFICATION AVEC MOTIF OBLIGATOIRE */}
      {editModal.isOpen && editModal.demande && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  <Pencil className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Modifier la demande {editModal.demande.numero}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Toute correction est consignée dans l&apos;audit trail médico-légal.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModal({ isOpen: false, demande: null, motif_correction: "", renseignements_cliniques: "", lignes: [] })}
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                editMutation.mutate()
              }}
              className="mt-5 space-y-4"
            >
              {/* Motif de correction obligatoire */}
              <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/70 dark:bg-amber-950/40 dark:border-amber-800 space-y-2">
                <Label htmlFor="edit-motif" className="text-amber-900 dark:text-amber-200 font-bold flex items-center gap-1.5">
                  <AlertCircle className="size-4" /> Motif obligatoire de la modification *
                </Label>
                <Textarea
                  id="edit-motif"
                  required
                  rows={2}
                  placeholder="Ex : Ajout d'une NFS suite à l'aggravation fébrile, précision pour le biologiste..."
                  value={editModal.motif_correction}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, motif_correction: e.target.value }))}
                  className="bg-background text-sm rounded-lg"
                />
              </div>

              {/* Renseignements cliniques */}
              <div>
                <Label htmlFor="edit-renseignements" className="font-semibold text-xs">
                  Renseignements cliniques indicatifs
                </Label>
                <Textarea
                  id="edit-renseignements"
                  rows={2}
                  value={editModal.renseignements_cliniques}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, renseignements_cliniques: e.target.value }))}
                  className="mt-1 rounded-xl text-xs"
                />
              </div>

              {/* Lignes d'examens */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-xs">Examens prescrits</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditModal((prev) => ({
                        ...prev,
                        lignes: [...prev.lignes, { nom_examen: "", categorie: "BIOLOGIE", instructions: "" }]
                      }))
                    }}
                    className="h-7 text-xs rounded-lg gap-1 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <Plus className="size-3.5" /> Ajouter un examen
                  </Button>
                </div>

                <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                  {editModal.lignes.map((ligne, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground">Examen #{idx + 1}</span>
                        {editModal.lignes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditModal((prev) => ({
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
                            placeholder="Nom de l'examen"
                            value={ligne.nom_examen}
                            onChange={(e) => {
                              const val = e.target.value
                              setEditModal((prev) => {
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
                              setEditModal((prev) => {
                                const next = [...prev.lignes]
                                next[idx] = { ...next[idx], categorie: val }
                                return { ...prev, lignes: next }
                              })
                            }}
                            className="flex w-full h-8 rounded-lg border border-input bg-background px-2 text-xs"
                          >
                            {CATEGORIES_EXAMEN.map((cat) => (
                              <option key={cat.value} value={cat.value}>
                                {cat.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <Input
                        placeholder="Instructions"
                        value={ligne.instructions || ""}
                        onChange={(e) => {
                          const val = e.target.value
                          setEditModal((prev) => {
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
                  onClick={() => setEditModal({ isOpen: false, demande: null, motif_correction: "", renseignements_cliniques: "", lignes: [] })}
                  className="rounded-xl"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={editMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
                >
                  {editMutation.isPending ? "Modification en cours..." : "Valider les modifications"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ANNULATION AVEC MOTIF OBLIGATOIRE */}
      {cancelModal.isOpen && cancelModal.demande && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2 text-red-600 dark:text-red-400">
                <Ban className="size-5" />
                Annuler la demande {cancelModal.demande.numero}
              </h3>
              <button
                type="button"
                onClick={() => setCancelModal({ isOpen: false, demande: null, motif: "" })}
                className="rounded-xl p-1 text-muted-foreground hover:bg-muted"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                cancelMutation.mutate()
              }}
              className="mt-4 space-y-4"
            >
              <p className="text-xs text-muted-foreground leading-relaxed">
                Une annulation est définitive. Elle préserve l&apos;historique de la demande et enregistre le motif dans le dossier médical.
              </p>

              <div>
                <Label htmlFor="cancel-motif" className="font-semibold text-xs">
                  Motif obligatoire de l&apos;annulation *
                </Label>
                <Textarea
                  id="cancel-motif"
                  required
                  rows={3}
                  placeholder="Ex : Erreur d'orientation, patient hospitalisé, examens réalisés sur place..."
                  value={cancelModal.motif}
                  onChange={(e) => setCancelModal((prev) => ({ ...prev, motif: e.target.value }))}
                  className="mt-1 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCancelModal({ isOpen: false, demande: null, motif: "" })}
                  className="rounded-xl"
                >
                  Fermer
                </Button>
                <Button
                  type="submit"
                  disabled={cancelMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl"
                >
                  {cancelMutation.isPending ? "Annulation..." : "Confirmer l'annulation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HISTORIQUE D'AUDIT */}
      {historyModal.isOpen && historyModal.demande && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <History className="size-5 text-amber-600" />
                Audit Trail — Demande {historyModal.demande.numero}
              </h3>
              <button
                type="button"
                onClick={() => setHistoryModal({ isOpen: false, demande: null })}
                className="rounded-xl p-1 text-muted-foreground hover:bg-muted"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {(!historyModal.demande.historique || historyModal.demande.historique.length === 0) ? (
                <p className="text-xs text-muted-foreground italic">Aucune modification enregistrée.</p>
              ) : (
                historyModal.demande.historique.map((h, i) => (
                  <div key={h.id || i} className="p-3.5 rounded-2xl border border-border/80 bg-muted/20 text-xs space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="font-semibold text-foreground">{h.auteur_nom || "Praticien"}</span>
                      <span>{new Date(h.date_modification).toLocaleString("fr-FR")}</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
                      <strong>Motif :</strong> {h.motif_correction}
                    </div>

                    {h.anciennes_lignes && h.anciennes_lignes.length > 0 && (
                      <div className="text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground">Anciens examens :</span>
                        <ul className="list-disc pl-4 mt-1 space-y-0.5">
                          {h.anciennes_lignes.map((al, idx) => (
                            <li key={idx}>{al.nom_examen} ({al.categorie})</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-border/60 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setHistoryModal({ isOpen: false, demande: null })}
                className="rounded-xl"
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

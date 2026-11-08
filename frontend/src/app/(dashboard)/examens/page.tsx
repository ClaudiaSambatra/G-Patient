"use client"

import { useState, useMemo, Fragment } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { CurrentUser } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Flask,
  Microscope,
  CheckCircle,
  WarningCircle,
  PencilSimple,
  Trash,
  Printer,
  Eye,
  FileText,
  MagnifyingGlass,
  ArrowClockwise,
  Plus,
  User,
  CalendarDots,
  Stethoscope,
  Prohibit,
  CaretDown,
  CaretUp,
  ClockCounterClockwise,
  Info,
  X,
} from "@phosphor-icons/react"

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
  { value: "AUTRE", label: "Autre examen / Exploration", icon: "📋" },
] as const

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

  // Accordion & Preview state
  const [expandedExamId, setExpandedExamId] = useState<number | null>(null)
  const [previewDemande, setPreviewDemande] = useState<DemandeExamen | null>(null)

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
    lignes: [],
  })
  const [historyModal, setHistoryModal] = useState<{
    isOpen: boolean
    demande: DemandeExamen | null
  }>({
    isOpen: false,
    demande: null,
  })
  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean
    demande: DemandeExamen | null
    motif: string
  }>({
    isOpen: false,
    demande: null,
    motif: "",
  })

  // Dynamic lines state for creation
  const [formConsultation, setFormConsultation] = useState("")
  const [formRenseignements, setFormRenseignements] = useState("")
  const [formLignes, setFormLignes] = useState<LigneDemandeExamen[]>([
    {
      nom_examen: "",
      categorie: "BIOLOGIE",
      instructions: "",
    },
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

  const { data: rawData, isLoading } = useQuery({
    queryKey: ["demandes-examens"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: DemandeExamen[] } | DemandeExamen[]>(
        `/examinations/?page_size=200`
      )
      return Array.isArray(data) ? data : ((data.results || []) as DemandeExamen[])
    },
  })

  const { data: consultations } = useQuery({
    queryKey: ["consultations_list_for_exam"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: Consultation[] } | Consultation[]>(`/consultations/?page_size=100`)
      return Array.isArray(data) ? data : ((data.results || []) as Consultation[])
    },
    enabled: isCreateOpen,
  })

  // Helpers for dynamic lines
  const addLine = () => {
    setFormLignes((prev) => [
      ...prev,
      {
        nom_examen: "",
        categorie: "BIOLOGIE",
        instructions: "",
      },
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
          ordre: index + 1,
        }))

      if (validLignes.length === 0) {
        throw new Error("Veuillez spécifier au moins un examen médical.")
      }

      const payload = {
        consultation: parseInt(formConsultation, 10),
        renseignements_cliniques: formRenseignements.trim(),
        lignes: validLignes,
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
          instructions: "",
        },
      ])
      showNotification("success", `Demande d'examens ${newExam.numero} créée avec succès.`)
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de la création de la demande.")
      showNotification("error", msg)
    },
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
          ordre: index + 1,
        }))

      if (validLignes.length === 0) {
        throw new Error("La demande doit comporter au moins un examen.")
      }

      const payload = {
        motif_correction: motif,
        renseignements_cliniques: editModal.renseignements_cliniques.trim(),
        lignes: validLignes,
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
        lignes: [],
      })
      if (previewDemande?.id === updated.id) {
        setPreviewDemande(updated)
      }
      showNotification("success", `Demande ${updated.numero} modifiée avec succès.`)
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de la mise à jour.")
      showNotification("error", msg)
    },
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
        motif,
      })
      return data
    },
    onSuccess: (cancelled) => {
      queryClient.invalidateQueries({ queryKey: ["demandes-examens"] })
      setCancelModal({ isOpen: false, demande: null, motif: "" })
      if (previewDemande?.id === cancelled.id) {
        setPreviewDemande(cancelled)
      }
      showNotification("success", `Demande d'examens ${cancelled.numero} annulée avec succès.`)
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de l'annulation.")
      showNotification("error", msg)
    },
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
              border-bottom: 2.5px solid #0891b2;
              padding-bottom: 14px;
              margin-bottom: 20px;
            }
            .brand-title {
              font-size: 1.45em;
              font-weight: 800;
              color: #0891b2;
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
              color: #0891b2;
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
              color: #0891b2;
              margin-top: 15px;
              margin-bottom: 10px;
              display: flex;
              align-items: center;
              gap: 8px;
              border-bottom: 1.5px solid #e2e8f0;
              padding-bottom: 6px;
            }
            .clinical-info {
              background: #f0fdfa;
              border-left: 4px solid #0d9488;
              padding: 10px 14px;
              border-radius: 0 6px 6px 0;
              margin-bottom: 18px;
              font-size: 0.9em;
              color: #0f766e;
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

  const isDoctor = currentUser?.role === "MEDECIN"
  const isAdmin = currentUser?.role === "ADMIN"
  const canPrescribe = isDoctor || isAdmin
  const allDemandes = useMemo(() => rawData || [], [rawData])

  // Stats calculées globalement sur l'ensemble des demandes
  const stats = useMemo(() => {
    const total = allDemandes.length
    const actives = allDemandes.filter((d) => d.statut === "ACTIVE").length
    const modifiees = allDemandes.filter((d) => d.statut === "MODIFIEE").length
    const annulees = allDemandes.filter((d) => d.statut === "ANNULEE").length

    let countBio = 0
    let countImg = 0
    let countAutre = 0
    let countDemandesBio = 0
    let countDemandesImg = 0
    let countDemandesAutre = 0

    allDemandes.forEach((d) => {
      const hasBio = d.lignes?.some((l) => l.categorie === "BIOLOGIE")
      const hasImg = d.lignes?.some((l) => l.categorie === "IMAGERIE")
      const hasAutre = d.lignes?.some((l) => l.categorie === "AUTRE")

      if (hasBio) countDemandesBio++
      if (hasImg) countDemandesImg++
      if (hasAutre) countDemandesAutre++

      d.lignes?.forEach((l) => {
        if (l.categorie === "BIOLOGIE") countBio++
        else if (l.categorie === "IMAGERIE") countImg++
        else countAutre++
      })
    })

    return {
      total,
      actives,
      modifiees,
      annulees,
      countBio,
      countImg,
      countAutre,
      countDemandesBio,
      countDemandesImg,
      countDemandesAutre,
    }
  }, [allDemandes])

  // Filtrage local instantané
  const demandesList = useMemo(() => {
    return allDemandes.filter((demande) => {
      if (filterStatut !== "ALL" && demande.statut !== filterStatut) return false
      if (filterCategorie !== "ALL") {
        const hasCategory = demande.lignes?.some((l) => l.categorie === filterCategorie)
        if (!hasCategory) return false
      }
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const matchNum = demande.numero?.toLowerCase().includes(q)
        const matchPatientNom = demande.patient_nom?.toLowerCase().includes(q)
        const matchPatientPrenom = demande.patient_prenom?.toLowerCase().includes(q)
        const matchMedecin = demande.medecin_nom?.toLowerCase().includes(q)
        const matchLignes = demande.lignes?.some((l) =>
          l.nom_examen.toLowerCase().includes(q) || l.instructions?.toLowerCase().includes(q)
        )
        const matchRenseignements = demande.renseignements_cliniques?.toLowerCase().includes(q)
        if (!matchNum && !matchPatientNom && !matchPatientPrenom && !matchMedecin && !matchLignes && !matchRenseignements) {
          return false
        }
      }
      return true
    })
  }, [allDemandes, filterStatut, filterCategorie, search])

  const hasActiveFilters = Boolean(search.trim() || filterStatut !== "ALL" || filterCategorie !== "ALL")

  function resetFilters() {
    setSearch("")
    setFilterStatut("ALL")
    setFilterCategorie("ALL")
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium animate-in slide-in-from-top-2 duration-200 ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800"
              : "bg-red-50 text-red-900 border-red-200 dark:bg-red-950/60 dark:text-red-200 dark:border-red-800"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle size={20} weight="duotone" className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <WarningCircle size={20} weight="duotone" className="shrink-0 text-red-600 dark:text-red-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">

      {/* Header compact */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Flask size={24} weight="duotone" />
            </span>
            Demandes d&apos;examens médicaux & Laboratoire
          </h1>
          <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2">
            <span>Prescription et suivi des analyses biologiques et examens radiologiques.</span>
            <Badge variant="outline" className="text-[10px] py-0 px-2 font-normal border-cyan-500/30 text-cyan-700 dark:text-cyan-300">
              Sans facturation interne
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canPrescribe && (
            <Button
              onClick={() => {
                setFormConsultation("")
                setFormRenseignements("")
                setFormLignes([
                  {
                    nom_examen: "",
                    categorie: "BIOLOGIE",
                    instructions: "",
                  },
                ])
                setIsCreateOpen(true)
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-xs gap-1.5 h-8.5 px-3.5 text-xs sm:text-sm"
            >
              <Plus size={16} weight="bold" />
              Prescrire un examen
            </Button>
          )}
        </div>
      </div>

      {/* Barre unifiée compacte : Catégories + Recherche + Statuts */}
      <Card className="rounded-xl border-border/80 shadow-2xs">
        <CardContent className="p-2 sm:p-2.5 space-y-2">
          {/* Ligne 1 : Onglets Catégories rapides */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => setFilterCategorie("ALL")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all shrink-0 ${
                  filterCategorie === "ALL"
                    ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
                }`}
              >
                <Flask size={14} weight="duotone" />
                <span>Toutes</span>
                <span className="text-[10px] opacity-80 font-mono">({stats.total})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterCategorie("BIOLOGIE")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all shrink-0 ${
                  filterCategorie === "BIOLOGIE"
                    ? "bg-cyan-500 text-white shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 font-medium"
                }`}
              >
                <Microscope size={14} weight="duotone" />
                <span>Laboratoire & Biologie</span>
                <span className="text-[10px] opacity-90 font-mono font-bold">({stats.countDemandesBio})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterCategorie("IMAGERIE")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all shrink-0 ${
                  filterCategorie === "IMAGERIE"
                    ? "bg-blue-600 text-white shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-medium"
                }`}
              >
                <span className="text-xs">🩻</span>
                <span>Radiologie</span>
                <span className="text-[10px] opacity-80 font-mono">({stats.countDemandesImg})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterCategorie("AUTRE")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all shrink-0 ${
                  filterCategorie === "AUTRE"
                    ? "bg-slate-700 text-white shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
                }`}
              >
                <span className="text-xs">📋</span>
                <span>Autres</span>
                <span className="text-[10px] opacity-80 font-mono">({stats.countDemandesAutre})</span>
              </button>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-7 px-2 rounded-lg text-[11px] text-muted-foreground hover:text-foreground gap-1 shrink-0"
                title="Réinitialiser tous les critères"
              >
                <X size={12} weight="bold" />
                Effacer
              </Button>
            )}
          </div>

          {/* Ligne 2 : Recherche compacte + Filtres de statuts */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1.5 border-t border-border/50">
            <div className="relative flex-1 w-full">
              <MagnifyingGlass
                size={15}
                weight="duotone"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                placeholder="Rechercher par n°, patient, médecin prescripteur, analyse..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-7 rounded-lg bg-muted/30 border-border/70 text-xs h-8"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X size={12} weight="bold" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 flex-wrap w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => setFilterStatut("ALL")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  filterStatut === "ALL"
                    ? "bg-muted text-foreground font-semibold border border-border/80 shadow-2xs"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                Tous ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatut("ACTIVE")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1 ${
                  filterStatut === "ACTIVE"
                    ? "bg-emerald-600 text-white font-semibold shadow-2xs"
                    : "bg-emerald-50/70 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100"
                }`}
              >
                <CheckCircle size={12} weight="duotone" />
                Actives ({stats.actives})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatut("MODIFIEE")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1 ${
                  filterStatut === "MODIFIEE"
                    ? "bg-amber-600 text-white font-semibold shadow-2xs"
                    : "bg-amber-50/70 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100"
                }`}
              >
                <ClockCounterClockwise size={12} weight="duotone" />
                Modifiées ({stats.modifiees})
              </button>
              {stats.annulees > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterStatut("ANNULEE")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1 ${
                    filterStatut === "ANNULEE"
                      ? "bg-red-600 text-white font-semibold shadow-2xs"
                      : "bg-red-50/70 text-red-800 dark:bg-red-950/40 dark:text-red-300 hover:bg-red-100"
                  }`}
                >
                  <Prohibit size={12} weight="duotone" />
                  Annulées ({stats.annulees})
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tableau du Registre */}
      <Card className="rounded-xl border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="p-3 sm:px-4 sm:py-3 border-b border-border/60 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
              {filterCategorie === "BIOLOGIE" ? (
                <Microscope size={18} weight="duotone" className="text-cyan-600 dark:text-cyan-400" />
              ) : (
                <Flask size={18} weight="duotone" className="text-primary" />
              )}
              <span>
                {filterCategorie === "BIOLOGIE"
                  ? "Analyses de laboratoire prescrites"
                  : filterCategorie === "IMAGERIE"
                  ? "Examens radiologiques prescrits"
                  : filterCategorie === "AUTRE"
                  ? "Autres explorations médicales"
                  : "Registre des demandes d'examens"}
              </span>
              <Badge variant="secondary" className="text-xs font-semibold">
                {demandesList.length}
              </Badge>
            </CardTitle>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Cliquez sur une ligne pour afficher les détails et instructions
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-16 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-3">
              <ArrowClockwise size={28} weight="duotone" className="animate-spin text-primary" />
              <span>Chargement des demandes d&apos;examens...</span>
            </div>
          ) : demandesList.length === 0 ? (
            <div className="py-16 px-4 text-center text-muted-foreground text-sm flex flex-col items-center justify-center">
              <div className="size-14 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-3">
                {filterCategorie === "BIOLOGIE" ? (
                  <Microscope size={32} weight="duotone" />
                ) : (
                  <Flask size={32} weight="duotone" />
                )}
              </div>
              <p className="font-semibold text-foreground text-base">
                {filterCategorie === "BIOLOGIE"
                  ? "Aucune analyse de laboratoire trouvée"
                  : "Aucune demande d&apos;examens trouvée"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {hasActiveFilters
                  ? "Aucun résultat ne correspond à vos filtres de recherche. Essayez d'élargir vos critères."
                  : "Aucune prescription d'examen n'a encore été enregistrée. Utilisez le bouton en haut pour créer une nouvelle prescription."}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={resetFilters} className="mt-4 rounded-xl text-xs gap-1.5">
                  <X size={14} weight="bold" />
                  Effacer les filtres
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40 text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Numéro</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Médecin prescripteur</th>
                    <th className="py-3 px-4">{filterCategorie === "BIOLOGIE" ? "Analyses prescrites" : "Examens prescrits"}</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {demandesList.map((demande) => {
                    const isExpanded = expandedExamId === demande.id
                    const canEditOrCancel =
                      (isAdmin || (isDoctor && currentUser?.id === demande.medecin_id)) && demande.statut !== "ANNULEE"

                    return (
                      <Fragment key={demande.id}>
                        <tr
                          onClick={() => setExpandedExamId(isExpanded ? null : demande.id)}
                          className={`hover:bg-muted/30 transition-colors cursor-pointer select-none ${
                            isExpanded ? "bg-muted/20" : ""
                          }`}
                        >
                          {/* Chevron indicateur */}
                          <td className="py-3.5 px-3 text-center text-muted-foreground">
                            <div className="size-6 rounded-lg bg-muted/60 flex items-center justify-center hover:bg-muted text-muted-foreground">
                              {isExpanded ? <CaretUp size={14} weight="bold" /> : <CaretDown size={14} weight="bold" />}
                            </div>
                          </td>

                          {/* Numéro */}
                          <td className="py-3.5 px-4 font-mono font-bold text-xs text-primary">
                            <span className="hover:underline flex items-center gap-1.5">
                              {demande.numero || `#${demande.id}`}
                            </span>
                          </td>

                          {/* Statut */}
                          <td className="py-3.5 px-4">
                            {demande.statut === "ACTIVE" && (
                              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 font-semibold gap-1 text-[11px] hover:bg-emerald-500/20">
                                <CheckCircle size={13} weight="duotone" className="text-emerald-600" />
                                Active
                              </Badge>
                            )}
                            {demande.statut === "MODIFIEE" && (
                              <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 font-semibold gap-1 text-[11px] hover:bg-amber-500/20">
                                <ClockCounterClockwise size={13} weight="duotone" className="text-amber-600" />
                                Modifiée
                              </Badge>
                            )}
                            {demande.statut === "ANNULEE" && (
                              <Badge className="bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20 font-semibold gap-1 text-[11px] hover:bg-red-500/20">
                                <Prohibit size={13} weight="duotone" className="text-red-600" />
                                Annulée
                              </Badge>
                            )}
                          </td>

                          {/* Patient */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="size-8 rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 flex items-center justify-center font-bold text-xs shrink-0">
                                {demande.patient_nom?.[0]?.toUpperCase() || "P"}
                              </div>
                              <div>
                                <div className="font-semibold text-foreground">
                                  {demande.patient_nom} {demande.patient_prenom}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {getAge(demande.patient_date_naissance) && (
                                    <span>{getAge(demande.patient_date_naissance)}</span>
                                  )}
                                  {demande.patient_date_naissance && demande.patient_contact && " • "}
                                  {demande.patient_contact && <span>{demande.patient_contact}</span>}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Médecin */}
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-foreground flex items-center gap-1.5">
                              <Stethoscope size={15} weight="duotone" className="text-primary" />
                              {demande.medecin_nom || "Praticien"}
                            </div>
                            {demande.medecin_specialite && (
                              <div className="text-xs text-muted-foreground pl-5">
                                {demande.medecin_specialite}
                              </div>
                            )}
                          </td>

                          {/* Examens prescrits (Aperçu) */}
                          <td className="py-3.5 px-4 max-w-xs">
                            {demande.lignes && demande.lignes.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {(filterCategorie === "BIOLOGIE"
                                  ? demande.lignes.filter((l) => l.categorie === "BIOLOGIE")
                                  : filterCategorie === "IMAGERIE"
                                  ? demande.lignes.filter((l) => l.categorie === "IMAGERIE")
                                  : demande.lignes
                                )
                                  .slice(0, 3)
                                  .map((l, idx) => (
                                    <span
                                      key={idx}
                                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                        l.categorie === "BIOLOGIE"
                                          ? "bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border border-cyan-500/25"
                                          : l.categorie === "IMAGERIE"
                                          ? "bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-500/25"
                                          : "bg-slate-500/10 text-slate-800 dark:text-slate-300 border border-slate-500/25"
                                      }`}
                                    >
                                      <span>{l.categorie === "BIOLOGIE" ? "🔬" : l.categorie === "IMAGERIE" ? "🩻" : "📋"}</span>
                                      <span>{l.nom_examen}</span>
                                    </span>
                                  ))}
                                {demande.lignes.length > 3 && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 font-normal">
                                    +{demande.lignes.length - 3} autre(s)
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Aucun examen</span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <CalendarDots size={14} weight="duotone" className="text-muted-foreground" />
                              {new Date(demande.date_creation).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </div>
                          </td>

                          {/* Actions rapides */}
                          <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              {/* Voir aperçu */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPreviewDemande(demande)}
                                className="size-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                                title="Aperçu officiel de la demande"
                              >
                                <Eye size={17} weight="duotone" />
                              </Button>

                              {/* Imprimer A4 */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePrint(demande)}
                                className="size-8 p-0 rounded-lg text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                                title="Imprimer la demande"
                              >
                                <Printer size={17} weight="duotone" />
                              </Button>

                              {/* Historique audit */}
                              {demande.historique && demande.historique.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setHistoryModal({ isOpen: true, demande })}
                                  className="size-8 p-0 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                                  title="Audit médico-légal des modifications"
                                >
                                  <ClockCounterClockwise size={17} weight="duotone" />
                                </Button>
                              )}

                              {/* Modifier */}
                              {canEditOrCancel && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditModal({
                                      isOpen: true,
                                      demande,
                                      motif_correction: "",
                                      renseignements_cliniques: demande.renseignements_cliniques || "",
                                      lignes: (demande.lignes || []).map((l) => ({ ...l })),
                                    })
                                  }}
                                  className="size-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                                  title="Modifier avec motif obligatoire"
                                >
                                  <PencilSimple size={17} weight="duotone" />
                                </Button>
                              )}

                              {/* Annuler */}
                              {canEditOrCancel && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setCancelModal({ isOpen: true, demande, motif: "" })}
                                  className="size-8 p-0 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                                  title="Annuler la demande"
                                >
                                  <Prohibit size={17} weight="duotone" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* ACCORDION / LIGNE ÉTENDUE AVEC DÉTAIL COMPLET */}
                        {isExpanded && (
                          <tr className="bg-muted/15 border-b border-border/60">
                            <td colSpan={8} className="p-4 sm:p-5">
                              <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-xs animate-in slide-in-from-top-2 duration-150">
                                {/* Header du panneau étendu */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                      <Flask size={20} weight="duotone" />
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        Détails de la demande {demande.numero}
                                        <Badge variant="outline" className="text-[10px] font-normal">
                                          Consultation #{demande.consultation}
                                        </Badge>
                                      </h4>
                                      <p className="text-xs text-muted-foreground">
                                        Patient : <strong>{demande.patient_nom} {demande.patient_prenom}</strong> • Délivrée par <strong>{demande.medecin_nom}</strong> le {new Date(demande.date_creation).toLocaleDateString("fr-FR")}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setPreviewDemande(demande)}
                                      className="h-8 text-xs gap-1.5 rounded-xl"
                                    >
                                      <Eye size={15} weight="duotone" />
                                      Aperçu officiel
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handlePrint(demande)}
                                      className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground rounded-xl"
                                    >
                                      <Printer size={15} weight="duotone" />
                                      Imprimer A4
                                    </Button>
                                  </div>
                                </div>

                                {/* Renseignements cliniques s'il y en a */}
                                {demande.renseignements_cliniques && (
                                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3.5 text-xs">
                                    <div className="flex items-center gap-1.5 font-bold text-cyan-800 dark:text-cyan-300 uppercase tracking-wide text-[11px] mb-1">
                                      <Info size={15} weight="duotone" />
                                      Renseignements cliniques & Contexte
                                    </div>
                                    <p className="text-cyan-900/90 dark:text-cyan-200 whitespace-pre-line leading-relaxed">
                                      {demande.renseignements_cliniques}
                                    </p>
                                  </div>
                                )}

                                {/* Liste structurée des examens */}
                                <div className="space-y-2">
                                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <Microscope size={15} weight="duotone" className="text-primary" />
                                    Examens prescrits ({demande.lignes?.length || 0})
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                    {(demande.lignes || []).map((ligne, idx) => (
                                      <div
                                        key={ligne.id || idx}
                                        className="p-3 rounded-xl border border-border/80 bg-background flex flex-col justify-between text-xs space-y-1.5"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                                            <span className="size-5 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-bold shrink-0">
                                              {idx + 1}
                                            </span>
                                            {ligne.nom_examen}
                                          </div>
                                          <Badge
                                            className={`text-[10px] shrink-0 font-medium ${
                                              ligne.categorie === "BIOLOGIE"
                                                ? "bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border-cyan-500/20"
                                                : ligne.categorie === "IMAGERIE"
                                                ? "bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-500/20"
                                                : "bg-slate-500/10 text-slate-800 dark:text-slate-300 border-slate-500/20"
                                            }`}
                                          >
                                            {ligne.categorie === "BIOLOGIE"
                                              ? "Biologie"
                                              : ligne.categorie === "IMAGERIE"
                                              ? "Imagerie"
                                              : "Exploration"}
                                          </Badge>
                                        </div>

                                        {ligne.instructions ? (
                                          <p className="text-[11px] text-muted-foreground pl-6 italic">
                                            Précautions : {ligne.instructions}
                                          </p>
                                        ) : (
                                          <p className="text-[11px] text-muted-foreground/60 pl-6 italic">
                                            Aucune instruction particulière
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </main>

      {/* MODAL APERÇU OFFICIEL (VUE DOCUMENT) */}
      {previewDemande && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-6">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <FileText size={22} weight="duotone" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    Aperçu officiel — Demande {previewDemande.numero}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDemande(null)}
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* Feuille de prescription médicale stylisée */}
            <div className="rounded-2xl border border-border/80 bg-background p-6 space-y-6 shadow-xs font-sans">
              {/* En-tête de la clinique */}
              <div className="flex items-start justify-between border-b-2 border-cyan-600 pb-4">
                <div>
                  <div className="text-lg font-extrabold text-cyan-700 dark:text-cyan-400">
                    CENTRE MÉDICAL & CLINIQUE
                  </div>
                  <div className="text-xs text-muted-foreground">Service des Consultations Médicales</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Antananarivo, Madagascar • Tél: +261 20 22 000 00</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-foreground">{previewDemande.medecin_nom || "Dr. Praticien"}</div>
                  <div className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">
                    {previewDemande.medecin_specialite || "Médecine Générale"}
                  </div>
                  {previewDemande.medecin_numero_ordre && (
                    <div className="text-[11px] text-muted-foreground">N° Ordre : {previewDemande.medecin_numero_ordre}</div>
                  )}
                </div>
              </div>

              {/* Infos Patient & Date */}
              <div className="grid grid-cols-2 gap-4 p-3.5 rounded-xl bg-muted/30 border border-border/60 text-xs">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold block mb-1">
                    Patient
                  </span>
                  <div className="text-sm font-bold text-foreground">
                    {previewDemande.patient_nom} {previewDemande.patient_prenom}
                  </div>
                  <div className="text-muted-foreground mt-0.5">
                    {getAge(previewDemande.patient_date_naissance) && `${getAge(previewDemande.patient_date_naissance)} • `}
                    {previewDemande.patient_contact && `Contact: ${previewDemande.patient_contact}`}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold block mb-1">
                    Prescription
                  </span>
                  <div className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                    {previewDemande.numero}
                  </div>
                  <div className="text-muted-foreground mt-0.5">
                    Délivrée le {new Date(previewDemande.date_creation).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>

              {/* Renseignements cliniques */}
              {previewDemande.renseignements_cliniques && (
                <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-xs text-cyan-900 dark:text-cyan-200">
                  <strong className="block mb-1 text-[11px] uppercase tracking-wider">
                    Renseignements cliniques / Diagnostic d&apos;orientation :
                  </strong>
                  <p className="whitespace-pre-line leading-relaxed">{previewDemande.renseignements_cliniques}</p>
                </div>
              )}

              {/* Tableau des examens */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 border-b border-border/60 pb-1.5">
                  Analyses biologiques & Explorations prescrites
                </div>
                <div className="divide-y divide-border/60 border border-border/60 rounded-xl overflow-hidden">
                  {(previewDemande.lignes || []).map((l, idx) => (
                    <div key={idx} className="p-3 flex items-start justify-between text-xs bg-card">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          <span className="text-muted-foreground font-mono font-bold text-[11px]">{idx + 1}.</span>
                          {l.nom_examen}
                        </div>
                        {l.instructions && (
                          <div className="text-[11px] text-muted-foreground pl-4 italic">
                            Précautions : {l.instructions}
                          </div>
                        )}
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-[10px] shrink-0 font-medium"
                      >
                        {l.categorie === "BIOLOGIE" ? "🔬 Biologie" : l.categorie === "IMAGERIE" ? "🩻 Imagerie" : "📋 Exploration"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mentions légales */}
              <div className="pt-3 border-t border-border/60 flex items-end justify-between text-[11px] text-muted-foreground">
                <p className="max-w-xs leading-relaxed">
                  À réaliser dans un laboratoire d&apos;analyses médicales ou centre d&apos;imagerie conventionné de votre choix.
                  Règlement direct auprès du prestataire.
                </p>
                <div className="text-center font-medium">
                  <div className="text-[10px] text-muted-foreground mb-4">Signature & Cachet</div>
                  <div className="border-t border-foreground/30 pt-1 text-foreground font-bold">
                    {previewDemande.medecin_nom || "Le Médecin"}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions footer */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={() => setPreviewDemande(null)} className="rounded-xl">
                Fermer
              </Button>
              <Button
                onClick={() => handlePrint(previewDemande)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl gap-2 shadow-xs"
              >
                <Printer size={16} weight="duotone" />
                Imprimer en format A4
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRÉATION DE DEMANDE D'EXAMENS */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <Flask size={22} weight="duotone" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Nouvelle demande d&apos;examens médicaux
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createMutation.mutate()
              }}
              className="space-y-4"
            >
              {/* Consultation Selector */}
              <div className="space-y-1.5">
                <Label htmlFor="exam-consultation" className="font-semibold text-xs text-foreground">
                  Consultation *
                </Label>
                <select
                  id="exam-consultation"
                  required
                  value={formConsultation}
                  onChange={(e) => setFormConsultation(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs sm:text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">-- Sélectionner une consultation du patient --</option>
                  {(consultations || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.patient_nom} {c.patient_prenom} — {c.motif || "Consultation"} ({new Date(c.date_consultation).toLocaleDateString("fr-FR")}){c.medecin_nom ? ` [Dr. ${c.medecin_nom}]` : ""}
                    </option>
                  ))}
                </select>

                {/* Recap de la consultation sélectionnée */}
                {(() => {
                  const selectedC = consultations?.find((c) => String(c.id) === String(formConsultation))
                  if (!selectedC) return null
                  return (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-muted/40 border border-border/70 text-xs mt-2">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                          <User size={15} weight="duotone" />
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">
                            {selectedC.patient_nom} {selectedC.patient_prenom}
                          </span>
                          <span className="text-muted-foreground ml-2">
                            • Consultation du {new Date(selectedC.date_consultation).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      </div>
                      {selectedC.medecin_nom && (
                        <div className="text-muted-foreground flex items-center gap-1.5 font-medium">
                          <Stethoscope size={14} weight="duotone" className="text-primary" />
                          Dr. {selectedC.medecin_nom}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* Renseignements cliniques */}
              <div className="space-y-1.5">
                <Label htmlFor="exam-renseignements" className="font-semibold text-xs text-foreground">
                  Renseignements cliniques
                </Label>
                <Textarea
                  id="exam-renseignements"
                  rows={2}
                  placeholder="Ex : Bilan préopératoire, suspicion de pneumopathie, fièvre inexpliquée..."
                  value={formRenseignements}
                  onChange={(e) => setFormRenseignements(e.target.value)}
                  className="rounded-xl text-xs sm:text-sm min-h-[64px]"
                />
              </div>

              {/* Lignes d'examens dynamiques */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-xs flex items-center gap-1.5">
                    <Microscope size={16} weight="duotone" className="text-primary" />
                    Examens prescrits ({formLignes.length}) *
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addLine}
                    className="h-8 text-xs rounded-xl gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <Plus size={14} weight="bold" />
                    Ajouter un examen
                  </Button>
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {formLignes.map((ligne, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-2.5 relative shadow-2xs hover:border-border transition-colors"
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-border/40">
                        <div className="flex items-center gap-2">
                          <span className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            Examen n°{idx + 1}
                          </span>
                        </div>
                        {formLignes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                            title="Supprimer cette ligne"
                          >
                            <Trash size={14} weight="duotone" />
                            <span>Supprimer</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2 space-y-1">
                          <Label className="text-xs font-medium">Nom de l&apos;examen *</Label>
                          <Input
                            required
                            placeholder="Ex : NFS + CRP, Radiographie pulmonaire..."
                            value={ligne.nom_examen}
                            onChange={(e) => updateLine(idx, "nom_examen", e.target.value)}
                            className="h-9 rounded-xl text-xs sm:text-sm"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Catégorie *</Label>
                          <select
                            value={ligne.categorie}
                            onChange={(e) =>
                              updateLine(idx, "categorie", e.target.value as "BIOLOGIE" | "IMAGERIE" | "AUTRE")
                            }
                            className="flex w-full h-9 rounded-xl border border-input bg-background px-2.5 text-xs sm:text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            {CATEGORIES_EXAMEN.map((cat) => (
                              <option key={cat.value} value={cat.value}>
                                {cat.icon} {cat.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Instructions / Précautions</Label>
                        <Input
                          placeholder="Ex : À jeun le matin, vessie pleine, face et profil..."
                          value={ligne.instructions || ""}
                          onChange={(e) => updateLine(idx, "instructions", e.target.value)}
                          className="h-9 rounded-xl text-xs sm:text-sm"
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
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-xs gap-1.5"
                >
                  <Flask size={16} weight="duotone" />
                  {createMutation.isPending ? "Création en cours..." : "Valider la prescription"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL MODIFICATION AVEC MOTIF OBLIGATOIRE */}
      {editModal.isOpen && editModal.demande && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <PencilSimple size={22} weight="duotone" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Modifier la demande {editModal.demande.numero}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setEditModal({
                    isOpen: false,
                    demande: null,
                    motif_correction: "",
                    renseignements_cliniques: "",
                    lignes: [],
                  })
                }
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                editMutation.mutate()
              }}
              className="space-y-4"
            >
              {/* Motif de correction obligatoire */}
              <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                <Label
                  htmlFor="edit-motif"
                  className="text-amber-900 dark:text-amber-200 font-bold flex items-center gap-1.5 text-xs"
                >
                  <WarningCircle size={16} weight="duotone" className="text-amber-600" />
                  Motif obligatoire de la modification *
                </Label>
                <Textarea
                  id="edit-motif"
                  required
                  rows={2}
                  placeholder="Ex : Précision du cliché radiologique, ajout d'un bilan complémentaire..."
                  value={editModal.motif_correction}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, motif_correction: e.target.value }))}
                  className="bg-background text-xs sm:text-sm rounded-xl"
                />
              </div>

              {/* Renseignements cliniques */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-renseignements" className="font-semibold text-xs text-foreground">
                  Renseignements cliniques
                </Label>
                <Textarea
                  id="edit-renseignements"
                  rows={2}
                  value={editModal.renseignements_cliniques}
                  onChange={(e) =>
                    setEditModal((prev) => ({ ...prev, renseignements_cliniques: e.target.value }))
                  }
                  className="rounded-xl text-xs sm:text-sm min-h-[64px]"
                />
              </div>

              {/* Lignes d'examens */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-xs flex items-center gap-1.5">
                    <Microscope size={16} weight="duotone" className="text-primary" />
                    Examens prescrits ({editModal.lignes.length})
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditModal((prev) => ({
                        ...prev,
                        lignes: [...prev.lignes, { nom_examen: "", categorie: "BIOLOGIE", instructions: "" }],
                      }))
                    }}
                    className="h-8 text-xs rounded-xl gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <Plus size={14} weight="bold" /> Ajouter un examen
                  </Button>
                </div>

                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {editModal.lignes.map((ligne, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-2.5 relative shadow-2xs hover:border-border transition-colors"
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-border/40">
                        <div className="flex items-center gap-2">
                          <span className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-foreground">Examen n°{idx + 1}</span>
                        </div>
                        {editModal.lignes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditModal((prev) => ({
                                ...prev,
                                lignes: prev.lignes.filter((_, i) => i !== idx),
                              }))
                            }}
                            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                          >
                            <Trash size={14} weight="duotone" />
                            <span>Supprimer</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2 space-y-1">
                          <Label className="text-xs font-medium">Nom de l&apos;examen *</Label>
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
                            className="h-9 rounded-xl text-xs sm:text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Catégorie *</Label>
                          <select
                            value={ligne.categorie}
                            onChange={(e) => {
                              const val = e.target.value as "BIOLOGIE" | "IMAGERIE" | "AUTRE"
                              setEditModal((prev) => {
                                const next = [...prev.lignes]
                                next[idx] = { ...next[idx], categorie: val }
                                return { ...prev, lignes: next }
                              })
                            }}
                            className="flex w-full h-9 rounded-xl border border-input bg-background px-2.5 text-xs sm:text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            {CATEGORIES_EXAMEN.map((cat) => (
                              <option key={cat.value} value={cat.value}>
                                {cat.icon} {cat.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Instructions / Précautions</Label>
                        <Input
                          placeholder="Instructions / Précautions"
                          value={ligne.instructions || ""}
                          onChange={(e) => {
                            const val = e.target.value
                            setEditModal((prev) => {
                              const next = [...prev.lignes]
                              next[idx] = { ...next[idx], instructions: val }
                              return { ...prev, lignes: next }
                            })
                          }}
                          className="h-9 rounded-xl text-xs sm:text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setEditModal({
                      isOpen: false,
                      demande: null,
                      motif_correction: "",
                      renseignements_cliniques: "",
                      lignes: [],
                    })
                  }
                  className="rounded-xl"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={editMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-xs gap-1.5"
                >
                  <PencilSimple size={16} weight="duotone" />
                  {editMutation.isPending ? "Modification..." : "Valider les modifications"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ANNULATION AVEC MOTIF OBLIGATOIRE */}
      {cancelModal.isOpen && cancelModal.demande && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2 text-red-600 dark:text-red-400">
                <Prohibit size={22} weight="duotone" />
                Annuler la demande {cancelModal.demande.numero}
              </h3>
              <button
                type="button"
                onClick={() => setCancelModal({ isOpen: false, demande: null, motif: "" })}
                className="rounded-xl p-1 text-muted-foreground hover:bg-muted"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                cancelMutation.mutate()
              }}
              className="space-y-4"
            >
              <p className="text-xs text-muted-foreground leading-relaxed">
                Une annulation est définitive. Elle préserve l&apos;intégrité médico-légale du dossier patient et enregistre le motif de suppression.
              </p>

              <div>
                <Label htmlFor="cancel-motif" className="font-semibold text-xs text-foreground">
                  Motif obligatoire de l&apos;annulation *
                </Label>
                <Textarea
                  id="cancel-motif"
                  required
                  rows={3}
                  placeholder="Ex : Erreur d'orientation, patient hospitalisé, examens réalisés sur place..."
                  value={cancelModal.motif}
                  onChange={(e) => setCancelModal((prev) => ({ ...prev, motif: e.target.value }))}
                  className="mt-1.5 rounded-xl text-xs"
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
          <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <ClockCounterClockwise size={22} weight="duotone" className="text-amber-600" />
                Audit Trail — Demande {historyModal.demande.numero}
              </h3>
              <button
                type="button"
                onClick={() => setHistoryModal({ isOpen: false, demande: null })}
                className="rounded-xl p-1 text-muted-foreground hover:bg-muted"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="space-y-4">
              {!historyModal.demande.historique || historyModal.demande.historique.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-4 text-center">
                  Aucune modification enregistrée pour cette demande.
                </p>
              ) : (
                historyModal.demande.historique.map((h, i) => (
                  <div key={h.id || i} className="p-4 rounded-2xl border border-border/80 bg-muted/20 text-xs space-y-2.5">
                    <div className="flex items-center justify-between text-muted-foreground border-b border-border/50 pb-2">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <User size={15} weight="duotone" />
                        {h.auteur_nom || "Praticien"}
                      </span>
                      <span className="text-[11px] font-mono">
                        {new Date(h.date_modification).toLocaleString("fr-FR")}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
                      <strong>Motif consigné :</strong> {h.motif_correction}
                    </div>

                    {h.anciennes_lignes && h.anciennes_lignes.length > 0 && (
                      <div className="text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground">Anciens examens prescrits :</span>
                        <ul className="list-disc pl-4 mt-1 space-y-0.5">
                          {h.anciennes_lignes.map((al, idx) => (
                            <li key={idx}>
                              {al.nom_examen} ({al.categorie})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-border/60">
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

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
  FileSignature, 
  Search, 
  RefreshCw, 
  Calendar, 
  User, 
  Stethoscope, 
  Plus, 
  Printer, 
  CreditCard,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Ban,
  History,
  Trash2,
  FileText,
  Clock,
  ShieldAlert,
  ChevronDown,
  ChevronUp
} from "lucide-react"

export interface LigneOrdonnance {
  id?: number
  medicament: string
  dosage?: string
  forme?: string
  dose_par_prise?: string
  voie_administration?: string
  frequence?: string
  duree?: string
  instructions?: string
  ordre?: number
}

export interface OrdonnanceHistorique {
  id: number
  auteur_nom: string
  date_modification: string
  motif_correction: string
  champs_modifies: string[]
  anciennes_lignes: LigneOrdonnance[]
  nouvelles_lignes: LigneOrdonnance[]
}

export interface Ordonnance {
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
  patient_allergies?: string
  patient_antecedents?: string
  medecin_id?: number
  medecin_nom: string
  medecin_specialite?: string
  medecin_numero_ordre?: string
  lignes?: LigneOrdonnance[]
  historique?: OrdonnanceHistorique[]
  medicaments: string
  posologie: string
  duree: string
  date_creation: string
  date_modification?: string
  facture_id?: number | null
  facture_statut?: string | null
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

const VOIES_ADMINISTRATION = [
  { value: "ORALE", label: "Orale (par la bouche)" },
  { value: "SUBLINGUALE", label: "Sublinguale" },
  { value: "INJECTABLE_IV", label: "Intraveineuse (IV)" },
  { value: "INJECTABLE_IM", label: "Intramusculaire (IM)" },
  { value: "INJECTABLE_SC", label: "Sous-cutanée (SC)" },
  { value: "CUTANEE", label: "Cutanée / Locale" },
  { value: "INHALATION", label: "Inhalation" },
  { value: "OCULAIRE", label: "Oculaire (collyre)" },
  { value: "AURICULAIRE", label: "Auriculaire" },
  { value: "NASALE", label: "Nasale" },
  { value: "RECTALE", label: "Rectale" },
  { value: "AUTRE", label: "Autre" }
]

const FORMES_PHARMACEUTIQUES = [
  "Comprimé", "Gélule", "Sirop", "Suspension buvable", 
  "Ampoule injectable", "Pommade", "Crème", "Collyre", 
  "Gouttes", "Sachet", "Suppositoire", "Aérosol", "Autre"
]

function getAge(dateNaissanceStr?: string): string {
  if (!dateNaissanceStr) return ""
  try {
    const birth = new Date(dateNaissanceStr)
    const now = new Date()
    let age = now.getFullYear() - birth.getFullYear()
    const m = now.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--
    }
    return age >= 0 ? `${age} ans` : ""
  } catch {
    return ""
  }
}

export default function OrdonnancesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [statutFilter, setStatutFilter] = useState<string>("ALL")
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editModal, setEditModal] = useState<{ isOpen: boolean; ordonnance: Ordonnance | null; motif: string }>({
    isOpen: false,
    ordonnance: null,
    motif: ""
  })
  const [historyModal, setHistoryModal] = useState<{ isOpen: boolean; ordonnance: Ordonnance | null }>({
    isOpen: false,
    ordonnance: null
  })
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; ordonnance: Ordonnance | null; motif: string }>({
    isOpen: false,
    ordonnance: null,
    motif: ""
  })
  const [expandedOrdId, setExpandedOrdId] = useState<number | null>(null)

  // Facture Médicaments Modal
  const [factureModal, setFactureModal] = useState<{
    isOpen: boolean
    ordonnance: Ordonnance | null
    designation: string
    montant: string
  }>({
    isOpen: false,
    ordonnance: null,
    designation: "",
    montant: ""
  })

  // Dynamic lines state for creation & edition
  const [formConsultation, setFormConsultation] = useState("")
  const [formLignes, setFormLignes] = useState<LigneOrdonnance[]>([
    {
      medicament: "",
      dosage: "",
      forme: "Comprimé",
      dose_par_prise: "1 cp",
      voie_administration: "ORALE",
      frequence: "3 fois par jour",
      duree: "5 jours",
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
    queryKey: ["ordonnances", search],
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: Ordonnance[] }>(`/prescriptions/`)
      return (data.results || []) as Ordonnance[]
    },
  })

  const { data: consultations } = useQuery({
    queryKey: ["consultations_list"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: Consultation[] }>(`/consultations/`)
      return (data.results || []) as Consultation[]
    },
    enabled: isCreateOpen
  })

  // Helpers for dynamic lines
  const addLine = () => {
    setFormLignes((prev) => [
      ...prev,
      {
        medicament: "",
        dosage: "",
        forme: "Comprimé",
        dose_par_prise: "1 cp",
        voie_administration: "ORALE",
        frequence: "3 fois par jour",
        duree: "5 jours",
        instructions: ""
      }
    ])
  }

  const updateLine = (index: number, field: keyof LigneOrdonnance, value: string) => {
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
      const payload = {
        consultation: Number(formConsultation),
        lignes: formLignes.map((l, idx) => ({ ...l, ordre: idx + 1 }))
      }
      return apiClient.post("/prescriptions/", payload)
    },
    onSuccess: () => {
      setIsCreateOpen(false)
      setFormConsultation("")
      setFormLignes([
        {
          medicament: "",
          dosage: "",
          forme: "Comprimé",
          dose_par_prise: "1 cp",
          voie_administration: "ORALE",
          frequence: "3 fois par jour",
          duree: "5 jours",
          instructions: ""
        }
      ])
      queryClient.invalidateQueries({ queryKey: ["ordonnances"] })
      showNotification("success", "Ordonnance rédigée et enregistrée avec succès.")
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.response?.data?.non_field_errors?.[0] || "Erreur lors de la création de l'ordonnance."
      showNotification("error", String(msg))
    }
  })

  // Update Mutation (Correction traçable)
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editModal.ordonnance) return
      const payload = {
        motif_correction: editModal.motif.trim(),
        lignes: formLignes.map((l, idx) => ({ ...l, ordre: idx + 1 }))
      }
      return apiClient.put(`/prescriptions/${editModal.ordonnance.id}/`, payload)
    },
    onSuccess: () => {
      setEditModal({ isOpen: false, ordonnance: null, motif: "" })
      queryClient.invalidateQueries({ queryKey: ["ordonnances"] })
      showNotification("success", "Ordonnance corrigée avec succès. L'historique d'audit a été mis à jour.")
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.motif_correction?.[0] || err?.response?.data?.detail || "Erreur lors de la modification de l'ordonnance."
      showNotification("error", String(msg))
    }
  })

  // Cancel Mutation (Annulation formelle)
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!cancelModal.ordonnance) return
      return apiClient.post(`/prescriptions/${cancelModal.ordonnance.id}/annuler/`, {
        motif: cancelModal.motif.trim()
      })
    },
    onSuccess: () => {
      setCancelModal({ isOpen: false, ordonnance: null, motif: "" })
      queryClient.invalidateQueries({ queryKey: ["ordonnances"] })
      showNotification("success", "Ordonnance annulée formellement.")
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || "Erreur lors de l'annulation de l'ordonnance."
      showNotification("error", String(msg))
    }
  })

  // Facture Médicaments Mutation
  const createFactureMedicamentsMutation = useMutation({
    mutationFn: async () => {
      if (!factureModal.ordonnance) return
      return apiClient.post("/billing/", {
        ordonnance: factureModal.ordonnance.id,
        patient: factureModal.ordonnance.patient_id || factureModal.ordonnance.patient,
        type: "MEDICAMENTS",
        designation: factureModal.designation,
        actes: factureModal.designation,
        montant: Number(factureModal.montant)
      })
    },
    onSuccess: () => {
      setFactureModal({ isOpen: false, ordonnance: null, designation: "", montant: "" })
      queryClient.invalidateQueries({ queryKey: ["factures"] })
      queryClient.invalidateQueries({ queryKey: ["ordonnances"] })
      showNotification("success", "Facture des médicaments délivrés créée avec succès.")
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.ordonnance?.[0] || err?.response?.data?.detail || "Erreur lors de la facturation des médicaments."
      showNotification("error", String(msg))
    }
  })

  // Impression Normalisée
  const handlePrint = (ord: Ordonnance) => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const patientAge = getAge(ord.patient_date_naissance)
    const hasLignes = ord.lignes && ord.lignes.length > 0

    const lignesRows = hasLignes
      ? ord.lignes!.map((l, index) => `
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
                <div class="label">Patient(e)</div>
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

  const isDoctor = currentUser?.role === "MEDECIN"
  const isSecretaireOrAdmin = currentUser?.role === "SECRETAIRE" || currentUser?.role === "ADMIN" || currentUser?.is_superuser

  // Filtration
  const filteredOrdonnances = (data || []).filter((ord) => {
    // Status filter
    if (statutFilter !== "ALL" && ord.statut !== statutFilter) return false

    // Search filter
    if (!search) return true
    const q = search.toLowerCase()
    return (
      ord.numero?.toLowerCase().includes(q) ||
      ord.patient_nom?.toLowerCase().includes(q) ||
      ord.patient_prenom?.toLowerCase().includes(q) ||
      ord.medecin_nom?.toLowerCase().includes(q) ||
      ord.medicaments?.toLowerCase().includes(q)
    )
  })

  // Open edit modal
  const openEditModal = (ord: Ordonnance) => {
    setEditModal({ isOpen: true, ordonnance: ord, motif: "" })
    if (ord.lignes && ord.lignes.length > 0) {
      setFormLignes(ord.lignes.map(l => ({ ...l })))
    } else {
      setFormLignes([
        {
          medicament: ord.medicaments || "",
          dosage: "",
          forme: "Comprimé",
          dose_par_prise: "1 cp",
          voie_administration: "ORALE",
          frequence: ord.posologie || "3 fois par jour",
          duree: ord.duree || "5 jours",
          instructions: ""
        }
      ])
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-5 ${
          notification.type === "success" ? "border border-emerald-500/30 bg-emerald-600 text-white" : "border border-red-500/30 bg-destructive text-white"
        }`}>
          {notification.type === "success" ? <CheckCircle2 className="size-5 shrink-0" /> : <AlertCircle className="size-5 shrink-0" />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2.5">
              <FileSignature className="size-7 text-primary" />
              Ordonnances Médicales
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Prescriptions sécurisées, lignes structurées, traçabilité des modifications et impression A4
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => refetch()} 
              title="Rafraîchir" 
              className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground"
            >
              <RefreshCw className="size-4" />
            </button>
            {isDoctor && (
              <button 
                onClick={() => {
                  setFormLignes([
                    {
                      medicament: "",
                      dosage: "",
                      forme: "Comprimé",
                      dose_par_prise: "1 cp",
                      voie_administration: "ORALE",
                      frequence: "3 fois par jour",
                      duree: "5 jours",
                      instructions: ""
                    }
                  ])
                  setIsCreateOpen(true)
                }} 
                className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <Plus className="size-4.5" />
                <span>Rédiger une ordonnance</span>
              </button>
            )}
          </div>
        </div>

        {/* Barre de recherche et filtres */}
        <Card className="border-border/80 shadow-xs rounded-2xl p-4 bg-card/60 backdrop-blur-xs">
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher par numéro (ORD-...), patient, médicament..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Statut :</span>
              <div className="flex rounded-xl bg-muted/50 p-1 border border-border/60 text-xs font-medium">
                {["ALL", "ACTIVE", "MODIFIEE", "ANNULEE"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatutFilter(st)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      statutFilter === st 
                        ? "bg-card text-foreground shadow-xs font-semibold" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {st === "ALL" ? "Toutes" : st === "ACTIVE" ? "Actives" : st === "MODIFIEE" ? "Modifiées" : "Annulées"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Tableau des ordonnances */}
        <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-border/60 bg-muted/20 py-3.5 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Registre officiel des ordonnances</CardTitle>
            <span className="text-xs text-muted-foreground">{filteredOrdonnances.length} ordonnance(s)</span>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <RefreshCw className="mx-auto size-5 animate-spin mb-2 text-primary" />
                Chargement des ordonnances...
              </div>
            ) : filteredOrdonnances.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                <FileSignature className="mx-auto size-10 mb-2 opacity-30" />
                <p className="font-medium text-foreground">Aucune ordonnance trouvée</p>
                <p className="text-xs text-muted-foreground mt-1">Les ordonnances rédigées lors des consultations apparaîtront ici.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-6">N° Ordonnance</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4">Médecin Prescripteur</th>
                      <th className="py-3 px-4">Prescription</th>
                      <th className="py-3 px-4">Statut & Facture</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredOrdonnances.map((ord) => {
                      const isExpanded = expandedOrdId === ord.id
                      const isAuthorDoctor = isDoctor && currentUser?.id === ord.medecin_id
                      const canModify = isAuthorDoctor && ord.statut !== "ANNULEE" && ord.facture_statut !== "PAYEE"

                      return (
                        <tr key={ord.id} className="transition-colors hover:bg-muted/30">
                          {/* Numéro officiel */}
                          <td className="py-3 px-6 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
                                {ord.numero}
                              </span>
                            </div>
                          </td>

                          {/* Date */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="flex items-center gap-1.5 text-foreground text-xs font-medium">
                              <Calendar className="size-3.5 text-muted-foreground" />
                              {new Date(ord.date_creation).toLocaleDateString("fr-FR")}
                            </span>
                          </td>

                          {/* Patient */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              <User className="size-3.5 text-muted-foreground shrink-0" />
                              <span>{ord.patient_nom} {ord.patient_prenom}</span>
                            </div>
                            {ord.patient_date_naissance && (
                              <span className="text-[11px] text-muted-foreground pl-5">
                                {getAge(ord.patient_date_naissance)}
                              </span>
                            )}
                          </td>

                          {/* Médecin */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 text-foreground font-medium text-xs">
                              <Stethoscope className="size-3.5 text-emerald-600 shrink-0" />
                              <span>{ord.medecin_nom}</span>
                            </div>
                            {ord.medecin_specialite && (
                              <span className="text-[11px] text-muted-foreground pl-5 block">
                                {ord.medecin_specialite}
                              </span>
                            )}
                          </td>

                          {/* Résumé Prescription */}
                          <td className="py-3 px-4">
                            <div className="max-w-[240px]">
                              {ord.lignes && ord.lignes.length > 0 ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {ord.lignes.slice(0, 2).map((l, idx) => (
                                      <span key={idx} className="inline-block text-[11px] bg-muted/80 text-foreground px-1.5 py-0.5 rounded border border-border/60">
                                        {l.medicament} {l.dosage || ""}
                                      </span>
                                    ))}
                                    {ord.lignes.length > 2 && (
                                      <span className="text-[10px] text-muted-foreground">+{ord.lignes.length - 2} autre(s)</span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => setExpandedOrdId(isExpanded ? null : ord.id)}
                                    className="text-[11px] text-primary hover:underline flex items-center gap-0.5 mt-0.5"
                                  >
                                    {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                                    {isExpanded ? "Masquer détails" : "Voir lignes détaillées"}
                                  </button>
                                </div>
                              ) : (
                                <div className="line-clamp-2 text-xs font-medium text-foreground" title={ord.medicaments}>
                                  {ord.medicaments}
                                </div>
                              )}

                              {/* Accordéon lignes structurées */}
                              {isExpanded && ord.lignes && (
                                <div className="mt-2 p-2 rounded-lg bg-card border border-border text-xs space-y-1.5 shadow-sm">
                                  {ord.lignes.map((l, idx) => (
                                    <div key={idx} className="border-b border-border/40 pb-1 last:border-none last:pb-0">
                                      <span className="font-semibold text-primary">{idx + 1}. {l.medicament}</span>
                                      {l.dosage && <span className="text-muted-foreground"> ({l.dosage})</span>}
                                      <div className="text-[11px] text-muted-foreground">
                                        {l.dose_par_prise} • {l.frequence} • {l.duree}
                                      </div>
                                      {l.instructions && (
                                        <div className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                                          💡 {l.instructions}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Statuts & Facturation */}
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              {/* Statut Ordonnance */}
                              <div>
                                {ord.statut === "ACTIVE" && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                    Active
                                  </span>
                                )}
                                {ord.statut === "MODIFIEE" && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                    Modifiée
                                  </span>
                                )}
                                {ord.statut === "ANNULEE" && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                                    Annulée
                                  </span>
                                )}
                              </div>

                              {/* Statut Facture Option A */}
                              <div>
                                {ord.facture_statut === "PAYEE" ? (
                                  <span className="inline-block text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                    ✓ Facture payée
                                  </span>
                                ) : ord.facture_statut === "IMPAYEE" ? (
                                  <span className="inline-block text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                    ⏳ Facture impayée
                                  </span>
                                ) : (
                                  <span className="inline-block text-[10px] text-muted-foreground">
                                    Non facturée
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Imprimer */}
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handlePrint(ord)} 
                                title="Imprimer l'ordonnance A4"
                                className="h-8 w-8 p-0 border-border bg-card hover:bg-muted text-foreground"
                              >
                                <Printer className="size-3.5 text-primary" />
                              </Button>

                              {/* Historique d'audit */}
                              {ord.statut === "MODIFIEE" && ord.historique && ord.historique.length > 0 && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => setHistoryModal({ isOpen: true, ordonnance: ord })} 
                                  title="Consulter l'historique d'audit des modifications"
                                  className="h-8 w-8 p-0 border-border bg-card hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-600"
                                >
                                  <History className="size-3.5" />
                                </Button>
                              )}

                              {/* Modifier (Médecin prescripteur uniquement) */}
                              {canModify && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => openEditModal(ord)} 
                                  title="Corriger l'ordonnance (avec motif d'audit)"
                                  className="h-8 w-8 p-0 border-border bg-card hover:bg-muted text-foreground"
                                >
                                  <Pencil className="size-3.5 text-blue-600" />
                                </Button>
                              )}

                              {/* Annuler (Médecin prescripteur uniquement) */}
                              {canModify && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => setCancelModal({ isOpen: true, ordonnance: ord, motif: "" })} 
                                  title="Annuler formellement l'ordonnance"
                                  className="h-8 w-8 p-0 border-border bg-card hover:bg-red-50 dark:hover:bg-red-950/30 text-destructive"
                                >
                                  <Ban className="size-3.5" />
                                </Button>
                              )}

                              {/* Facturer médicaments (Secrétaire / Admin) */}
                              {isSecretaireOrAdmin && !ord.facture_id && ord.statut !== "ANNULEE" && (
                                <Button
                                  size="sm"
                                  onClick={() => setFactureModal({
                                    isOpen: true,
                                    ordonnance: ord,
                                    designation: `Médicaments ordonnance ${ord.numero}`,
                                    montant: ""
                                  })}
                                  className="h-8 gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white font-medium"
                                  title="Facturer si délivré en interne"
                                >
                                  <CreditCard className="size-3.5" />
                                  <span className="hidden sm:inline">Facturer médicaments</span>
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
      </main>

      {/* MODAL RÉDIGER UNE ORDONNANCE (LIGNES STRUCTURÉES) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-3xl rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileSignature className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Rédiger une ordonnance médicale
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Numérotation automatique unique et prescription de médicaments structurés
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreateOpen(false)} 
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <XCircle className="size-5" />
              </button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="mt-5 flex flex-col gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Consultation médicale liée *</Label>
                <select 
                  required 
                  value={formConsultation} 
                  onChange={e => setFormConsultation(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Sélectionner une consultation</option>
                  {consultations?.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.patient_nom} {c.patient_prenom} — {c.motif} ({new Date(c.date_consultation).toLocaleDateString("fr-FR")})
                    </option>
                  ))}
                </select>
              </div>

              {/* Lignes structurées de médicaments */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Médicaments prescrits ({formLignes.length})
                  </Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addLine}
                    className="h-8 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10 rounded-lg"
                  >
                    <Plus className="size-3.5" /> Ajouter un médicament
                  </Button>
                </div>

                <div className="space-y-3">
                  {formLignes.map((ligne, idx) => (
                    <div key={idx} className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-3 relative">
                      <div className="flex items-center justify-between border-b border-border/40 pb-2">
                        <span className="text-xs font-bold text-foreground">
                          Médicament n°{idx + 1}
                        </span>
                        {formLignes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1"
                          >
                            <Trash2 className="size-3.5" /> Supprimer
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2 space-y-1">
                          <Label className="text-xs">Nom du médicament *</Label>
                          <Input 
                            required 
                            placeholder="Ex : Amoxicilline" 
                            value={ligne.medicament} 
                            onChange={e => updateLine(idx, "medicament", e.target.value)} 
                            className="rounded-xl h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Dosage / Concentration</Label>
                          <Input 
                            placeholder="Ex : 500 mg, 1 g" 
                            value={ligne.dosage || ""} 
                            onChange={e => updateLine(idx, "dosage", e.target.value)} 
                            className="rounded-xl h-9"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Forme</Label>
                          <select
                            value={ligne.forme || "Comprimé"}
                            onChange={e => updateLine(idx, "forme", e.target.value)}
                            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            {FORMES_PHARMACEUTIQUES.map(f => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Dose par prise</Label>
                          <Input 
                            placeholder="Ex : 1 cp, 1 cuillère" 
                            value={ligne.dose_par_prise || ""} 
                            onChange={e => updateLine(idx, "dose_par_prise", e.target.value)} 
                            className="rounded-xl h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Voie d&apos;administration</Label>
                          <select
                            value={ligne.voie_administration || "ORALE"}
                            onChange={e => updateLine(idx, "voie_administration", e.target.value)}
                            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            {VOIES_ADMINISTRATION.map(v => (
                              <option key={v.value} value={v.value}>{v.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Fréquence / Prises *</Label>
                          <Input 
                            required 
                            placeholder="Ex : 3 fois par jour, Matin et soir" 
                            value={ligne.frequence || ""} 
                            onChange={e => updateLine(idx, "frequence", e.target.value)} 
                            className="rounded-xl h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Durée *</Label>
                          <Input 
                            required 
                            placeholder="Ex : 7 jours, 1 mois" 
                            value={ligne.duree || ""} 
                            onChange={e => updateLine(idx, "duree", e.target.value)} 
                            className="rounded-xl h-9"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Instructions particulières</Label>
                        <Input 
                          placeholder="Ex : Prendre au milieu des repas, bien agiter avant emploi" 
                          value={ligne.instructions || ""} 
                          onChange={e => updateLine(idx, "instructions", e.target.value)} 
                          className="rounded-xl h-9"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl">
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending} 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
                >
                  {createMutation.isPending ? "Génération..." : "Valider l'ordonnance"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CORRECTION TRAÇABLE D'ORDONNANCE */}
      {editModal.isOpen && editModal.ordonnance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-3xl rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <Pencil className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Correction de l&apos;ordonnance {editModal.ordonnance.numero}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Patient : <strong>{editModal.ordonnance.patient_nom} {editModal.ordonnance.patient_prenom}</strong>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setEditModal({ isOpen: false, ordonnance: null, motif: "" })} 
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="mt-5 flex flex-col gap-5">
              {/* Alerte et Motif de correction obligatoire */}
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-xs">
                  <ShieldAlert className="size-4" />
                  Traçabilité réglementaire obligatoire
                </div>
                <p className="text-xs text-muted-foreground">
                  Conformément aux exigences médicales, tout changement sur une ordonnance validée doit être justifié et sera consigné dans l&apos;historique d&apos;audit.
                </p>
                <div className="space-y-1 pt-1">
                  <Label className="text-xs font-bold text-foreground">Motif médical de la correction *</Label>
                  <Textarea
                    required
                    rows={2}
                    placeholder="Ex : Remplacement pour intolérance digestive, adaptation de la posologie..."
                    value={editModal.motif}
                    onChange={(e) => setEditModal({ ...editModal, motif: e.target.value })}
                    className="rounded-xl text-xs bg-background"
                  />
                </div>
              </div>

              {/* Lignes modifiables */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Lignes de prescription ({formLignes.length})
                  </Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addLine}
                    className="h-8 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10 rounded-lg"
                  >
                    <Plus className="size-3.5" /> Ajouter un médicament
                  </Button>
                </div>

                <div className="space-y-3">
                  {formLignes.map((ligne, idx) => (
                    <div key={idx} className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-border/40 pb-2">
                        <span className="text-xs font-bold text-foreground">
                          Médicament n°{idx + 1}
                        </span>
                        {formLignes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1"
                          >
                            <Trash2 className="size-3.5" /> Supprimer
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2 space-y-1">
                          <Label className="text-xs">Nom du médicament *</Label>
                          <Input 
                            required 
                            value={ligne.medicament} 
                            onChange={e => updateLine(idx, "medicament", e.target.value)} 
                            className="rounded-xl h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Dosage</Label>
                          <Input 
                            value={ligne.dosage || ""} 
                            onChange={e => updateLine(idx, "dosage", e.target.value)} 
                            className="rounded-xl h-9"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Forme</Label>
                          <select
                            value={ligne.forme || "Comprimé"}
                            onChange={e => updateLine(idx, "forme", e.target.value)}
                            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            {FORMES_PHARMACEUTIQUES.map(f => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Dose par prise</Label>
                          <Input 
                            value={ligne.dose_par_prise || ""} 
                            onChange={e => updateLine(idx, "dose_par_prise", e.target.value)} 
                            className="rounded-xl h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Voie d&apos;administration</Label>
                          <select
                            value={ligne.voie_administration || "ORALE"}
                            onChange={e => updateLine(idx, "voie_administration", e.target.value)}
                            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            {VOIES_ADMINISTRATION.map(v => (
                              <option key={v.value} value={v.value}>{v.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Fréquence *</Label>
                          <Input 
                            required 
                            value={ligne.frequence || ""} 
                            onChange={e => updateLine(idx, "frequence", e.target.value)} 
                            className="rounded-xl h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Durée *</Label>
                          <Input 
                            required 
                            value={ligne.duree || ""} 
                            onChange={e => updateLine(idx, "duree", e.target.value)} 
                            className="rounded-xl h-9"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Instructions particulières</Label>
                        <Input 
                          value={ligne.instructions || ""} 
                          onChange={e => updateLine(idx, "instructions", e.target.value)} 
                          className="rounded-xl h-9"
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
                  onClick={() => setEditModal({ isOpen: false, ordonnance: null, motif: "" })} 
                  className="rounded-xl"
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending || !editModal.motif.trim()} 
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl"
                >
                  {updateMutation.isPending ? "Enregistrement..." : "Enregistrer la correction"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HISTORIQUE D'AUDIT */}
      {historyModal.isOpen && historyModal.ordonnance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <History className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Historique d&apos;audit — {historyModal.ordonnance.numero}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Traçabilité complète des corrections apportées
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setHistoryModal({ isOpen: false, ordonnance: null })} 
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {historyModal.ordonnance.historique?.map((h) => (
                <div key={h.id} className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground border-b border-border/40 pb-2">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <User className="size-3.5" />
                      {h.auteur_nom}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3.5" />
                      {new Date(h.date_modification).toLocaleString("fr-FR")}
                    </span>
                  </div>

                  <div>
                    <span className="font-bold text-amber-600 dark:text-amber-400">Motif : </span>
                    <span className="text-foreground">{h.motif_correction}</span>
                  </div>

                  {h.anciennes_lignes && h.anciennes_lignes.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/40">
                      <span className="font-semibold text-muted-foreground">Prescription initiale :</span>
                      <ul className="list-disc list-inside mt-1 space-y-0.5 text-muted-foreground">
                        {h.anciennes_lignes.map((l, i) => (
                          <li key={i}>{l.medicament} {l.dosage || ""} — {l.frequence} ({l.duree})</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {h.nouvelles_lignes && h.nouvelles_lignes.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/40">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">Nouvelle prescription :</span>
                      <ul className="list-disc list-inside mt-1 space-y-0.5 text-foreground font-medium">
                        {h.nouvelles_lignes.map((l, i) => (
                          <li key={i}>{l.medicament} {l.dosage || ""} — {l.frequence} ({l.duree})</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-5 border-t border-border/60 mt-4">
              <Button 
                variant="outline" 
                onClick={() => setHistoryModal({ isOpen: false, ordonnance: null })} 
                className="rounded-xl text-xs"
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ANNULATION MOTIVÉE */}
      {cancelModal.isOpen && cancelModal.ordonnance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-destructive/40 bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base font-bold text-destructive flex items-center gap-2">
                <Ban className="size-5" /> Annuler l&apos;ordonnance {cancelModal.ordonnance.numero}
              </h3>
              <button 
                onClick={() => setCancelModal({ isOpen: false, ordonnance: null, motif: "" })} 
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); cancelMutation.mutate(); }} className="mt-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Cette action marquera l&apos;ordonnance comme annulée. Un motif obligatoire doit être consigné.
              </p>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Motif d&apos;annulation *</Label>
                <Textarea 
                  required 
                  rows={3} 
                  placeholder="Ex : Erreur de diagnostic, prescription remplacée par un autre protocole..."
                  value={cancelModal.motif}
                  onChange={(e) => setCancelModal({ ...cancelModal, motif: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setCancelModal({ isOpen: false, ordonnance: null, motif: "" })} 
                  className="rounded-xl text-xs"
                >
                  Retour
                </Button>
                <Button 
                  type="submit" 
                  disabled={cancelMutation.isPending || !cancelModal.motif.trim()} 
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold rounded-xl text-xs"
                >
                  {cancelMutation.isPending ? "Annulation..." : "Confirmer l'annulation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FACTURER LES MÉDICAMENTS (OPTION A) */}
      {factureModal.isOpen && factureModal.ordonnance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <CreditCard className="size-5 text-primary" /> Facturer les médicaments (Délivrance interne)
              </h3>
              <button 
                onClick={() => setFactureModal({ isOpen: false, ordonnance: null, designation: "", montant: "" })} 
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); createFactureMedicamentsMutation.mutate(); }} className="mt-5 flex flex-col gap-4">
              <div className="rounded-xl bg-muted/40 p-3 text-xs space-y-1.5 border border-border/60">
                <p><strong>Patient :</strong> {factureModal.ordonnance.patient_nom} {factureModal.ordonnance.patient_prenom}</p>
                <p><strong>Prescription :</strong> Ordonnance n°{factureModal.ordonnance.numero}</p>
                <p className="text-muted-foreground truncate"><strong>Contenu :</strong> {factureModal.ordonnance.medicaments}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Désignation de la facture *</Label>
                <Input
                  required
                  value={factureModal.designation}
                  onChange={(e) => setFactureModal({ ...factureModal, designation: e.target.value })}
                  className="rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Montant total (Ar) *</Label>
                <Input
                  type="number"
                  step="100"
                  min="0"
                  required
                  placeholder="Ex : 25000"
                  value={factureModal.montant}
                  onChange={(e) => setFactureModal({ ...factureModal, montant: e.target.value })}
                  className="rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setFactureModal({ isOpen: false, ordonnance: null, designation: "", montant: "" })}
                  className="rounded-xl text-xs"
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={createFactureMedicamentsMutation.isPending || !factureModal.montant}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-xs"
                >
                  {createFactureMedicamentsMutation.isPending ? "Création..." : "Générer la facture"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

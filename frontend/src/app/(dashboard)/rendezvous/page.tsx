"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { CurrentUser } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Stethoscope, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  XCircle,
  RefreshCw,
  Search,
  FileText,
  Edit,
  Trash2,
  List,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  Ban,
  AlertTriangle
} from "lucide-react"

interface Patient {
  id: number
  nom: string
  prenom: string
  contact: string
}

interface Medecin {
  id: number
  nom: string
  prenom: string
  email: string
  specialite: string
  numero_ordre?: string
  date_absence?: string | null
  absent_aujourdhui: boolean
}

interface RendezVous {
  id: number
  patient: number
  patient_nom: string
  patient_contact: string
  medecin: number
  medecin_nom: string
  medecin_absent_aujourdhui?: boolean
  date_heure: string
  statut: "PLANIFIE" | "CONFIRME" | "ANNULE" | "TERMINE"
  motif: string
  consultation_id?: number | null
}

interface ConsultationData {
  id: number
  patient: number
  patient_nom: string
  patient_prenom: string
  medecin_nom: string
  rendez_vous: number | null
  date_consultation: string
  motif: string
  observations: string
  diagnostic: string
  compte_rendu?: string
}

interface RendezVousListResponse {
  count: number
  next: string | null
  previous: string | null
  results: RendezVous[]
}

interface PatientListResponse {
  count: number
  results: Patient[]
}

const TIME_SLOTS_30MIN = [
  "08:00", "08:30",
  "09:00", "09:30",
  "10:00", "10:30",
  "11:00", "11:30",
  "12:00", "12:30",
  "14:00", "14:30",
  "15:00", "15:30",
  "16:00", "16:30",
  "17:00", "17:30"
]

export default function RendezVousPage() {
  const queryClient = useQueryClient()

  // Vue globale : Liste ou Calendrier
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")
  const [calendarView, setCalendarView] = useState<"day" | "week">("day")
  const [calendarDate, setCalendarDate] = useState<Date>(new Date())

  // Filtres et recherche
  const [search, setSearch] = useState("")
  const [statutFilter, setStatutFilter] = useState<string>("ALL")
  const [medecinFilter, setMedecinFilter] = useState<string>("ALL")
  const [dateFilterMode, setDateFilterMode] = useState<"none" | "single" | "range">("none")
  const [singleDate, setSingleDate] = useState<string>("")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Modales
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isConsultOpen, setIsConsultOpen] = useState(false)
  const [isConsultReadOnlyOpen, setIsConsultReadOnlyOpen] = useState(false)
  const [selectedRdv, setSelectedRdv] = useState<RendezVous | null>(null)
  const [existingConsultation, setExistingConsultation] = useState<ConsultationData | null>(null)

  // Notifications et erreurs de formulaire
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Formulaire RDV (sans durée)
  const [form, setForm] = useState({
    patient: "",
    medecin: "",
    date: "",
    heure: "",
    motif: "",
  })

  // Formulaire Consultation
  const [consultForm, setConsultForm] = useState({
    motif: "",
    observations: "",
    diagnostic: "",
    compte_rendu: ""
  })

  function showNotification(type: "success" | "error", message: string) {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr))
    }, 5000)
  }

  function extractErrorMessage(err: unknown, fallback: string): string {
    if (typeof err === "object" && err !== null && "response" in err) {
      const resp = (err as { response?: { data?: Record<string, unknown> } }).response
      if (resp?.data) {
        if (resp.data.date_heure) {
          const val = resp.data.date_heure
          return Array.isArray(val) ? val.join(" ") : String(val)
        }
        if (resp.data.statut) {
          const val = resp.data.statut
          return Array.isArray(val) ? val.join(" ") : String(val)
        }
        if (resp.data.detail) {
          return String(resp.data.detail)
        }
        if (resp.data.rendez_vous) {
          const val = resp.data.rendez_vous
          return Array.isArray(val) ? val.join(" ") : String(val)
        }
        const firstKey = Object.keys(resp.data)[0]
        if (firstKey) {
          const val = resp.data[firstKey]
          return `${firstKey}: ${Array.isArray(val) ? val.join(" ") : String(val)}`
        }
      }
    }
    return fallback
  }

  // 1. Profil de l'utilisateur connecté
  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await apiClient.get<CurrentUser>("/accounts/me/")
      return data
    },
  })

  // 2. Médecins
  const { data: medecinsData = [] } = useQuery<Medecin[]>({
    queryKey: ["medecins"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: Medecin[] } | Medecin[]>("/medecins/")
      return Array.isArray(data) ? data : data.results || []
    },
  })

  // Profil médecin connecté (si MEDECIN)
  const connectedMedecinProfile = useMemo(() => {
    if (currentUser?.role !== "MEDECIN") return null
    return medecinsData.find(m => m.id === currentUser.medecin_id || m.email === currentUser.email)
  }, [currentUser, medecinsData])

  // 3. Patients
  const { data: patientsData = [] } = useQuery<Patient[]>({
    queryKey: ["patients_light"],
    queryFn: async () => {
      const { data } = await apiClient.get<PatientListResponse>("/patients/")
      return data.results
    },
  })

  // 4. Liste des RDV avec tous les filtres
  const { data: rdvData, isLoading, refetch } = useQuery<RendezVousListResponse>({
    queryKey: [
      "rendezvous", 
      search, 
      statutFilter, 
      medecinFilter, 
      dateFilterMode, 
      singleDate, 
      startDate, 
      endDate, 
      currentPage,
      viewMode,
      calendarDate.toISOString()
    ],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (statutFilter !== "ALL") params.append("statut", statutFilter)
      if (currentUser?.role !== "MEDECIN" && medecinFilter !== "ALL") {
        params.append("medecin", medecinFilter)
      }
      
      if (viewMode === "list") {
        params.append("page", currentPage.toString())
        if (dateFilterMode === "single" && singleDate) {
          params.append("date", singleDate)
        } else if (dateFilterMode === "range") {
          if (startDate) params.append("date_debut", startDate)
          if (endDate) params.append("date_fin", endDate)
        }
      } else {
        // En vue calendrier : charger la plage de la semaine ou du jour sélectionné
        if (calendarView === "day") {
          const y = calendarDate.getFullYear()
          const m = String(calendarDate.getMonth() + 1).padStart(2, "0")
          const d = String(calendarDate.getDate()).padStart(2, "0")
          params.append("date", `${y}-${m}-${d}`)
        } else {
          // Semaine : du lundi au dimanche
          const curr = new Date(calendarDate)
          const first = curr.getDate() - (curr.getDay() === 0 ? 6 : curr.getDay() - 1)
          const firstDay = new Date(curr.setDate(first))
          const lastDay = new Date(curr.setDate(first + 6))
          const fmt = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
          params.append("date_debut", fmt(firstDay))
          params.append("date_fin", fmt(lastDay))
        }
      }

      const { data } = await apiClient.get<RendezVousListResponse>(`/rendezvous/?${params.toString()}`)
      return data
    },
  })

  // Mutations

  // Mutation présence médecin
  const updatePresenceMutation = useMutation({
    mutationFn: async ({ medecinId, absent }: { medecinId: number; absent: boolean }) => {
      return apiClient.post(`/medecins/${medecinId}/presence/`, { absent })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medecins"] })
      queryClient.invalidateQueries({ queryKey: ["me"] })
      queryClient.invalidateQueries({ queryKey: ["rendezvous"] })
      showNotification("success", "Statut de présence mis à jour avec succès.")
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de la modification de présence.")
      showNotification("error", msg)
    }
  })

  // Mutation création RDV (sans duree_minutes)
  const createMutation = useMutation({
    mutationFn: async () => {
      setFormError(null)
      const payload = {
        patient: Number(form.patient),
        medecin: Number(form.medecin),
        date_heure: new Date(`${form.date}T${form.heure}:00`).toISOString(),
        motif: form.motif
      }
      return apiClient.post("/rendezvous/", payload)
    },
    onSuccess: () => {
      setIsCreateOpen(false)
      setForm({ patient: "", medecin: "", date: "", heure: "", motif: "" })
      queryClient.invalidateQueries({ queryKey: ["rendezvous"] })
      showNotification("success", "Rendez-vous planifié avec succès.")
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de la planification.")
      setFormError(msg)
      showNotification("error", msg)
    },
  })

  // Mutation mise à jour RDV (sans duree_minutes)
  const updateFullMutation = useMutation({
    mutationFn: async () => {
      setFormError(null)
      const payload = {
        patient: Number(form.patient),
        medecin: Number(form.medecin),
        date_heure: new Date(`${form.date}T${form.heure}:00`).toISOString(),
        motif: form.motif
      }
      return apiClient.patch(`/rendezvous/${selectedRdv?.id}/`, payload)
    },
    onSuccess: () => {
      setIsEditOpen(false)
      setSelectedRdv(null)
      setForm({ patient: "", medecin: "", date: "", heure: "", motif: "" })
      queryClient.invalidateQueries({ queryKey: ["rendezvous"] })
      showNotification("success", "Rendez-vous modifié avec succès.")
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de la modification.")
      setFormError(msg)
      showNotification("error", msg)
    },
  })

  // Mutation changement de statut RDV
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, statut }: { id: number; statut: string }) => 
      apiClient.patch(`/rendezvous/${id}/`, { statut }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rendezvous"] })
      showNotification("success", "Statut du rendez-vous mis à jour.")
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Transition de statut interdite.")
      showNotification("error", msg)
    },
  })

  // Mutation Annuler un RDV
  const cancelMutation = useMutation({
    mutationFn: async (id: number) => apiClient.post(`/rendezvous/${id}/annuler/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rendezvous"] })
      showNotification("success", "Rendez-vous annulé. Le créneau est désormais libre.")
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de l'annulation.")
      showNotification("error", msg)
    }
  })

  // Mutation Suppression RDV (Admin)
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/rendezvous/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rendezvous"] })
      showNotification("success", "Rendez-vous définitivement supprimé.")
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de la suppression.")
      showNotification("error", msg)
    },
  })

  // Mutation Création Consultation
  const createConsultationMutation = useMutation({
    mutationFn: async () => apiClient.post("/consultations/", { 
      ...consultForm, 
      rendez_vous: selectedRdv?.id,
      patient: selectedRdv?.patient
    }),
    onSuccess: () => {
      setIsConsultOpen(false)
      setConsultForm({ motif: "", observations: "", diagnostic: "", compte_rendu: "" })
      setSelectedRdv(null)
      queryClient.invalidateQueries({ queryKey: ["rendezvous"] })
      showNotification("success", "Consultation enregistrée avec succès. Rendez-vous passé à Terminé.")
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Erreur lors de l'enregistrement de la consultation.")
      showNotification("error", msg)
    },
  })

  // Ouvrir consultation : consultation existante ou rédaction
  async function handleOpenConsultation(rdv: RendezVous) {
    setSelectedRdv(rdv)
    try {
      const { data } = await apiClient.get<{ results: ConsultationData[] }>(`/consultations/?rendez_vous=${rdv.id}`)
      if (data.results && data.results.length > 0) {
        setExistingConsultation(data.results[0])
        setIsConsultReadOnlyOpen(true)
      } else {
        setConsultForm({
          motif: rdv.motif || "",
          observations: "",
          diagnostic: "",
          compte_rendu: ""
        })
        setIsConsultOpen(true)
      }
    } catch {
      setConsultForm({
        motif: rdv.motif || "",
        observations: "",
        diagnostic: "",
        compte_rendu: ""
      })
      setIsConsultOpen(true)
    }
  }

  // Ouvrir formulaire de création pré-rempli depuis le calendrier (créneau fixe 30 min)
  function handleSlotClick(dateStr: string, timeStr: string, medecinId?: number, isSlotBusy?: boolean) {
    if (currentUser?.role !== "ADMIN" && currentUser?.role !== "SECRETAIRE") return
    if (isSlotBusy) {
      showNotification("error", "Ce créneau a déjà un rendez-vous à cette heure exacte. Impossible de planifier deux rendez-vous à la même heure.")
      return
    }
    setForm({
      patient: "",
      medecin: medecinId ? medecinId.toString() : (medecinsData[0]?.id.toString() || ""),
      date: dateStr,
      heure: timeStr,
      motif: ""
    })
    setFormError(null)
    setIsCreateOpen(true)
  }

  // Détection si médecin sélectionné est absent aujourd'hui
  const selectedMedecinInForm = useMemo(() => {
    return medecinsData.find(m => m.id.toString() === form.medecin)
  }, [medecinsData, form.medecin])

  const todayStr = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  }, [])

  const isSelectedDoctorAbsentToday = useMemo(() => {
    return Boolean(form.date === todayStr && selectedMedecinInForm?.absent_aujourdhui)
  }, [form.date, todayStr, selectedMedecinInForm])

  // Badge Statut
  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case "PLANIFIE":
        return <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400">Planifié</span>
      case "CONFIRME":
        return <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-400">Confirmé</span>
      case "ANNULE":
        return <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-900/30 dark:text-rose-400">Annulé</span>
      case "TERMINE":
        return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-500/20 dark:bg-slate-800 dark:text-slate-400">Terminé</span>
      default:
        return <span>{statut}</span>
    }
  }

  // Calcul pagination
  const totalCount = rdvData?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / 20))

  return (
    <div className="flex-1 flex flex-col">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-5 ${notification.type === "success" ? "border border-emerald-500/30 bg-emerald-600 text-white" : "border border-red-500/30 bg-destructive text-white"}`}>
          {notification.type === "success" ? <CheckCircle2 className="size-5 shrink-0" /> : <AlertCircle className="size-5 shrink-0" />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2.5">
              <CalendarIcon className="size-7 text-primary" />
              Agenda &amp; Rendez-vous
              <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-foreground">
                {totalCount}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gérez les rendez-vous des patients et le planning médical en temps réel
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Interrupteur Présence pour Médecin connecté */}
            {currentUser?.role === "MEDECIN" && connectedMedecinProfile && (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 shadow-xs">
                <span className="text-xs font-medium text-muted-foreground">Ma présence aujourd&apos;hui :</span>
                <button
                  type="button"
                  onClick={() => updatePresenceMutation.mutate({
                    medecinId: connectedMedecinProfile.id,
                    absent: !connectedMedecinProfile.absent_aujourdhui
                  })}
                  disabled={updatePresenceMutation.isPending}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all shadow-xs ${
                    connectedMedecinProfile.absent_aujourdhui
                      ? "bg-rose-500 text-white hover:bg-rose-600"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                >
                  {connectedMedecinProfile.absent_aujourdhui ? (
                    <>
                      <Ban className="size-3.5" />
                      Absent aujourd&apos;hui
                    </>
                  ) : (
                    <>
                      <Check className="size-3.5" />
                      Présent aujourd&apos;hui
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Bascule Vue Liste / Calendrier */}
            <div className="flex items-center rounded-xl border border-border bg-card p-1 shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "list" 
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="size-3.5" />
                Liste
              </button>
              <button
                type="button"
                onClick={() => setViewMode("calendar")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "calendar" 
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CalendarDays className="size-3.5" />
                Calendrier
              </button>
            </div>

            <button 
              onClick={() => refetch()} 
              title="Rafraîchir" 
              className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground"
            >
              <RefreshCw className="size-4" />
            </button>

            {(currentUser?.role === "ADMIN" || currentUser?.role === "SECRETAIRE") && (
              <button 
                onClick={() => {
                  setForm({
                    patient: "",
                    medecin: medecinsData[0]?.id.toString() || "",
                    date: todayStr,
                    heure: "09:00",
                    motif: ""
                  })
                  setFormError(null)
                  setIsCreateOpen(true)
                }} 
                className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <Plus className="size-4" />
                <span>Nouveau RDV</span>
              </button>
            )}
          </div>
        </div>

        {/* Barre de filtres avancée */}
        <Card className="border-border/80 shadow-xs rounded-2xl p-4 bg-card/60 backdrop-blur-xs">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Recherche textuelle */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher par patient, motif..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
                className="h-9 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>

            {/* Filtre Statut */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground shrink-0">Statut :</span>
              <select
                value={statutFilter}
                onChange={(e) => {
                  setStatutFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="h-9 rounded-xl border border-border bg-background px-2.5 text-xs font-medium shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="PLANIFIE">Planifié</option>
                <option value="CONFIRME">Confirmé</option>
                <option value="ANNULE">Annulé</option>
                <option value="TERMINE">Terminé</option>
              </select>
            </div>

            {/* Filtre Médecin (masqué si l'utilisateur est un médecin) */}
            {currentUser?.role !== "MEDECIN" && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground shrink-0">Médecin :</span>
                <select
                  value={medecinFilter}
                  onChange={(e) => {
                    setMedecinFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="h-9 rounded-xl border border-border bg-background px-2.5 text-xs font-medium shadow-xs focus:outline-none focus:ring-1 focus:ring-primary max-w-[200px]"
                >
                  <option value="ALL">Tous les médecins</option>
                  {medecinsData.map((m) => (
                    <option key={m.id} value={m.id.toString()}>
                      Dr. {m.nom} {m.prenom} {m.absent_aujourdhui ? "(Absent)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtres Date (Uniquement pertinent pour le mode Liste) */}
            {viewMode === "list" && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={dateFilterMode}
                  onChange={(e) => {
                    setDateFilterMode(e.target.value as "none" | "single" | "range")
                    setCurrentPage(1)
                  }}
                  className="h-9 rounded-xl border border-border bg-background px-2 text-xs font-medium shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="none">Toutes dates</option>
                  <option value="single">Date précise</option>
                  <option value="range">Intervalle</option>
                </select>

                {dateFilterMode === "single" && (
                  <Input
                    type="date"
                    value={singleDate}
                    onChange={(e) => {
                      setSingleDate(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="h-9 text-xs w-[140px]"
                  />
                )}

                {dateFilterMode === "range" && (
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="date"
                      value={startDate}
                      placeholder="Début"
                      onChange={(e) => {
                        setStartDate(e.target.value)
                        setCurrentPage(1)
                      }}
                      className="h-9 text-xs w-[130px]"
                    />
                    <span className="text-xs text-muted-foreground">à</span>
                    <Input
                      type="date"
                      value={endDate}
                      placeholder="Fin"
                      onChange={(e) => {
                        setEndDate(e.target.value)
                        setCurrentPage(1)
                      }}
                      className="h-9 text-xs w-[130px]"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* AFFICHAGE : LISTE OU CALENDRIER */}
        {viewMode === "list" ? (
          <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/60 bg-muted/20 py-3.5 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Rendez-vous programmés</CardTitle>
              <span className="text-xs text-muted-foreground">
                Page {currentPage} sur {totalPages} ({totalCount} résultat{totalCount > 1 ? "s" : ""})
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  <RefreshCw className="mx-auto size-5 animate-spin mb-2 text-primary" />
                  Chargement de l&apos;agenda…
                </div>
              ) : rdvData?.results.length === 0 ? (
                <div className="py-20 text-center text-sm text-muted-foreground">
                  <CalendarIcon className="mx-auto size-10 mb-2 opacity-30" />
                  <p className="font-medium text-foreground">Aucun rendez-vous trouvé</p>
                  <p className="text-xs mt-1">Modifiez vos filtres ou planifiez un nouveau créneau.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="py-3 px-6">Date &amp; Heure</th>
                        <th className="py-3 px-4">Patient</th>
                        <th className="py-3 px-4">Médecin</th>
                        <th className="py-3 px-4">Statut</th>
                        <th className="py-3 px-4">Motif</th>
                        <th className="py-3 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {rdvData?.results.map((rdv) => {
                        const rdvDateStr = new Date(rdv.date_heure).toISOString().slice(0, 10)
                        const isToday = rdvDateStr === todayStr
                        const isDoctorAbsentToday = isToday && Boolean(rdv.medecin_absent_aujourdhui)

                        return (
                          <tr key={rdv.id} className="transition-colors hover:bg-muted/30">
                            {/* Date & Heure */}
                            <td className="py-3 px-6 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Clock className="size-4 text-primary" />
                                <span className="font-medium text-foreground">
                                  {new Date(rdv.date_heure).toLocaleString("fr-FR", {
                                    day: "2-digit", month: "2-digit", year: "numeric",
                                    hour: "2-digit", minute: "2-digit"
                                  })}
                                </span>
                              </div>
                            </td>

                            {/* Patient */}
                            <td className="py-3 px-4">
                              <div className="font-semibold text-foreground flex items-center gap-1.5">
                                <User className="size-3.5 text-muted-foreground" />
                                {rdv.patient_nom}
                              </div>
                              <div className="text-[11px] text-muted-foreground ml-5">
                                {rdv.patient_contact || "Aucun contact"}
                              </div>
                            </td>

                            {/* Médecin avec badge d'absence */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 font-medium text-foreground">
                                <Stethoscope className="size-3.5 text-emerald-600" />
                                <span>{rdv.medecin_nom}</span>
                              </div>
                              {isDoctorAbsentToday && (
                                <span className="inline-flex items-center gap-1 mt-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-400">
                                  <AlertTriangle className="size-3" />
                                  Médecin absent
                                </span>
                              )}
                            </td>

                            {/* Statut avec menu de transitions autorisées */}
                            <td className="py-3 px-4">
                              {(currentUser?.role === "ADMIN" || currentUser?.role === "SECRETAIRE") && (rdv.statut === "PLANIFIE" || rdv.statut === "CONFIRME") ? (
                                <select
                                  value={rdv.statut}
                                  onChange={(e) => updateStatusMutation.mutate({ id: rdv.id, statut: e.target.value })}
                                  className="text-xs font-semibold rounded-lg border border-border bg-background px-2.5 py-1 shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                  {rdv.statut === "PLANIFIE" && (
                                    <>
                                      <option value="PLANIFIE">Planifié</option>
                                      <option value="CONFIRME">Confirmé</option>
                                      <option value="ANNULE">Annulé</option>
                                    </>
                                  )}
                                  {rdv.statut === "CONFIRME" && (
                                    <>
                                      <option value="CONFIRME">Confirmé</option>
                                      <option value="ANNULE">Annulé</option>
                                    </>
                                  )}
                                </select>
                              ) : (
                                getStatusBadge(rdv.statut)
                              )}
                            </td>

                            {/* Motif */}
                            <td className="py-3 px-4 text-muted-foreground truncate max-w-[200px]" title={rdv.motif}>
                              {rdv.motif || <span className="italic opacity-50">Non renseigné</span>}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-6 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Médecin : bouton Consulter */}
                                {currentUser?.role === "MEDECIN" && (rdv.statut === "CONFIRME" || rdv.statut === "TERMINE") && (
                                  <button
                                    onClick={() => handleOpenConsultation(rdv)}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 dark:bg-primary/20 dark:text-primary-foreground"
                                  >
                                    {rdv.statut === "TERMINE" ? <Eye className="size-3.5" /> : <FileText className="size-3.5" />}
                                    {rdv.statut === "TERMINE" ? "Voir Consultation" : "Consulter"}
                                  </button>
                                )}

                                {/* Secrétaire & Admin : Éditer si non définitif */}
                                {(currentUser?.role === "ADMIN" || currentUser?.role === "SECRETAIRE") && (rdv.statut === "PLANIFIE" || rdv.statut === "CONFIRME") && (
                                  <button
                                    onClick={() => {
                                      setSelectedRdv(rdv)
                                      const dateObj = new Date(rdv.date_heure)
                                      const localDateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`
                                      setForm({
                                        patient: rdv.patient.toString(),
                                        medecin: rdv.medecin.toString(),
                                        date: localDateStr,
                                        heure: dateObj.toTimeString().slice(0, 5),
                                        motif: rdv.motif || ""
                                      })
                                      setFormError(null)
                                      setIsEditOpen(true)
                                    }}
                                    title="Modifier le rendez-vous"
                                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                                  >
                                    <Edit className="size-3.5" />
                                    Éditer
                                  </button>
                                )}

                                {/* Secrétaire & Admin : Bouton Annuler avec confirmation */}
                                {(currentUser?.role === "ADMIN" || currentUser?.role === "SECRETAIRE") && (rdv.statut === "PLANIFIE" || rdv.statut === "CONFIRME") && (
                                  <button
                                    onClick={() => {
                                      if (window.confirm("Êtes-vous sûr de vouloir annuler ce rendez-vous ? Le créneau horaire sera libéré.")) {
                                        cancelMutation.mutate(rdv.id)
                                      }
                                    }}
                                    title="Annuler le rendez-vous"
                                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400"
                                  >
                                    <Ban className="size-3.5" />
                                    Annuler
                                  </button>
                                )}

                                {/* Admin : Bouton Supprimer définitivement */}
                                {currentUser?.role === "ADMIN" && rdv.statut !== "TERMINE" && !rdv.consultation_id && (
                                  <button
                                    onClick={() => {
                                      if (window.confirm("Voulez-vous vraiment supprimer définitivement ce rendez-vous ?")) {
                                        deleteMutation.mutate(rdv.id)
                                      }
                                    }}
                                    title="Supprimer définitivement"
                                    className="inline-flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
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

              {/* Barre de pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border/60 px-6 py-3 bg-muted/10">
                  <span className="text-xs text-muted-foreground">
                    Affichage page {currentPage} sur {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium shadow-xs disabled:opacity-40 hover:bg-muted"
                    >
                      <ChevronLeft className="size-3.5" />
                      Précédent
                    </button>
                    <span className="text-xs font-semibold px-2">{currentPage}</span>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium shadow-xs disabled:opacity-40 hover:bg-muted"
                    >
                      Suivant
                      <ChevronRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* VUE CALENDRIER - CRÉNEAUX FIXES VISUELS DE 30 MINUTES */
          <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden p-6 bg-card">
            {/* Contrôles du calendrier */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-border/60">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const next = new Date(calendarDate)
                    if (calendarView === "day") next.setDate(next.getDate() - 1)
                    else next.setDate(next.getDate() - 7)
                    setCalendarDate(next)
                  }}
                  className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarDate(new Date())}
                  className="px-3 py-1 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted text-foreground"
                >
                  Aujourd&apos;hui
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = new Date(calendarDate)
                    if (calendarView === "day") next.setDate(next.getDate() + 1)
                    else next.setDate(next.getDate() + 7)
                    setCalendarDate(next)
                  }}
                  className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground"
                >
                  <ChevronRight className="size-4" />
                </button>

                <h2 className="text-base font-bold text-foreground capitalize ml-2">
                  {calendarDate.toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
                  <button
                    type="button"
                    onClick={() => setCalendarView("day")}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      calendarView === "day" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    Vue Jour
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarView("week")}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      calendarView === "week" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    Vue Semaine
                  </button>
                </div>
              </div>
            </div>

            {/* Légende des statuts et signalement */}
            <div className="flex flex-wrap items-center gap-4 py-3 text-xs text-muted-foreground border-b border-border/40">
              <span className="font-medium">Créneau d&apos;affichage fixe 30 min :</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-blue-500" /> Planifié</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-emerald-500" /> Confirmé</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-rose-500" /> Annulé</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-slate-400" /> Terminé</span>
              <span className="flex items-center gap-1.5 text-rose-600 font-bold"><AlertTriangle className="size-3.5" /> 2 RDV même heure = Impossible</span>
            </div>

            {/* Grille du calendrier */}
            <div className="mt-4 overflow-x-auto">
              {calendarView === "day" ? (
                /* VUE JOUR PAR MÉDECIN */
                <div className="min-w-[700px]">
                  <div className="grid grid-cols-[80px_repeat(auto-fit,minmax(180px,1fr))] border-b border-border/60 pb-2">
                    <div className="text-xs font-bold text-muted-foreground text-center">Créneau</div>
                    {medecinsData
                      .filter(m => currentUser?.role !== "MEDECIN" || m.id === currentUser.medecin_id)
                      .map(m => (
                        <div key={m.id} className="text-xs font-bold text-center px-2">
                          <div>Dr. {m.nom} {m.prenom}</div>
                          <div className="text-[10px] text-muted-foreground font-normal">{m.specialite}</div>
                          {m.absent_aujourdhui && calendarDate.toISOString().slice(0, 10) === todayStr && (
                            <span className="inline-block mt-0.5 text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 px-1.5 rounded">
                              Absent aujourd&apos;hui
                            </span>
                          )}
                        </div>
                      ))}
                  </div>

                  <div className="divide-y divide-border/40">
                    {TIME_SLOTS_30MIN.map(slot => (
                      <div key={slot} className="grid grid-cols-[80px_repeat(auto-fit,minmax(180px,1fr))] min-h-[52px] items-stretch">
                        <div className="py-2 text-xs font-semibold text-muted-foreground text-center border-r border-border/40 flex items-center justify-center">
                          {slot}
                        </div>
                        {medecinsData
                          .filter(m => currentUser?.role !== "MEDECIN" || m.id === currentUser.medecin_id)
                          .map(m => {
                            const dateSelectedStr = calendarDate.toISOString().slice(0, 10)
                            const rdvsForSlot = (rdvData?.results || []).filter(rdv => {
                              const dt = new Date(rdv.date_heure)
                              const rdvDate = dt.toISOString().slice(0, 10)
                              const hours = String(dt.getHours()).padStart(2, "0")
                              const mins = String(dt.getMinutes()).padStart(2, "0")
                              return rdv.medecin === m.id && rdvDate === dateSelectedStr && `${hours}:${mins}` === slot
                            })

                            const activeRdvs = rdvsForSlot.filter(r => r.statut === "PLANIFIE" || r.statut === "CONFIRME")
                            const hasConflict = activeRdvs.length > 1
                            const isSlotBusy = activeRdvs.length >= 1

                            return (
                              <div
                                key={m.id}
                                onClick={() => {
                                  if (!isSlotBusy) {
                                    handleSlotClick(dateSelectedStr, slot, m.id, false)
                                  } else {
                                    handleSlotClick(dateSelectedStr, slot, m.id, true)
                                  }
                                }}
                                className={`p-1 border-r border-border/30 transition-colors ${
                                  hasConflict 
                                    ? "bg-rose-100/70 border-rose-400 dark:bg-rose-950/40" 
                                    : isSlotBusy 
                                    ? "bg-muted/20" 
                                    : "hover:bg-muted/30 cursor-pointer"
                                }`}
                              >
                                {hasConflict && (
                                  <div className="mb-1 rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white flex items-center gap-1 shadow-xs animate-pulse">
                                    <AlertTriangle className="size-3 shrink-0" />
                                    Conflit : 2 RDV à la même heure impossible !
                                  </div>
                                )}

                                {rdvsForSlot.map(rdv => {
                                  let bgBadge = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                                  if (rdv.statut === "CONFIRME") bgBadge = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  if (rdv.statut === "ANNULE") bgBadge = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                                  if (rdv.statut === "TERMINE") bgBadge = "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300"

                                  return (
                                    <div
                                      key={rdv.id}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (currentUser?.role === "MEDECIN" && (rdv.statut === "CONFIRME" || rdv.statut === "TERMINE")) {
                                          handleOpenConsultation(rdv)
                                        }
                                      }}
                                      className={`rounded-md border p-1.5 text-xs shadow-2xs mb-1 cursor-pointer transition-transform hover:scale-[1.01] ${bgBadge}`}
                                    >
                                      <div className="font-bold flex items-center justify-between">
                                        <span>{new Date(rdv.date_heure).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                                        <span className="text-[9px] uppercase font-bold">{rdv.statut}</span>
                                      </div>
                                      <div className="font-semibold truncate">{rdv.patient_nom}</div>
                                      {rdv.motif && <div className="text-[10px] truncate opacity-80">{rdv.motif}</div>}
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          })}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* VUE SEMAINE (Lundi au Dimanche) */
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-border/60 pb-2">
                    <div className="text-xs font-bold text-muted-foreground text-center">Créneau</div>
                    {[0, 1, 2, 3, 4, 5, 6].map(dayOffset => {
                      const curr = new Date(calendarDate)
                      const first = curr.getDate() - (curr.getDay() === 0 ? 6 : curr.getDay() - 1)
                      const d = new Date(curr.setDate(first + dayOffset))
                      const isCurrentDay = d.toISOString().slice(0, 10) === todayStr
                      return (
                        <div key={dayOffset} className={`text-xs font-bold text-center px-1 ${isCurrentDay ? "text-primary" : "text-foreground"}`}>
                          <div>{d.toLocaleDateString("fr-FR", { weekday: "short" })}</div>
                          <div className={`text-[11px] font-semibold mt-0.5 inline-block px-1.5 rounded-full ${isCurrentDay ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                            {d.getDate()} {d.toLocaleDateString("fr-FR", { month: "short" })}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="divide-y divide-border/40">
                    {TIME_SLOTS_30MIN.map(slot => (
                      <div key={slot} className="grid grid-cols-[80px_repeat(7,1fr)] min-h-[48px] items-stretch">
                        <div className="py-1 text-xs font-semibold text-muted-foreground text-center border-r border-border/40 flex items-center justify-center">
                          {slot}
                        </div>
                        {[0, 1, 2, 3, 4, 5, 6].map(dayOffset => {
                          const curr = new Date(calendarDate)
                          const first = curr.getDate() - (curr.getDay() === 0 ? 6 : curr.getDay() - 1)
                          const d = new Date(curr.setDate(first + dayOffset))
                          const dayDateStr = d.toISOString().slice(0, 10)

                          const rdvsForSlot = (rdvData?.results || []).filter(rdv => {
                            const dt = new Date(rdv.date_heure)
                            const rdvDate = dt.toISOString().slice(0, 10)
                            const hours = String(dt.getHours()).padStart(2, "0")
                            const mins = String(dt.getMinutes()).padStart(2, "0")
                            return rdvDate === dayDateStr && `${hours}:${mins}` === slot
                          })

                          const activeRdvs = rdvsForSlot.filter(r => r.statut === "PLANIFIE" || r.statut === "CONFIRME")
                          const hasConflict = activeRdvs.length > 1
                          const isSlotBusy = activeRdvs.length >= 1

                          return (
                            <div
                              key={dayOffset}
                              onClick={() => {
                                if (!isSlotBusy) {
                                  handleSlotClick(dayDateStr, slot, undefined, false)
                                } else {
                                  handleSlotClick(dayDateStr, slot, undefined, true)
                                }
                              }}
                              className={`p-1 border-r border-border/30 transition-colors ${
                                hasConflict 
                                  ? "bg-rose-100/70 border-rose-400 dark:bg-rose-950/40" 
                                  : isSlotBusy 
                                  ? "bg-muted/20" 
                                  : "hover:bg-muted/30 cursor-pointer"
                              }`}
                            >
                              {hasConflict && (
                                <div className="mb-1 rounded bg-rose-600 px-1 py-0.5 text-[9px] font-bold text-white flex items-center gap-1 shadow-xs animate-pulse">
                                  <AlertTriangle className="size-2.5 shrink-0" />
                                  Conflit heure !
                                </div>
                              )}

                              {rdvsForSlot.map(rdv => {
                                let bgBadge = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                                if (rdv.statut === "CONFIRME") bgBadge = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                                if (rdv.statut === "ANNULE") bgBadge = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                                if (rdv.statut === "TERMINE") bgBadge = "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300"

                                return (
                                  <div
                                    key={rdv.id}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (currentUser?.role === "MEDECIN" && (rdv.statut === "CONFIRME" || rdv.statut === "TERMINE")) {
                                        handleOpenConsultation(rdv)
                                      }
                                    }}
                                    className={`rounded border p-1 text-[11px] shadow-2xs mb-1 cursor-pointer truncate ${bgBadge}`}
                                  >
                                    <div className="font-bold flex items-center justify-between">
                                      <span>{new Date(rdv.date_heure).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                                    </div>
                                    <div className="font-semibold truncate">{rdv.patient_nom}</div>
                                    <div className="text-[10px] truncate opacity-75">{rdv.medecin_nom}</div>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </main>

      {/* MODAL CRÉATION NOUVEAU RDV (SANS CHAMP DURÉE) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <CalendarIcon className="size-5 text-primary" /> Planifier un nouveau rendez-vous
              </h3>
              <button 
                type="button" 
                onClick={() => setIsCreateOpen(false)} 
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium">
                <AlertCircle className="size-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="mt-5 flex flex-col gap-4">
              {/* Patient */}
              <div className="space-y-1">
                <Label>Patient *</Label>
                <select 
                  required 
                  value={form.patient} 
                  onChange={e => setForm({...form, patient: e.target.value})}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Sélectionner un patient</option>
                  {patientsData?.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
                </select>
              </div>

              {/* Médecin avec statut de présence */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label>Médecin *</Label>
                  {selectedMedecinInForm && (
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        selectedMedecinInForm.absent_aujourdhui
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                      }`}>
                        {selectedMedecinInForm.absent_aujourdhui ? "Absent aujourd'hui" : "Présent"}
                      </span>
                      {(currentUser?.role === "ADMIN" || currentUser?.role === "SECRETAIRE") && (
                        <button
                          type="button"
                          onClick={() => updatePresenceMutation.mutate({
                            medecinId: selectedMedecinInForm.id,
                            absent: !selectedMedecinInForm.absent_aujourdhui
                          })}
                          className="text-[10px] text-primary hover:underline font-semibold"
                        >
                          (Bascule)
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <select 
                  required 
                  value={form.medecin} 
                  onChange={e => setForm({...form, medecin: e.target.value})}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Sélectionner un médecin</option>
                  {medecinsData?.map(m => (
                    <option key={m.id} value={m.id}>
                      Dr. {m.nom} {m.prenom} - {m.specialite} [{m.absent_aujourdhui ? "Absent aujourd'hui" : "Présent"}]
                    </option>
                  ))}
                </select>

                {isSelectedDoctorAbsentToday && (
                  <p className="mt-1 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="size-4 shrink-0" />
                    Ce médecin est absent aujourd&apos;hui. Veuillez sélectionner une autre date ou un autre médecin.
                  </p>
                )}
              </div>

              {/* Date & Heure */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Date *</Label>
                  <Input 
                    type="date" 
                    required 
                    value={form.date} 
                    onChange={e => setForm({...form, date: e.target.value})} 
                  />
                </div>
                <div className="space-y-1">
                  <Label>Heure *</Label>
                  <Input 
                    type="time" 
                    required 
                    value={form.heure} 
                    onChange={e => setForm({...form, heure: e.target.value})} 
                  />
                </div>
              </div>

              {/* Motif */}
              <div className="space-y-1">
                <Label>Motif du rendez-vous</Label>
                <Input 
                  value={form.motif} 
                  onChange={e => setForm({...form, motif: e.target.value})} 
                  placeholder="Consultation de suivi, bilan..." 
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || isSelectedDoctorAbsentToday} 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  {createMutation.isPending ? "Enregistrement..." : "Confirmer le rendez-vous"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ÉDITION RDV (SANS CHAMP DURÉE) */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Edit className="size-5 text-primary" /> Modifier le rendez-vous
              </h3>
              <button 
                type="button" 
                onClick={() => setIsEditOpen(false)} 
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium">
                <AlertCircle className="size-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); updateFullMutation.mutate(); }} className="mt-5 flex flex-col gap-4">
              <div className="space-y-1">
                <Label>Patient *</Label>
                <select 
                  required 
                  value={form.patient} 
                  onChange={e => setForm({...form, patient: e.target.value})}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Sélectionner un patient</option>
                  {patientsData?.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <Label>Médecin *</Label>
                <select 
                  required 
                  value={form.medecin} 
                  onChange={e => setForm({...form, medecin: e.target.value})}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Sélectionner un médecin</option>
                  {medecinsData?.map(m => (
                    <option key={m.id} value={m.id}>
                      Dr. {m.nom} {m.prenom} - {m.specialite} [{m.absent_aujourdhui ? "Absent" : "Présent"}]
                    </option>
                  ))}
                </select>
                {isSelectedDoctorAbsentToday && (
                  <p className="mt-1 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="size-4 shrink-0" />
                    Ce médecin est absent aujourd&apos;hui. Déplacement impossible à la date du jour.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Date *</Label>
                  <Input 
                    type="date" 
                    required 
                    value={form.date} 
                    onChange={e => setForm({...form, date: e.target.value})} 
                  />
                </div>
                <div className="space-y-1">
                  <Label>Heure *</Label>
                  <Input 
                    type="time" 
                    required 
                    value={form.heure} 
                    onChange={e => setForm({...form, heure: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Motif du rendez-vous</Label>
                <Input 
                  value={form.motif} 
                  onChange={e => setForm({...form, motif: e.target.value})} 
                  placeholder="Consultation de suivi..." 
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Annuler</Button>
                <Button 
                  type="submit" 
                  disabled={updateFullMutation.isPending || isSelectedDoctorAbsentToday} 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  {updateFullMutation.isPending ? "Modification..." : "Enregistrer les modifications"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RÉDACTION DE CONSULTATION */}
      {isConsultOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <FileText className="size-5 text-primary" /> Rédiger la consultation
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Patient : <strong className="text-foreground">{selectedRdv?.patient_nom}</strong> — RDV du {selectedRdv && new Date(selectedRdv.date_heure).toLocaleString("fr-FR")}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsConsultOpen(false)} 
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); createConsultationMutation.mutate(); }} className="mt-5 flex flex-col gap-4">
              <div className="space-y-1">
                <Label>Motif de consultation *</Label>
                <Input 
                  required 
                  value={consultForm.motif} 
                  onChange={e => setConsultForm({...consultForm, motif: e.target.value})} 
                  placeholder="Ex: Douleurs abdominales, fièvre..." 
                />
              </div>

              <div className="space-y-1">
                <Label>Observations cliniques</Label>
                <textarea 
                  value={consultForm.observations} 
                  onChange={e => setConsultForm({...consultForm, observations: e.target.value})} 
                  placeholder="Constantes vitales : tension, température, auscultation, examen clinique..."
                  className="flex min-h-[90px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="space-y-1">
                <Label>Diagnostic</Label>
                <textarea 
                  value={consultForm.diagnostic} 
                  onChange={e => setConsultForm({...consultForm, diagnostic: e.target.value})} 
                  placeholder="Hypothèse ou conclusion diagnostique..."
                  className="flex min-h-[70px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="space-y-1">
                <Label>Compte rendu médical</Label>
                <textarea 
                  value={consultForm.compte_rendu} 
                  onChange={e => setConsultForm({...consultForm, compte_rendu: e.target.value})} 
                  placeholder="Compte rendu détaillé, recommandations, ordonnance ou protocole thérapeutique..."
                  className="flex min-h-[90px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
                <Button type="button" variant="outline" onClick={() => setIsConsultOpen(false)}>Annuler</Button>
                <Button 
                  type="submit" 
                  disabled={createConsultationMutation.isPending} 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  {createConsultationMutation.isPending ? "Enregistrement..." : "Valider et Terminer le RDV"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONSULTATION EXISTANTE (LECTURE SEULE) */}
      {isConsultReadOnlyOpen && existingConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Eye className="size-5 text-emerald-600" /> Consultation médicale (Terminée)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Consultation du {new Date(existingConsultation.date_consultation).toLocaleString("fr-FR")} — {existingConsultation.medecin_nom}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsConsultReadOnlyOpen(false)} 
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm">
              <div className="rounded-xl bg-muted/40 p-3 border border-border/60">
                <span className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Patient</span>
                <span className="font-bold text-foreground">{existingConsultation.patient_nom} {existingConsultation.patient_prenom}</span>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Motif</span>
                <div className="p-3 rounded-lg border border-border/60 bg-background text-foreground font-medium">
                  {existingConsultation.motif}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Observations cliniques</span>
                <div className="p-3 rounded-lg border border-border/60 bg-background text-foreground whitespace-pre-wrap">
                  {existingConsultation.observations || <span className="italic text-muted-foreground">Aucune observation renseignée</span>}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Diagnostic</span>
                <div className="p-3 rounded-lg border border-border/60 bg-background text-foreground font-semibold whitespace-pre-wrap">
                  {existingConsultation.diagnostic || <span className="italic text-muted-foreground font-normal">Non renseigné</span>}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Compte rendu médical</span>
                <div className="p-3 rounded-lg border border-border/60 bg-background text-foreground whitespace-pre-wrap">
                  {existingConsultation.compte_rendu || <span className="italic text-muted-foreground">Aucun compte rendu rédigé</span>}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-5 border-t border-border/60 mt-6">
              <Button type="button" onClick={() => setIsConsultReadOnlyOpen(false)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

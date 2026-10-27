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
  AlertTriangle
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

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ordonnance - ${ord.patient_nom || selectedConsultation?.patient_nom}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 40px; color: #1e293b; }
            .header { text-align: center; border-bottom: 2px solid #0f766e; padding-bottom: 20px; margin-bottom: 30px; }
            .brand { color: #0f766e; font-size: 1.4em; font-weight: bold; margin-bottom: 4px; }
            .doctor-info { font-weight: bold; font-size: 1.1em; margin-top: 10px; }
            .patient-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 30px; }
            .content { min-height: 350px; }
            .medicaments { white-space: pre-wrap; font-size: 1.05em; line-height: 1.8; margin-top: 15px; font-weight: 500; }
            .posology-item { margin-top: 10px; color: #475569; font-size: 0.95em; }
            .footer { margin-top: 40px; text-align: right; }
            .signature { border-top: 1px dashed #64748b; display: inline-block; padding-top: 8px; width: 220px; text-align: center; font-size: 0.9em; color: #475569; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">CENTRE MÉDICAL GESTION PATIENTS</div>
            <div class="doctor-info">${ord.medecin_nom || selectedConsultation?.medecin_nom}</div>
            <div style="font-size: 0.9em; color: #64748b;">Date de prescription : ${new Date(ord.date_creation).toLocaleDateString("fr-FR")}</div>
          </div>
          <div class="patient-box">
            <strong>Patient :</strong> ${selectedConsultation?.patient_nom} ${selectedConsultation?.patient_prenom}
          </div>
          <div class="content">
            <h3 style="color: #0f766e; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">PRESCRIPTION MÉDICALE</h3>
            <div class="medicaments">${ord.medicaments}</div>
            <div class="posology-item"><strong>Posologie :</strong> ${ord.posologie}</div>
            <div class="posology-item"><strong>Durée du traitement :</strong> ${ord.duree}</div>
          </div>
          <div class="footer">
            <div class="signature">
              Signature et Cachet du Médecin<br/><br/><br/>
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

  return (
    <div className="flex-1 flex flex-col">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-in slide-in-from-top-2 duration-200 ${
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

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2.5">
              <FileText className="size-7 text-primary" />
              Toutes les consultations
              <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-foreground">
                {data?.count ?? 0}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Historique global des consultations médicales de l&apos;établissement
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
          </div>
        </div>

        {/* Barre de filtres */}
        <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden p-4 bg-muted/10">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Recherche */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher patient, motif, diagnostic..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>

            {/* Filtres par date */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="size-3.5" />
                <span>Du :</span>
              </div>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => {
                  setDateDebut(e.target.value)
                  setPage(1)
                }}
                className="h-10 rounded-xl border border-border bg-background px-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-1">
                <span>Au :</span>
              </div>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => {
                  setDateFin(e.target.value)
                  setPage(1)
                }}
                className="h-10 rounded-xl border border-border bg-background px-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />

              {(search || dateDebut || dateFin) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-10 rounded-xl text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  <FilterX className="size-3.5" /> Réinitialiser
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Tableau des consultations */}
        <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden mt-1">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <CardTitle className="text-base font-semibold">Registre des consultations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <RefreshCw className="mx-auto size-5 animate-spin mb-2 text-primary" />
                Chargement des consultations…
              </div>
            ) : data?.results.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                <FileText className="mx-auto size-10 mb-2 opacity-30" />
                <p className="font-medium text-foreground">Aucune consultation trouvée</p>
                <p className="text-xs text-muted-foreground mt-1">Modifiez vos critères de recherche ou réinitialisez les filtres.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-6">Date</th>
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4">Médecin</th>
                      <th className="py-3 px-4">Motif</th>
                      <th className="py-3 px-4">Diagnostic</th>
                      <th className="py-3 px-4">Paiement</th>
                      <th className="py-3 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {data?.results.map((c) => (
                      <tr 
                        key={c.id} 
                        onClick={() => handleOpenDetail(c)}
                        className="transition-colors hover:bg-muted/30 cursor-pointer"
                      >
                        <td className="py-3 px-6 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="size-4 text-primary" />
                            <span className="font-medium text-foreground">
                              {new Date(c.date_consultation).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <User className="size-3.5 text-muted-foreground" />
                            {c.patient_nom} {c.patient_prenom}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                            <Stethoscope className="size-3.5 text-primary" />
                            {c.medecin_nom}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground truncate max-w-[180px]" title={c.motif}>
                          {c.motif || "-"}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground truncate max-w-[180px]" title={c.diagnostic}>
                          {c.diagnostic || "-"}
                        </td>
                        <td className="py-3 px-4">
                          {c.statut_paiement === "PAYE" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400">
                              <CheckCircle2 className="size-3" /> Payé
                            </span>
                          )}
                          {c.statut_paiement === "IMPAYE" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-400">
                              Impayé
                            </span>
                          )}
                          {(!c.statut_paiement || c.statut_paiement === "GRATUIT") && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300">
                              Gratuit
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetail(c)}
                            className="rounded-lg h-8 px-2.5 gap-1.5 text-xs"
                          >
                            <Eye className="size-3.5 text-primary" /> Détails
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {data && data.count > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/60 px-6 py-4 bg-muted/10 text-xs text-muted-foreground">
                <div>
                  Page <strong className="text-foreground">{page}</strong> sur <strong className="text-foreground">{totalPages}</strong> ({data.count} consultations)
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 gap-1 rounded-lg"
                  >
                    <ChevronLeft className="size-4" /> Précédent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 gap-1 rounded-lg"
                  >
                    Suivant <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* MODAL VUE DÉTAIL D'UNE CONSULTATION (LECTURE / MODIFICATION AUTEUR) */}
      {selectedConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Eye className="size-5 text-emerald-600" />
                  {isEditing ? "Modifier la consultation" : "Détail de la consultation"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Consultation du {new Date(selectedConsultation.date_consultation).toLocaleString("fr-FR")} — {selectedConsultation.medecin_nom}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedConsultation(null)
                  setIsEditing(false)
                }}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            {isEditing ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  updateMutation.mutate()
                }}
                className="mt-5 space-y-4 text-sm"
              >
                <div className="rounded-xl bg-muted/40 p-3 border border-border/60">
                  <span className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Patient</span>
                  <span className="font-bold text-foreground">
                    {selectedConsultation.patient_nom} {selectedConsultation.patient_prenom}
                  </span>
                </div>

                {/* Motif de correction OBLIGATOIRE */}
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-1.5">
                  <Label htmlFor="detail-edit-motif-corr" className="text-amber-900 dark:text-amber-300 font-bold flex items-center gap-1.5">
                    <History className="size-4" /> Motif obligatoire de la modification *
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Conformément aux exigences de traçabilité médicale, tout changement apporté à une consultation validée doit être justifié et consigné dans l&apos;audit trail.
                  </p>
                  <Input
                    id="detail-edit-motif-corr"
                    value={editForm.motif_correction}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, motif_correction: e.target.value }))}
                    placeholder="Ex: Correction diagnostique suite aux examens d&apos;imagerie..."
                    required
                    className="mt-1 bg-background"
                  />
                </div>

                <div>
                  <Label htmlFor="detail-edit-motif">Motif de consultation *</Label>
                  <Input
                    id="detail-edit-motif"
                    value={editForm.motif}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, motif: e.target.value }))}
                    required
                    className="mt-1"
                  />
                </div>

                {/* Constantes vitales */}
                <div className="rounded-xl border border-border/70 p-3 bg-muted/20 space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Activity className="size-3.5 text-primary" /> Constantes physiologiques
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div>
                      <span className="text-[10px] text-muted-foreground">Temp. (°C)</span>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="37.0"
                        value={editForm.constantes.temperature}
                        onChange={(e) => setEditForm((prev) => ({
                          ...prev,
                          constantes: { ...prev.constantes, temperature: e.target.value }
                        }))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Tension (12/8)</span>
                      <Input
                        placeholder="120/80"
                        value={editForm.constantes.tension_arterielle}
                        onChange={(e) => setEditForm((prev) => ({
                          ...prev,
                          constantes: { ...prev.constantes, tension_arterielle: e.target.value }
                        }))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Pouls (bpm)</span>
                      <Input
                        type="number"
                        placeholder="72"
                        value={editForm.constantes.frequence_cardiaque}
                        onChange={(e) => setEditForm((prev) => ({
                          ...prev,
                          constantes: { ...prev.constantes, frequence_cardiaque: e.target.value }
                        }))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Poids (kg)</span>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="70"
                        value={editForm.constantes.poids}
                        onChange={(e) => setEditForm((prev) => ({
                          ...prev,
                          constantes: { ...prev.constantes, poids: e.target.value }
                        }))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Taille (cm)</span>
                      <Input
                        type="number"
                        step="0.5"
                        placeholder="175"
                        value={editForm.constantes.taille}
                        onChange={(e) => setEditForm((prev) => ({
                          ...prev,
                          constantes: { ...prev.constantes, taille: e.target.value }
                        }))}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="detail-edit-obs">Observations cliniques</Label>
                  <textarea
                    id="detail-edit-obs"
                    value={editForm.observations}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, observations: e.target.value }))}
                    rows={3}
                    className="mt-1 flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div>
                  <Label htmlFor="detail-edit-diag">Diagnostic *</Label>
                  <textarea
                    id="detail-edit-diag"
                    value={editForm.diagnostic}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, diagnostic: e.target.value }))}
                    rows={3}
                    required
                    className="mt-1 flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring font-semibold"
                  />
                </div>

                <div>
                  <Label htmlFor="detail-edit-cr">Compte rendu médical</Label>
                  <textarea
                    id="detail-edit-cr"
                    value={editForm.compte_rendu}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, compte_rendu: e.target.value }))}
                    rows={3}
                    className="mt-1 flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div>
                  <Label htmlFor="detail-edit-date-ctrl">Date de contrôle recommandée (indicatif)</Label>
                  <Input
                    id="detail-edit-date-ctrl"
                    type="date"
                    value={editForm.date_controle_recommandee}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, date_controle_recommandee: e.target.value }))}
                    className="mt-1 max-w-xs"
                  />
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Sélectionnez une date précise sur le calendrier. Ne réserve aucun créneau et ne génère aucun rendez-vous automatique.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-5 border-t border-border/60 mt-6">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  >
                    {updateMutation.isPending ? "Enregistrement..." : "Enregistrer la modification"}
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <div className="mt-5 space-y-4 text-sm">
                  <div className="rounded-xl bg-muted/40 p-3 border border-border/60 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Patient</span>
                      <span className="font-bold text-foreground">
                        {selectedConsultation.patient_nom} {selectedConsultation.patient_prenom}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Paiement visite</span>
                      {selectedConsultation.statut_paiement === "PAYE" && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400">
                          <CheckCircle2 className="size-3" /> Payé
                        </span>
                      )}
                      {selectedConsultation.statut_paiement === "IMPAYE" && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-400">
                          Impayé
                        </span>
                      )}
                      {(!selectedConsultation.statut_paiement || selectedConsultation.statut_paiement === "GRATUIT") && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300">
                          Gratuit
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bannière Allergies & Antécédents */}
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide">
                      <AlertTriangle className="size-4 shrink-0" />
                      Dossier patient — Données médicales clés
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="bg-background/90 p-2.5 rounded-lg border border-border/50">
                        <span className="font-semibold text-rose-700 dark:text-rose-400 block mb-0.5">⚠️ Allergies connues :</span>
                        <span className="text-foreground">{selectedConsultation.patient_allergies || <span className="italic text-muted-foreground">Aucune allergie signalée</span>}</span>
                      </div>
                      <div className="bg-background/90 p-2.5 rounded-lg border border-border/50">
                        <span className="font-semibold text-blue-700 dark:text-blue-400 block mb-0.5">📋 Antécédents médicaux :</span>
                        <span className="text-foreground">{selectedConsultation.patient_antecedents || <span className="italic text-muted-foreground">Aucun antécédent répertorié</span>}</span>
                      </div>
                    </div>
                  </div>

                  {/* Constantes vitales */}
                  {selectedConsultation.constantes && (
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                      <span className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                        <Activity className="size-3.5 text-primary" /> Constantes physiologiques
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                        <div className="bg-card p-2 rounded-lg border border-border/60 text-center">
                          <span className="text-muted-foreground block text-[10px]">Température</span>
                          <span className="font-bold text-foreground text-sm">{selectedConsultation.constantes.temperature ? `${selectedConsultation.constantes.temperature} °C` : "—"}</span>
                        </div>
                        <div className="bg-card p-2 rounded-lg border border-border/60 text-center">
                          <span className="text-muted-foreground block text-[10px]">Tension</span>
                          <span className="font-bold text-foreground text-sm">{selectedConsultation.constantes.tension_arterielle || "—"}</span>
                        </div>
                        <div className="bg-card p-2 rounded-lg border border-border/60 text-center">
                          <span className="text-muted-foreground block text-[10px]">Pouls</span>
                          <span className="font-bold text-foreground text-sm">{selectedConsultation.constantes.frequence_cardiaque ? `${selectedConsultation.constantes.frequence_cardiaque} bpm` : "—"}</span>
                        </div>
                        <div className="bg-card p-2 rounded-lg border border-border/60 text-center">
                          <span className="text-muted-foreground block text-[10px]">Poids</span>
                          <span className="font-bold text-foreground text-sm">{selectedConsultation.constantes.poids ? `${selectedConsultation.constantes.poids} kg` : "—"}</span>
                        </div>
                        <div className="bg-card p-2 rounded-lg border border-border/60 text-center">
                          <span className="text-muted-foreground block text-[10px]">Taille</span>
                          <span className="font-bold text-foreground text-sm">{selectedConsultation.constantes.taille ? `${selectedConsultation.constantes.taille} cm` : "—"}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Date de contrôle recommandée */}
                  {selectedConsultation.date_controle_recommandee && (
                    <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 flex items-center gap-2.5 text-xs text-blue-900 dark:text-blue-300">
                      <Calendar className="size-4 text-blue-600 shrink-0" />
                      <div>
                        <span className="font-bold block">Date de contrôle recommandée :</span>
                        <span>{new Date(selectedConsultation.date_controle_recommandee).toLocaleDateString("fr-FR")} (indicatif)</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Motif</span>
                    <div className="p-3 rounded-lg border border-border/60 bg-background text-foreground font-medium">
                      {selectedConsultation.motif}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Observations cliniques</span>
                    <div className="p-3 rounded-lg border border-border/60 bg-background text-foreground whitespace-pre-wrap">
                      {selectedConsultation.observations || <span className="italic text-muted-foreground">Aucune observation renseignée</span>}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Diagnostic</span>
                    <div className="p-3 rounded-lg border border-border/60 bg-background text-foreground font-semibold whitespace-pre-wrap">
                      {selectedConsultation.diagnostic || <span className="italic text-muted-foreground font-normal">Non renseigné</span>}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Compte rendu médical</span>
                    <div className="p-3 rounded-lg border border-border/60 bg-background text-foreground whitespace-pre-wrap">
                      {selectedConsultation.compte_rendu || <span className="italic text-muted-foreground">Aucun compte rendu rédigé</span>}
                    </div>
                  </div>

                  {/* Historique des modifications (Addenda) */}
                  {selectedConsultation.historique && selectedConsultation.historique.length > 0 && (
                    <div className="pt-3 border-t border-border/60 space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <History className="size-4 text-amber-600" />
                        Historique des modifications &amp; Audit ({selectedConsultation.historique.length})
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {selectedConsultation.historique.map((h) => (
                          <div key={h.id} className="rounded-xl border border-border/60 bg-muted/30 p-2.5 text-xs space-y-1">
                            <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                              <span className="font-semibold text-foreground">Modifié par {h.auteur_nom}</span>
                              <span>{new Date(h.date_modification).toLocaleString("fr-FR")}</span>
                            </div>
                            <div className="text-foreground">
                              <span className="font-medium text-amber-700 dark:text-amber-400">Motif :</span> {h.motif_correction}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Champs modifiés : {h.champs_modifies.join(", ")}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ordonnances associées */}
                  <div className="pt-3 border-t border-border/60">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <FileSignature className="size-4 text-primary" />
                      Ordonnances délivrées
                    </h4>
                    {consultationPrescriptions.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Aucune ordonnance rédigée pour cette consultation.</p>
                    ) : (
                      <div className="space-y-2">
                        {consultationPrescriptions.map((ord: any) => (
                          <div key={ord.id} className="rounded-xl border border-border/70 bg-card p-3 text-xs space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-foreground">Ordonnance n°{ord.id} ({new Date(ord.date_creation).toLocaleDateString("fr-FR")})</span>
                              <div className="flex items-center gap-1.5">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePrintPrescription(ord)}
                                  className="h-7 text-xs px-2 gap-1"
                                >
                                  <Printer className="size-3" /> Imprimer
                                </Button>
                                {(currentUser?.role === "ADMIN" || currentUser?.role === "SECRETAIRE") && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setFactureMedModal({
                                      isOpen: true,
                                      ordonnanceId: ord.id,
                                      patientId: selectedConsultation.patient,
                                      designation: `Médicaments, ordonnance n°${ord.id}`,
                                      montant: ""
                                    })}
                                    className="h-7 text-xs px-2 gap-1 text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                                  >
                                    Facturer médicaments
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="font-mono text-foreground whitespace-pre-wrap bg-muted/20 p-2 rounded border border-border/50">
                              {ord.medicaments}
                            </div>
                            <div className="text-muted-foreground">
                              <strong>Posologie :</strong> {ord.posologie} — <strong>Durée :</strong> {ord.duree}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-border/60 mt-6">
                  <div>
                    {(currentUser?.role === "MEDECIN" || currentUser?.role === "ADMIN") && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsPrescriptionOpen(true)}
                        className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
                      >
                        <FileSignature className="size-4" /> Rédiger une ordonnance
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
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
                        className="flex items-center gap-1.5"
                      >
                        <Edit className="size-4" /> Modifier
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={() => setSelectedConsultation(null)}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Fermer
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL CRÉATION ORDONNANCE */}
      {isPrescriptionOpen && selectedConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <FileSignature className="size-5 text-primary" /> Rédiger une ordonnance
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Patient : <strong className="text-foreground">{selectedConsultation.patient_nom} {selectedConsultation.patient_prenom}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPrescriptionOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
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
                <Label htmlFor="page-presc-medicaments">Médicaments * (un par ligne)</Label>
                <textarea
                  id="page-presc-medicaments"
                  required
                  rows={4}
                  placeholder="Ex : Paracétamol 1g&#10;Amoxicilline 500mg"
                  value={prescriptionForm.medicaments}
                  onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, medicaments: e.target.value }))}
                  className="mt-1 flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <Label htmlFor="page-presc-posologie">Posologie *</Label>
                <textarea
                  id="page-presc-posologie"
                  required
                  rows={3}
                  placeholder="Ex : 1 comprimé 3 fois par jour au cours des repas"
                  value={prescriptionForm.posologie}
                  onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, posologie: e.target.value }))}
                  className="mt-1 flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <Label htmlFor="page-presc-duree">Durée du traitement *</Label>
                <Input
                  id="page-presc-duree"
                  required
                  placeholder="Ex : 7 jours, 2x/jour"
                  value={prescriptionForm.duree}
                  onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, duree: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
                <Button type="button" variant="outline" onClick={() => setIsPrescriptionOpen(false)}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={createPrescriptionMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  {createPrescriptionMutation.isPending ? "Enregistrement..." : "Enregistrer l'ordonnance"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL FACTURATION MÉDICAMENTS (SECRÉTAIRE / ADMIN) */}
      {factureMedModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <FileSignature className="size-5 text-emerald-600" />
                Créer la facture des médicaments
              </h3>
              <button
                type="button"
                onClick={() => setFactureMedModal(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
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
                  className="mt-1"
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
                  className="mt-1"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFactureMedModal(null)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={createFactureMedicamentsMutation.isPending || !factureMedModal.montant}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  {createFactureMedicamentsMutation.isPending ? "Création..." : "Enregistrer la facture"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

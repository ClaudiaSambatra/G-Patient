"use client"

import { useState } from "react"
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
  FileText
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
  specialite: string
}

interface RendezVous {
  id: number
  patient: number
  patient_nom: string
  patient_contact: string
  medecin: number
  medecin_nom: string
  date_heure: string
  duree_minutes: number
  statut: "PLANIFIE" | "CONFIRME" | "ANNULE" | "TERMINE"
  motif: string
}

interface RendezVousListResponse {
  count: number
  results: RendezVous[]
}

interface PatientListResponse {
  count: number
  results: Patient[]
}

export default function RendezVousPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isConsultOpen, setIsConsultOpen] = useState(false)
  const [selectedRdvId, setSelectedRdvId] = useState<number | null>(null)
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const [consultForm, setConsultForm] = useState({
    motif: "",
    observations: "",
    diagnostic: ""
  })

  const [form, setForm] = useState({
    patient: "",
    medecin: "",
    date: "",
    heure: "",
    duree_minutes: 30,
    motif: "",
  })

  function showNotification(type: "success" | "error", message: string) {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr))
    }, 4500)
  }

  // Profil
  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await apiClient.get<CurrentUser>("/accounts/me/")
      return data
    },
  })

  // Liste des médecins pour le select
  const { data: medecinsData } = useQuery({
    queryKey: ["medecins"],
    queryFn: async () => {
      const { data } = await apiClient.get("/medecins/")
      return data.results as Medecin[]
    },
  })

  // Liste des patients pour le select
  const { data: patientsData } = useQuery({
    queryKey: ["patients_light"],
    queryFn: async () => {
      const { data } = await apiClient.get<PatientListResponse>("/patients/")
      return data.results
    },
  })

  // Liste des RDV
  const { data: rdvData, isLoading, refetch } = useQuery({
    queryKey: ["rendezvous", search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      const { data } = await apiClient.get<RendezVousListResponse>(`/rendezvous/?${params.toString()}`)
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        patient: form.patient,
        medecin: form.medecin,
        date_heure: `${form.date}T${form.heure}:00Z`,
        duree_minutes: form.duree_minutes,
        motif: form.motif
      }
      return apiClient.post("/rendezvous/", payload)
    },
    onSuccess: () => {
      setIsCreateOpen(false)
      setForm({ patient: "", medecin: "", date: "", heure: "", duree_minutes: 30, motif: "" })
      queryClient.invalidateQueries({ queryKey: ["rendezvous"] })
      showNotification("success", "Rendez-vous planifié avec succès.")
    },
    onError: () => showNotification("error", "Erreur lors de la planification."),
  })

  // Mise à jour Statut RDV
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, statut }: { id: number; statut: string }) => 
      apiClient.patch(`/rendezvous/${id}/`, { statut }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rendezvous"] })
      showNotification("success", "Statut mis à jour.")
    },
    onError: () => showNotification("error", "Erreur lors de la mise à jour."),
  })

  // Suppression RDV
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/rendezvous/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rendezvous"] })
      showNotification("success", "Rendez-vous supprimé avec succès.")
    },
    onError: () => showNotification("error", "Erreur lors de la suppression."),
  })

  // Création Consultation
  const createConsultationMutation = useMutation({
    mutationFn: async () => apiClient.post("/consultations/", { ...consultForm, rendezvous: selectedRdvId }),
    onSuccess: () => {
      setIsConsultOpen(false)
      setConsultForm({ motif: "", observations: "", diagnostic: "" })
      setSelectedRdvId(null)
      queryClient.invalidateQueries({ queryKey: ["rendezvous"] })
      showNotification("success", "Consultation enregistrée avec succès.")
    },
    onError: () => showNotification("error", "Erreur lors de l'enregistrement de la consultation (vous devez être le médecin assigné)."),
  })

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'PLANIFIE':
        return <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-400">Planifié</span>
      case 'CONFIRME':
        return <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-400">Confirmé</span>
      case 'ANNULE':
        return <span className="inline-flex rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10 dark:bg-red-900/30 dark:text-red-400">Annulé</span>
      case 'TERMINE':
        return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-500/10 dark:bg-slate-800 dark:text-slate-400">Terminé</span>
      default:
        return <span>{statut}</span>
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-5 ${notification.type === "success" ? "border border-emerald-500/30 bg-emerald-500/90 text-white" : "border border-red-500/30 bg-destructive text-white"}`}>
          {notification.type === "success" ? <CheckCircle2 className="size-5 shrink-0" /> : <AlertCircle className="size-5 shrink-0" />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2.5">
              <CalendarIcon className="size-7 text-indigo-600" />
              Agenda & Rendez-vous
              <span className="rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {rdvData?.count ?? 0}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gérez les rendez-vous des patients et les plannings des médecins
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button onClick={() => refetch()} title="Rafraîchir" className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground">
              <RefreshCw className="size-4" />
            </button>
            {(currentUser?.role === "ADMIN" || currentUser?.role === "SECRETAIRE") && (
              <button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition-all hover:scale-[1.01] hover:shadow-indigo-500/35 active:scale-[0.99]">
                <Plus className="size-4.5" />
                <span>Nouveau RDV</span>
              </button>
            )}
          </div>
        </div>

        <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden mt-2">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base font-semibold">Plannings récents</CardTitle>
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Rechercher patient, motif..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <RefreshCw className="mx-auto size-5 animate-spin mb-2 text-indigo-600" />
                Chargement de l'agenda…
              </div>
            ) : rdvData?.results.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                <CalendarIcon className="mx-auto size-10 mb-2 opacity-30" />
                <p className="font-medium text-foreground">Aucun rendez-vous trouvé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-6">Date & Heure</th>
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4">Médecin</th>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4">Motif</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {rdvData?.results.map((rdv) => (
                      <tr key={rdv.id} className="transition-colors hover:bg-muted/30">
                        <td className="py-3 px-6 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="size-4 text-indigo-500" />
                            <span className="font-medium text-foreground">
                              {new Date(rdv.date_heure).toLocaleString('fr-FR', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <User className="size-3.5 text-muted-foreground" />
                            {rdv.patient_nom}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 ml-5">
                            {rdv.patient_contact}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                            <Stethoscope className="size-3.5 text-emerald-500" />
                            {rdv.medecin_nom}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {(currentUser?.role === "ADMIN" || currentUser?.role === "SECRETAIRE") ? (
                            <select
                              value={rdv.statut}
                              onChange={(e) => updateStatusMutation.mutate({ id: rdv.id, statut: e.target.value })}
                              className="text-xs font-medium rounded-md border border-input bg-transparent px-2 py-1 shadow-sm focus:outline-none"
                            >
                              <option value="PLANIFIE">Planifié</option>
                              <option value="CONFIRME">Confirmé</option>
                              <option value="ANNULE">Annulé</option>
                              <option value="TERMINE">Terminé</option>
                            </select>
                          ) : (
                            getStatusBadge(rdv.statut)
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground truncate max-w-[200px]" title={rdv.motif}>
                          {rdv.motif || <span className="italic opacity-50">Non renseigné</span>}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {(rdv.statut === "CONFIRME" || rdv.statut === "TERMINE") && currentUser?.role === "MEDECIN" ? (
                            <button
                              onClick={() => {
                                setSelectedRdvId(rdv.id)
                                setConsultForm({ ...consultForm, motif: rdv.motif || "" })
                                setIsConsultOpen(true)
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                            >
                              <FileText className="size-3.5" />
                              Consulter
                            </button>
                          ) : (currentUser?.role === "ADMIN" || currentUser?.role === "SECRETAIRE") ? (
                            <button
                              onClick={() => {
                                if (window.confirm("Voulez-vous vraiment supprimer ce rendez-vous ?")) {
                                  deleteMutation.mutate(rdv.id)
                                }
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                            >
                              <XCircle className="size-3.5" />
                              Supprimer
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Modal Création */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <CalendarIcon className="size-5 text-indigo-600" /> Planifier un RDV
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <XCircle className="size-5" />
              </button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="mt-6 flex flex-col gap-4">
              <div className="space-y-1">
                <Label>Patient *</Label>
                <select 
                  required 
                  value={form.patient} 
                  onChange={e => setForm({...form, patient: e.target.value})}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
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
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Sélectionner un médecin</option>
                  {medecinsData?.map(m => <option key={m.id} value={m.id}>Dr. {m.nom} {m.prenom} - {m.specialite}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Date *</Label>
                  <Input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Heure *</Label>
                  <Input type="time" required value={form.heure} onChange={e => setForm({...form, heure: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Motif</Label>
                <Input value={form.motif} onChange={e => setForm({...form, motif: e.target.value})} placeholder="Consultation de suivi..." />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {createMutation.isPending ? "Enregistrement..." : "Confirmer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Consultation */}
      {isConsultOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FileText className="size-5 text-emerald-600" /> Rédiger la consultation
              </h3>
              <button onClick={() => setIsConsultOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <XCircle className="size-5" />
              </button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); createConsultationMutation.mutate(); }} className="mt-6 flex flex-col gap-4">
              <div className="space-y-1">
                <Label>Motif de la consultation *</Label>
                <Input required value={consultForm.motif} onChange={e => setConsultForm({...consultForm, motif: e.target.value})} placeholder="Ex: Maux de tête..." />
              </div>

              <div className="space-y-1">
                <Label>Observations cliniques</Label>
                <textarea 
                  value={consultForm.observations} 
                  onChange={e => setConsultForm({...consultForm, observations: e.target.value})} 
                  placeholder="Notes et observations détaillées..."
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="space-y-1">
                <Label>Diagnostic</Label>
                <textarea 
                  value={consultForm.diagnostic} 
                  onChange={e => setConsultForm({...consultForm, diagnostic: e.target.value})} 
                  placeholder="Conclusion et diagnostic..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
                <Button type="button" variant="outline" onClick={() => setIsConsultOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={createConsultationMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {createConsultationMutation.isPending ? "Enregistrement..." : "Terminer le RDV"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { CurrentUser } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { 
  Users, UserPlus, Calendar, Phone, Search, RefreshCw, 
  CheckCircle2, AlertCircle, Eye, Edit3, Trash2, XCircle,
  FileText, Stethoscope, Plus
} from "lucide-react"

interface DocumentMedical {
  id: number
  nom: string
  fichier: string
  type_document: string
  date_depot: string
}

interface Patient {
  id: number
  nom: string
  prenom: string
  sexe: "M" | "F"
  date_naissance: string
  age?: number
  contact: string
  adresse: string
  antecedents: string
  allergies: string
  groupe_sanguin: string
  documents?: DocumentMedical[]
  date_creation: string
  date_modification: string
}

interface PatientListResponse {
  count: number
  results: Patient[]
}

interface Consultation {
  id: number
  motif: string
  observations: string
  diagnostic: string
  date_consultation: string
  medecin_nom: string
}

const GroupesSanguins = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function computeAgeFallback(dateNaissance: string): number | null {
  if (!dateNaissance) return null
  const birth = new Date(dateNaissance)
  if (isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age >= 0 ? age : null
}

export default function PatientsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  
  // Notification state
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)
  function showNotification(type: "success" | "error", message: string) {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr))
    }, 4500)
  }

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null)

  // Forms state
  const [form, setForm] = useState({ 
    nom: "", prenom: "", sexe: "M", date_naissance: "", contact: "",
    adresse: "", antecedents: "", allergies: "", groupe_sanguin: ""
  })
  const [editForm, setEditForm] = useState({ 
    nom: "", prenom: "", sexe: "M", date_naissance: "", contact: "",
    adresse: "", antecedents: "", allergies: "", groupe_sanguin: ""
  })
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false)
  const [consultationForm, setConsultationForm] = useState({
    motif: "", observations: "", diagnostic: ""
  })

  // Queries
  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await apiClient.get<CurrentUser>("/accounts/me/")
      return data
    },
    retry: false,
  })

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["patients", search, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      params.append("page", page.toString())
      const { data } = await apiClient.get<PatientListResponse>(`/patients/?${params.toString()}`)
      return data
    },
    retry: false,
  })

  const { data: consultationsData, isLoading: isLoadingConsultations } = useQuery({
    queryKey: ["consultations", viewingPatient?.id],
    queryFn: async () => {
      if (!viewingPatient) return null
      const { data } = await apiClient.get(`/consultations/?patient=${viewingPatient.id}`)
      return data.results || data // Handle paginated or unpaginated response
    },
    enabled: !!viewingPatient,
  })

  // Mutations
  const createPatient = useMutation({
    mutationFn: async () => apiClient.post("/patients/", form),
    onSuccess: () => {
      setForm({ 
        nom: "", prenom: "", sexe: "M", date_naissance: "", contact: "",
        adresse: "", antecedents: "", allergies: "", groupe_sanguin: ""
      })
      setIsCreateOpen(false)
      queryClient.invalidateQueries({ queryKey: ["patients"] })
      showNotification("success", "Dossier patient créé avec succès.")
    },
    onError: () => {
      showNotification("error", "Erreur lors de la création du dossier patient.")
    }
  })

  const updatePatient = useMutation({
    mutationFn: async () => {
      if (!editingPatient) return
      return apiClient.patch(`/patients/${editingPatient.id}/`, editForm)
    },
    onSuccess: () => {
      setEditingPatient(null)
      queryClient.invalidateQueries({ queryKey: ["patients"] })
      showNotification("success", "Le dossier a été mis à jour avec succès.")
    },
    onError: () => {
      showNotification("error", "Erreur lors de la mise à jour du dossier.")
    }
  })

  const deletePatient = useMutation({
    mutationFn: async () => {
      if (!deletingPatient) return
      return apiClient.delete(`/patients/${deletingPatient.id}/`)
    },
    onSuccess: () => {
      setDeletingPatient(null)
      queryClient.invalidateQueries({ queryKey: ["patients"] })
      showNotification("success", "Le dossier a été supprimé.")
    },
    onError: (err: unknown) => {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        showNotification("error", "Vous n'avez pas les droits d'administrateur pour supprimer ce dossier.")
      } else {
        showNotification("error", "Impossible de supprimer ce dossier.")
      }
      setDeletingPatient(null)
    }
  })

  const createConsultation = useMutation({
    mutationFn: async () => {
      if (!viewingPatient) return
      return apiClient.post("/consultations/", {
        ...consultationForm,
        patient: viewingPatient.id
      })
    },
    onSuccess: () => {
      setConsultationForm({ motif: "", observations: "", diagnostic: "" })
      setIsConsultationModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ["consultations", viewingPatient?.id] })
      showNotification("success", "Consultation enregistrée avec succès.")
    },
    onError: () => {
      showNotification("error", "Erreur lors de l'enregistrement de la consultation.")
    }
  })

  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.is_superuser
  const isMedecin = currentUser?.role === "MEDECIN" || currentUser?.role === "ADMIN" || currentUser?.is_superuser

  if (isError) {
    return (
      <div className="min-h-screen bg-slate-50/60 dark:bg-background">
        <main className="mx-auto max-w-md p-8 text-center mt-20">
          <Card>
            <CardContent className="pt-6">
              <p className="mb-4 text-sm text-destructive font-medium">
                Session expirée ou non authentifiée.
              </p>
              <Button onClick={() => router.push("/login")} className="w-full">
                Se connecter
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">

      {/* Notification flash */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-5 ${
            notification.type === "success"
              ? "border border-emerald-500/30 bg-emerald-500/90 text-white"
              : "border border-red-500/30 bg-destructive text-white"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="size-5 shrink-0" />
          ) : (
            <AlertCircle className="size-5 shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2.5">
              <Users className="size-7 text-primary" />
              Dossiers Patients
              <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-foreground">
                {data?.count ?? 0}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestion administrative et médicale des dossiers de patients
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
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <UserPlus className="size-4.5" />
              <span>Nouveau patient</span>
            </button>
          </div>
        </div>

        {/* Liste des patients */}
        <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden mt-2">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base font-semibold">
                Liste des patients
              </CardTitle>
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, contact..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <RefreshCw className="mx-auto size-5 animate-spin mb-2 text-primary" />
                Chargement des patients…
              </div>
            )}
            {!isLoading && data?.results.length === 0 && (
              <div className="py-16 text-center text-sm text-muted-foreground">
                <Users className="mx-auto size-10 mb-2 opacity-30" />
                <p className="font-medium text-foreground">Aucun patient trouvé</p>
                <p className="text-xs mt-1">Utilisez le bouton &quot;Nouveau patient&quot; pour commencer.</p>
              </div>
            )}
            {!isLoading && data && data.results.length > 0 && (
              <div className="overflow-x-auto pb-4">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-6">Identité</th>
                      <th className="py-3 px-4">Sexe</th>
                      <th className="py-3 px-4">Date de naissance & Âge</th>
                      <th className="py-3 px-4">Groupe sanguin</th>
                      <th className="py-3 px-6">Contact</th>
                      <th className="py-3 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {data.results.map((p) => {
                      const displayedAge = p.age ?? computeAgeFallback(p.date_naissance)
                      return (
                        <tr key={p.id} className="transition-colors hover:bg-muted/30 group">
                          <td className="py-3 px-6">
                            <div className="font-semibold text-foreground">
                              {p.nom} {p.prenom}
                            </div>
                            {p.allergies && (
                              <div className="text-[10px] text-red-500 font-medium mt-0.5 max-w-[200px] truncate">
                                Allergies: {p.allergies}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                              p.sexe === 'M' 
                                ? 'bg-primary/10 text-primary ring-primary/20 dark:bg-primary/20 dark:text-primary-foreground' 
                                : 'bg-pink-50 text-pink-700 ring-pink-600/20 dark:bg-pink-900/40 dark:text-pink-400'
                            }`}>
                              {p.sexe === 'M' ? 'Masculin' : 'Féminin'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            <div className="flex flex-col">
                              <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                                <Calendar className="size-3.5 text-muted-foreground" />
                                {new Date(p.date_naissance).toLocaleDateString('fr-FR')}
                              </span>
                              <span className="text-[11px] text-muted-foreground mt-0.5 ml-5">
                                {displayedAge !== null ? `${displayedAge} ans` : '-'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {p.groupe_sanguin ? (
                              <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10 dark:bg-red-950/40 dark:text-red-400">
                                {p.groupe_sanguin}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Non défini</span>
                            )}
                          </td>
                          <td className="py-3 px-6 text-muted-foreground">
                            <span className="flex items-center gap-1.5 text-xs">
                              <Phone className="size-3.5 text-muted-foreground" />
                              {p.contact || <span className="italic">Non renseigné</span>}
                            </span>
                          </td>
                          <td className="py-3 pr-6 text-right">
                            <div className="inline-flex items-center gap-1">
                              {/* Voir */}
                              <button
                                onClick={() => setViewingPatient(p)}
                                title="Voir détails"
                                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                <Eye className="size-4" />
                              </button>

                              {/* Modifier */}
                              <button
                                onClick={() => {
                                  setEditingPatient(p)
                                  setEditForm({
                                    nom: p.nom, prenom: p.prenom, sexe: p.sexe || 'M', date_naissance: p.date_naissance, contact: p.contact,
                                    adresse: p.adresse || "", antecedents: p.antecedents || "", allergies: p.allergies || "", groupe_sanguin: p.groupe_sanguin || ""
                                  })
                                }}
                                title="Modifier"
                                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                <Edit3 className="size-4" />
                              </button>

                              {/* Supprimer (ADMIN seulement) */}
                              {isAdmin && (
                                <button
                                  onClick={() => setDeletingPatient(p)}
                                  title="Supprimer"
                                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-destructive dark:hover:bg-red-950/50"
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
                <div className="flex items-center justify-between px-6 pt-4 text-sm text-muted-foreground">
                  <div>
                    Page {page}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={!data || data.results.length < 20}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* ========================================= */}
      {/* MODAL 1 : CRÉATION DE PATIENT             */}
      {/* ========================================= */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-4xl rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[95vh] overflow-y-auto md:overflow-visible">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <UserPlus className="size-5 text-primary" /> Nouveau patient
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XCircle className="size-5" />
              </button>
            </div>
            
            <form
              onSubmit={(e) => {
                e.preventDefault()
                createPatient.mutate()
              }}
              className="mt-4 flex flex-col gap-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Colonne gauche : État civil & Coordonnées */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider pb-1.5 border-b border-border/40">
                    État civil & Coordonnées
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nom *</Label>
                      <Input required value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} placeholder="Nom de famille" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Prénom *</Label>
                      <Input required value={form.prenom} onChange={e => setForm({...form, prenom: e.target.value})} placeholder="Prénom(s)" className="h-9 text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Sexe *</Label>
                      <select 
                        value={form.sexe} 
                        onChange={e => setForm({...form, sexe: e.target.value as "M" | "F"})}
                        className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="M">Masculin</option>
                        <option value="F">Féminin</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Date de naissance *</Label>
                      <Input type="date" required value={form.date_naissance} onChange={e => setForm({...form, date_naissance: e.target.value})} className="h-9 text-sm" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Contact (Téléphone / Email)</Label>
                    <Input value={form.contact} onChange={e => setForm({...form, contact: e.target.value})} placeholder="Ex: 034 00 000 00 (optionnel)" className="h-9 text-sm" />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Adresse de résidence</Label>
                    <Input value={form.adresse} onChange={e => setForm({...form, adresse: e.target.value})} placeholder="Adresse complète..." className="h-9 text-sm" />
                  </div>
                </div>

                {/* Colonne droite : Profil médical */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider pb-1.5 border-b border-border/40">
                    Profil médical
                  </h4>
                  <div className="space-y-1">
                    <Label className="text-xs">Groupe Sanguin</Label>
                    <select 
                      value={form.groupe_sanguin} 
                      onChange={e => setForm({...form, groupe_sanguin: e.target.value})}
                      className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Sélectionner (optionnel)</option>
                      {GroupesSanguins.map(gs => <option key={gs} value={gs}>{gs}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Allergies connues</Label>
                    <Textarea value={form.allergies} onChange={e => setForm({...form, allergies: e.target.value})} placeholder="Ex: Pénicilline, Arachides..." rows={2} className="text-sm resize-none" />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Antécédents médicaux</Label>
                    <Textarea value={form.antecedents} onChange={e => setForm({...form, antecedents: e.target.value})} placeholder="Interventions, maladies chroniques..." rows={3} className="text-sm resize-none" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
                <Button type="submit" size="sm" disabled={createPatient.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {createPatient.isPending ? "Création..." : "Enregistrer le patient"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL 2 : MODIFICATION DE PATIENT         */}
      {/* ========================================= */}
      {editingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-4xl rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[95vh] overflow-y-auto md:overflow-visible">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Edit3 className="size-5 text-primary" /> Modifier le patient
              </h3>
              <button
                onClick={() => setEditingPatient(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XCircle className="size-5" />
              </button>
            </div>
            
            <form
              onSubmit={(e) => {
                e.preventDefault()
                updatePatient.mutate()
              }}
              className="mt-4 flex flex-col gap-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Colonne gauche : État civil & Coordonnées */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider pb-1.5 border-b border-border/40">
                    État civil & Coordonnées
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nom *</Label>
                      <Input required value={editForm.nom} onChange={e => setEditForm({...editForm, nom: e.target.value})} placeholder="Nom de famille" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Prénom *</Label>
                      <Input required value={editForm.prenom} onChange={e => setEditForm({...editForm, prenom: e.target.value})} placeholder="Prénom(s)" className="h-9 text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Sexe *</Label>
                      <select 
                        value={editForm.sexe} 
                        onChange={e => setEditForm({...editForm, sexe: e.target.value as "M" | "F"})}
                        className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="M">Masculin</option>
                        <option value="F">Féminin</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Date de naissance *</Label>
                      <Input type="date" required value={editForm.date_naissance} onChange={e => setEditForm({...editForm, date_naissance: e.target.value})} className="h-9 text-sm" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Contact (Téléphone / Email)</Label>
                    <Input value={editForm.contact} onChange={e => setEditForm({...editForm, contact: e.target.value})} placeholder="Ex: 034 00 000 00 (optionnel)" className="h-9 text-sm" />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Adresse de résidence</Label>
                    <Input value={editForm.adresse} onChange={e => setEditForm({...editForm, adresse: e.target.value})} placeholder="Adresse complète..." className="h-9 text-sm" />
                  </div>
                </div>

                {/* Colonne droite : Profil médical */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider pb-1.5 border-b border-border/40">
                    Profil médical
                  </h4>
                  <div className="space-y-1">
                    <Label className="text-xs">Groupe Sanguin</Label>
                    <select 
                      value={editForm.groupe_sanguin} 
                      onChange={e => setEditForm({...editForm, groupe_sanguin: e.target.value})}
                      className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Sélectionner (optionnel)</option>
                      {GroupesSanguins.map(gs => <option key={gs} value={gs}>{gs}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Allergies connues</Label>
                    <Textarea value={editForm.allergies} onChange={e => setEditForm({...editForm, allergies: e.target.value})} placeholder="Ex: Pénicilline, Arachides..." rows={2} className="text-sm resize-none" />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Antécédents médicaux</Label>
                    <Textarea value={editForm.antecedents} onChange={e => setEditForm({...editForm, antecedents: e.target.value})} placeholder="Interventions, maladies chroniques..." rows={3} className="text-sm resize-none" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingPatient(null)}>Annuler</Button>
                <Button type="submit" size="sm" disabled={updatePatient.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {updatePatient.isPending ? "Mise à jour..." : "Enregistrer les modifications"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL 3 : VOIR DETAILS (Lecture seule)    */}
      {/* ========================================= */}
      {viewingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-5xl rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Eye className="size-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Dossier médical — {viewingPatient.nom} {viewingPatient.prenom}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Fiche patient détaillée et historique des consultations
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingPatient(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XCircle className="size-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Synthèse État Civil & Données Vitales */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                <div>
                  <span className="block text-[11px] font-semibold uppercase text-muted-foreground">Sexe</span>
                  <span className="font-semibold text-sm text-foreground">{viewingPatient.sexe === 'M' ? 'Masculin' : 'Féminin'}</span>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase text-muted-foreground">Naissance & Âge</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-semibold text-sm">{new Date(viewingPatient.date_naissance).toLocaleDateString('fr-FR')}</span>
                    {(() => {
                      const ageVal = viewingPatient.age ?? computeAgeFallback(viewingPatient.date_naissance)
                      return ageVal !== null ? (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-foreground">
                          {ageVal} ans
                        </span>
                      ) : null
                    })()}
                  </div>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase text-muted-foreground">Contact</span>
                  <span className="font-semibold text-sm text-foreground truncate block">{viewingPatient.contact || "Non renseigné"}</span>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase text-muted-foreground">Groupe sanguin</span>
                  <span className="font-bold text-sm text-red-600 dark:text-red-400">{viewingPatient.groupe_sanguin || "Non renseigné"}</span>
                </div>
              </div>

              {/* Disposition 2 colonnes : Informations cliniques à gauche, Historique consultations à droite */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Colonne gauche (5 cols) : Adresse, Antécédents, Allergies */}
                <div className="lg:col-span-5 space-y-4">
                  <div>
                    <span className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Adresse de résidence</span>
                    <p className="text-sm bg-muted/40 p-3 rounded-lg border border-border/50">{viewingPatient.adresse || "Non renseignée"}</p>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Antécédents médicaux</span>
                    <p className="text-sm bg-muted/40 p-3 rounded-lg border border-border/50 whitespace-pre-wrap">{viewingPatient.antecedents || "Aucun antécédent particulier"}</p>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Allergies signalées</span>
                    <p className="text-sm bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 p-3 rounded-lg border border-red-200 dark:border-red-900/40 whitespace-pre-wrap font-medium">{viewingPatient.allergies || "Aucune allergie connue"}</p>
                  </div>
                </div>

                {/* Colonne droite (7 cols) : Historique des Consultations */}
                <div className="lg:col-span-7 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold uppercase text-primary flex items-center gap-2">
                      <FileText className="size-4" /> Historique des Consultations
                    </span>
                    {isMedecin && (
                      <Button 
                        size="sm" 
                        className="bg-primary hover:bg-primary/90 text-primary-foreground h-8"
                        onClick={() => setIsConsultationModalOpen(true)}
                      >
                        <Plus className="size-4 mr-1" /> Nouvelle consultation
                      </Button>
                    )}
                  </div>
                  
                  {isLoadingConsultations ? (
                    <div className="text-sm text-muted-foreground flex items-center gap-2 p-6"><RefreshCw className="size-3.5 animate-spin"/> Chargement des consultations...</div>
                  ) : !consultationsData || consultationsData.length === 0 ? (
                    <div className="p-8 rounded-xl border border-dashed border-border/80 text-center bg-muted/20">
                      <p className="text-sm text-muted-foreground italic">Aucune consultation enregistrée pour ce patient.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      {consultationsData.map((consult: Consultation) => (
                        <div key={consult.id} className="bg-muted/30 border border-border/60 rounded-xl p-4 transition-colors hover:bg-muted/50">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-sm">{consult.motif || "Consultation de suivi"}</h4>
                            <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-md border border-border/40 shrink-0">
                              {new Date(consult.date_consultation).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <Stethoscope className="size-3" /> {consult.medecin_nom}
                          </div>
                          
                          {consult.observations && (
                            <div className="mb-2">
                              <span className="text-[10px] font-semibold uppercase text-muted-foreground">Observations / Constantes</span>
                              <p className="text-xs mt-0.5 whitespace-pre-wrap">{consult.observations}</p>
                            </div>
                          )}
                          
                          {consult.diagnostic && (
                            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                              <span className="text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-500">Diagnostic</span>
                              <p className="text-xs mt-0.5 whitespace-pre-wrap text-foreground font-medium">{consult.diagnostic}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between items-center text-xs text-muted-foreground border-t border-border/60 pt-4">
                <span>Créé le: {new Date(viewingPatient.date_creation).toLocaleString('fr-FR')}</span>
                <span>Dernière maj: {new Date(viewingPatient.date_modification).toLocaleString('fr-FR')}</span>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setViewingPatient(null)}>Fermer</Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL 4 : CONFIRMATION DE SUPPRESSION     */}
      {/* ========================================= */}
      {deletingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-destructive bg-card p-6 shadow-2xl text-center">
            <Trash2 className="mx-auto size-12 text-destructive/80 mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Confirmer la suppression</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Êtes-vous sûr de vouloir supprimer définitivement le dossier de{" "}
              <strong className="text-foreground">{deletingPatient.nom} {deletingPatient.prenom}</strong> ? 
              Cette action est irréversible.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" onClick={() => setDeletingPatient(null)}>Annuler</Button>
              <Button 
                variant="destructive" 
                onClick={() => deletePatient.mutate()}
                disabled={deletePatient.isPending}
              >
                {deletePatient.isPending ? "Suppression..." : "Oui, supprimer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL 5 : NOUVELLE CONSULTATION           */}
      {/* ========================================= */}
      {isConsultationModalOpen && viewingPatient && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Stethoscope className="size-5 text-primary" /> Nouvelle consultation
              </h3>
              <button
                onClick={() => setIsConsultationModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XCircle className="size-5" />
              </button>
            </div>
            
            <form
              onSubmit={(e) => {
                e.preventDefault()
                createConsultation.mutate()
              }}
              className="mt-6 flex flex-col gap-5"
            >
              <div className="space-y-1">
                <Label>Patient</Label>
                <Input disabled value={`${viewingPatient.nom} ${viewingPatient.prenom}`} className="bg-muted/50" />
              </div>

              <div className="space-y-1">
                <Label>Motif de la consultation *</Label>
                <Input 
                  required 
                  placeholder="Ex: Fièvre, Douleurs abdominales..." 
                  value={consultationForm.motif} 
                  onChange={e => setConsultationForm({...consultationForm, motif: e.target.value})} 
                />
              </div>

              <div className="space-y-1">
                <Label>Observations (Constantes, examen clinique...)</Label>
                <Textarea 
                  className="min-h-[100px]"
                  placeholder="Tension: 12/8, Température: 38°C..."
                  value={consultationForm.observations} 
                  onChange={e => setConsultationForm({...consultationForm, observations: e.target.value})} 
                />
              </div>

              <div className="space-y-1">
                <Label>Diagnostic</Label>
                <Textarea 
                  className="min-h-[80px]"
                  placeholder="Ex: Angine bactérienne"
                  value={consultationForm.diagnostic} 
                  onChange={e => setConsultationForm({...consultationForm, diagnostic: e.target.value})} 
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
                <Button type="button" variant="outline" onClick={() => setIsConsultationModalOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={createConsultation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {createConsultation.isPending ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
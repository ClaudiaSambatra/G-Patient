"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
  CheckCircle2, AlertCircle, Eye, Edit3, Trash2, XCircle
} from "lucide-react"

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
  date_creation: string
  date_modification: string
}

interface PatientListResponse {
  count: number
  results: Patient[]
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
    onError: (err: any) => {
      if (err.response?.status === 403) {
        showNotification("error", "Vous n'avez pas les droits d'administrateur pour supprimer ce dossier.")
      } else {
        showNotification("error", "Impossible de supprimer ce dossier.")
      }
      setDeletingPatient(null)
    }
  })

  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.is_superuser

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
              <Users className="size-7 text-blue-600" />
              Dossiers Patients
              <span className="rounded-full bg-blue-100 px-3 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
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
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-all hover:scale-[1.01] hover:shadow-blue-500/35 active:scale-[0.99]"
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
                  className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <RefreshCw className="mx-auto size-5 animate-spin mb-2 text-blue-600" />
                Chargement des patients…
              </div>
            )}
            {!isLoading && data?.results.length === 0 && (
              <div className="py-16 text-center text-sm text-muted-foreground">
                <Users className="mx-auto size-10 mb-2 opacity-30" />
                <p className="font-medium text-foreground">Aucun patient trouvé</p>
                <p className="text-xs mt-1">Utilisez le bouton "Nouveau patient" pour commencer.</p>
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
                                ? 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/40 dark:text-blue-400' 
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
                              {p.contact}
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
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <UserPlus className="size-5 text-blue-600" /> Nouveau patient
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
              className="mt-6 flex flex-col gap-6"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Nom *</Label>
                  <Input required value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Prénom *</Label>
                  <Input required value={form.prenom} onChange={e => setForm({...form, prenom: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Sexe *</Label>
                  <select 
                    value={form.sexe} 
                    onChange={e => setForm({...form, sexe: e.target.value as "M" | "F"})}
                    className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Date de naissance *</Label>
                  <Input type="date" required value={form.date_naissance} onChange={e => setForm({...form, date_naissance: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Contact (Téléphone / Email) *</Label>
                  <Input required value={form.contact} onChange={e => setForm({...form, contact: e.target.value})} />
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Informations médicales & Adresse</h4>
                <div className="space-y-1">
                  <Label>Adresse</Label>
                  <Textarea value={form.adresse} onChange={e => setForm({...form, adresse: e.target.value})} placeholder="Adresse complète" />
                </div>
                <div className="space-y-1">
                  <Label>Antécédents médicaux</Label>
                  <Textarea value={form.antecedents} onChange={e => setForm({...form, antecedents: e.target.value})} placeholder="Interventions, maladies chroniques..." />
                </div>
                <div className="space-y-1">
                  <Label>Allergies</Label>
                  <Textarea value={form.allergies} onChange={e => setForm({...form, allergies: e.target.value})} placeholder="Ex: Pénicilline, Arachides..." />
                </div>
                <div className="space-y-1">
                  <Label>Groupe Sanguin</Label>
                  <select 
                    value={form.groupe_sanguin} 
                    onChange={e => setForm({...form, groupe_sanguin: e.target.value})}
                    className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Sélectionner</option>
                    {GroupesSanguins.map(gs => <option key={gs} value={gs}>{gs}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={createPatient.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {createPatient.isPending ? "Création..." : "Enregistrer"}
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
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Edit3 className="size-5 text-indigo-600" /> Modifier le patient
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
              className="mt-6 flex flex-col gap-6"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Nom *</Label>
                  <Input required value={editForm.nom} onChange={e => setEditForm({...editForm, nom: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Prénom *</Label>
                  <Input required value={editForm.prenom} onChange={e => setEditForm({...editForm, prenom: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Sexe *</Label>
                  <select 
                    value={editForm.sexe} 
                    onChange={e => setEditForm({...editForm, sexe: e.target.value as "M" | "F"})}
                    className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Date de naissance *</Label>
                  <Input type="date" required value={editForm.date_naissance} onChange={e => setEditForm({...editForm, date_naissance: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Contact (Téléphone / Email) *</Label>
                  <Input required value={editForm.contact} onChange={e => setEditForm({...editForm, contact: e.target.value})} />
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Informations médicales & Adresse</h4>
                <div className="space-y-1">
                  <Label>Adresse</Label>
                  <Textarea value={editForm.adresse} onChange={e => setEditForm({...editForm, adresse: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Antécédents médicaux</Label>
                  <Textarea value={editForm.antecedents} onChange={e => setEditForm({...editForm, antecedents: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Allergies</Label>
                  <Textarea value={editForm.allergies} onChange={e => setEditForm({...editForm, allergies: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Groupe Sanguin</Label>
                  <select 
                    value={editForm.groupe_sanguin} 
                    onChange={e => setEditForm({...editForm, groupe_sanguin: e.target.value})}
                    className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Sélectionner</option>
                    {GroupesSanguins.map(gs => <option key={gs} value={gs}>{gs}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
                <Button type="button" variant="outline" onClick={() => setEditingPatient(null)}>Annuler</Button>
                <Button type="submit" disabled={updatePatient.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
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
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Eye className="size-5 text-slate-500" /> Dossier médical
              </h3>
              <button
                onClick={() => setViewingPatient(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XCircle className="size-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 border-b border-border/40 pb-6">
                <div>
                  <span className="block text-xs font-medium uppercase text-muted-foreground">Nom & Prénom</span>
                  <span className="font-semibold text-lg">{viewingPatient.nom} {viewingPatient.prenom}</span>
                </div>
                <div>
                  <span className="block text-xs font-medium uppercase text-muted-foreground">Sexe</span>
                  <span className="font-medium text-foreground">{viewingPatient.sexe === 'M' ? 'Masculin' : 'Féminin'}</span>
                </div>
                <div>
                  <span className="block text-xs font-medium uppercase text-muted-foreground">Date de naissance & Âge</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-medium">{new Date(viewingPatient.date_naissance).toLocaleDateString('fr-FR')}</span>
                    {(() => {
                      const ageVal = viewingPatient.age ?? computeAgeFallback(viewingPatient.date_naissance)
                      return ageVal !== null ? (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          {ageVal} ans
                        </span>
                      ) : null
                    })()}
                  </div>
                </div>
                <div>
                  <span className="block text-xs font-medium uppercase text-muted-foreground">Contact</span>
                  <span>{viewingPatient.contact}</span>
                </div>
                <div>
                  <span className="block text-xs font-medium uppercase text-muted-foreground">Groupe sanguin</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">{viewingPatient.groupe_sanguin || "Non renseigné"}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="block text-xs font-medium uppercase text-muted-foreground mb-1">Adresse</span>
                  <p className="text-sm bg-muted/40 p-3 rounded-lg border border-border/50">{viewingPatient.adresse || "Non renseignée"}</p>
                </div>
                <div>
                  <span className="block text-xs font-medium uppercase text-muted-foreground mb-1">Antécédents médicaux</span>
                  <p className="text-sm bg-muted/40 p-3 rounded-lg border border-border/50 whitespace-pre-wrap">{viewingPatient.antecedents || "Aucun antécédent particulier"}</p>
                </div>
                <div>
                  <span className="block text-xs font-medium uppercase text-muted-foreground mb-1">Allergies</span>
                  <p className="text-sm bg-muted/40 p-3 rounded-lg border border-border/50 whitespace-pre-wrap font-medium text-red-600/80 dark:text-red-400/80">{viewingPatient.allergies || "Aucune allergie connue"}</p>
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

    </div>
  )
}
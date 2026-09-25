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
  CalendarClock,
  RefreshCw,
  Plus,
  Trash2,
  XCircle,
  CalendarDays
} from "lucide-react"

interface Medecin {
  id: number
  specialite: string
  utilisateur: {
    id: number
    username: string
    first_name: string
    last_name: string
  }
}

interface Absence {
  id: number
  medecin: number
  medecin_nom: string
  date_debut: string
  date_fin: string
  motif: string
  date_creation: string
}

export default function PlanningsPage() {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  
  const [form, setForm] = useState({
    medecin: "",
    date_debut: "",
    date_fin: "",
    motif: "Congé"
  })

  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await apiClient.get<CurrentUser>("/accounts/me/")
      return data
    },
  })

  const { data: absences, isLoading, refetch } = useQuery({
    queryKey: ["absences"],
    queryFn: async () => {
      const { data } = await apiClient.get(`/rendezvous/absences/`)
      return data.results as Absence[]
    },
  })

  const { data: medecins } = useQuery({
    queryKey: ["medecins_list"],
    queryFn: async () => {
      const { data } = await apiClient.get(`/medecins/`)
      return data.results as Medecin[]
    },
    enabled: isCreateOpen
  })

  const createMutation = useMutation({
    mutationFn: async () => apiClient.post("/rendezvous/absences/", form),
    onSuccess: () => {
      setIsCreateOpen(false)
      setForm({ medecin: "", date_debut: "", date_fin: "", motif: "Congé" })
      queryClient.invalidateQueries({ queryKey: ["absences"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/rendezvous/absences/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences"] })
    },
  })

  const isMedecin = currentUser?.role === "MEDECIN"

  return (
    <div className="flex-1 flex flex-col">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2.5">
              <CalendarClock className="size-7 text-amber-500" />
              Plannings & Indisponibilités
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestion des congés et absences des médecins
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button onClick={() => refetch()} title="Rafraîchir" className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground">
              <RefreshCw className="size-4" />
            </button>
            <button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-500/25 transition-all hover:scale-[1.01] hover:shadow-amber-500/35 active:scale-[0.99]">
              <Plus className="size-4.5" />
              <span>Déclarer une absence</span>
            </button>
          </div>
        </div>

        <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden mt-2">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <CardTitle className="text-base font-semibold">Absences programmées</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <RefreshCw className="mx-auto size-5 animate-spin mb-2 text-amber-500" />
                Chargement...
              </div>
            ) : absences?.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                <CalendarDays className="mx-auto size-10 mb-2 opacity-30" />
                <p className="font-medium text-foreground">Aucune absence programmée</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-6">Médecin</th>
                      <th className="py-3 px-4">Date de début</th>
                      <th className="py-3 px-4">Date de fin</th>
                      <th className="py-3 px-4">Motif</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {absences?.map((item) => (
                      <tr key={item.id} className="transition-colors hover:bg-muted/30">
                        <td className="py-3 px-6 font-semibold text-foreground">
                          {item.medecin_nom}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {new Date(item.date_debut).toLocaleString('fr-FR')}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {new Date(item.date_fin).toLocaleString('fr-FR')}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium">
                            {item.motif}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              if (confirm("Supprimer cette indisponibilité ?")) {
                                deleteMutation.mutate(item.id)
                              }
                            }}
                            className="rounded-lg p-2 text-destructive transition-colors hover:bg-destructive/10"
                            title="Supprimer"
                          >
                            <Trash2 className="size-4" />
                          </button>
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
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-amber-500">
                <CalendarClock className="size-5" /> 
                Déclarer une absence
              </h3>
              <button 
                onClick={() => setIsCreateOpen(false)} 
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XCircle className="size-5" />
              </button>
            </div>
            
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              createMutation.mutate()
            }} className="mt-6 flex flex-col gap-4">
              
              {!isMedecin && (
                <div className="space-y-1">
                  <Label>Médecin concerné *</Label>
                  <select 
                    required 
                    value={form.medecin} 
                    onChange={e => setForm({...form, medecin: e.target.value})}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Sélectionner</option>
                    {medecins?.map((m) => (
                      <option key={m.id} value={m.id}>
                        Dr. {m.utilisateur.last_name} {m.utilisateur.first_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <Label>Début (Date & Heure) *</Label>
                <Input 
                  type="datetime-local"
                  required 
                  value={form.date_debut} 
                  onChange={e => setForm({...form, date_debut: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <Label>Fin (Date & Heure) *</Label>
                <Input 
                  type="datetime-local"
                  required 
                  value={form.date_fin} 
                  onChange={e => setForm({...form, date_fin: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <Label>Motif *</Label>
                <Input 
                  required 
                  value={form.motif} 
                  onChange={e => setForm({...form, motif: e.target.value})}
                  placeholder="Ex: Congé annuel, Formation, Maladie..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/60 mt-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-amber-500 hover:bg-amber-600 text-white">
                  Enregistrer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

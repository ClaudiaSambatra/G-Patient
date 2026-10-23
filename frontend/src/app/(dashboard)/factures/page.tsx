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
  CreditCard, 
  Search, 
  RefreshCw, 
  Calendar, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  Printer,
  Ban
} from "lucide-react"

interface Facture {
  id: number
  patient: number
  patient_nom: string
  patient_prenom: string
  type: "CONSULTATION" | "MEDICAMENTS"
  type_display: string
  statut: "IMPAYEE" | "PAYEE" | "ANNULEE"
  statut_display: string
  designation: string
  actes: string
  montant: string
  rendez_vous?: number | null
  ordonnance?: number | null
  date_creation: string
  date_paiement?: string | null
  encaisse_par_nom?: string | null
}

interface Patient {
  id: number
  nom: string
  prenom: string
}

export default function FacturesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("ALL")
  const [statutFilter, setStatutFilter] = useState<string>("ALL")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const [form, setForm] = useState({
    patient: "",
    type: "MEDICAMENTS",
    designation: "",
    montant: "",
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
        if (resp.data.detail) return String(resp.data.detail)
        const firstKey = Object.keys(resp.data)[0]
        if (firstKey) {
          const val = resp.data[firstKey]
          return `${firstKey}: ${Array.isArray(val) ? val.join(" ") : String(val)}`
        }
      }
    }
    return fallback
  }

  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await apiClient.get<CurrentUser>("/accounts/me/")
      return data
    },
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["factures", search, typeFilter, statutFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (typeFilter !== "ALL") params.append("type", typeFilter)
      if (statutFilter !== "ALL") params.append("statut", statutFilter)
      const { data } = await apiClient.get<{ results: Facture[] }>(`/billing/?${params.toString()}`)
      return (data.results || []) as Facture[]
    },
  })

  const { data: patients } = useQuery({
    queryKey: ["patients_list_for_billing"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: Patient[] }>(`/patients/`)
      return (data.results || []) as Patient[]
    },
    enabled: isCreateOpen
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post("/billing/", {
        ...form,
        actes: form.designation,
        montant: Number(form.montant)
      })
    },
    onSuccess: () => {
      setIsCreateOpen(false)
      setForm({ patient: "", type: "MEDICAMENTS", designation: "", montant: "" })
      queryClient.invalidateQueries({ queryKey: ["factures"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      showNotification("success", "Facture enregistrée avec succès.")
    },
    onError: () => {
      showNotification("error", "Erreur lors de la création de la facture.")
    }
  })

  const encaisserMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        return await apiClient.post(`/billing/factures/${id}/encaisser/`)
      } catch {
        return await apiClient.post(`/billing/${id}/encaisser/`)
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["factures"] })
      queryClient.invalidateQueries({ queryKey: ["rendezvous"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      showNotification("success", "Facture encaissée avec succès. Le rendez-vous associé est confirmé.")
      handlePrintRecu(id)
    },
    onError: (err) => {
      const msg = extractErrorMessage(err, "Impossible d'encaisser cette facture.")
      showNotification("error", msg)
    }
  })

  function handlePrintRecu(factureId: number) {
    const baseURL = apiClient.defaults.baseURL || "http://localhost:8000/api"
    const recuUrl = `${baseURL}/billing/factures/${factureId}/recu/`
    window.open(recuUrl, "_blank")
  }

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case "PAYEE":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="size-3" /> Payée
          </span>
        )
      case "IMPAYEE":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="size-3" /> Impayée
          </span>
        )
      case "ANNULEE":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300">
            <Ban className="size-3" /> Annulée
          </span>
        )
      default:
        return <span>{statut}</span>
    }
  }

  const getTypeBadge = (type: string) => {
    if (type === "CONSULTATION") {
      return (
        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300">
          Consultation
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 ring-1 ring-inset ring-purple-600/20 dark:bg-purple-950/40 dark:text-purple-300">
        Médicaments
      </span>
    )
  }

  const isSecretaireOrAdmin = currentUser?.role === "SECRETAIRE" || currentUser?.role === "ADMIN" || currentUser?.is_superuser

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
              <CreditCard className="size-7 text-primary" />
              Facturation &amp; Règlements
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Suivi des paiements, encaissement et impression des reçus officiels
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
            {isSecretaireOrAdmin && (
              <button 
                onClick={() => setIsCreateOpen(true)} 
                className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <Plus className="size-4.5" />
                <span>Nouvelle Facture</span>
              </button>
            )}
          </div>
        </div>

        {/* Filtres par recherche, type et statut */}
        <Card className="border-border/80 shadow-xs rounded-2xl p-4 bg-card/60 backdrop-blur-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher par patient, libellé..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Filtre Type */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Type :</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-9 rounded-xl border border-border bg-background px-2.5 text-xs font-medium shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">Tous les types</option>
                  <option value="CONSULTATION">Consultation</option>
                  <option value="MEDICAMENTS">Médicaments</option>
                </select>
              </div>

              {/* Filtre Statut */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Statut :</span>
                <select
                  value={statutFilter}
                  onChange={(e) => setStatutFilter(e.target.value)}
                  className="h-9 rounded-xl border border-border bg-background px-2.5 text-xs font-medium shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">Tous les statuts</option>
                  <option value="IMPAYEE">Impayée</option>
                  <option value="PAYEE">Payée</option>
                  <option value="ANNULEE">Annulée</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Tableau du registre des factures */}
        <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-border/60 bg-muted/20 py-3.5 px-6">
            <CardTitle className="text-base font-semibold">Registre des factures</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <RefreshCw className="mx-auto size-5 animate-spin mb-2 text-primary" />
                Chargement des factures...
              </div>
            ) : data?.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                <CreditCard className="mx-auto size-10 mb-2 opacity-30" />
                <p className="font-medium text-foreground">Aucune facture trouvée</p>
                <p className="text-xs mt-1">Modifiez vos filtres de recherche.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-6">Réf &amp; Date</th>
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Désignation</th>
                      <th className="py-3 px-4 text-right">Montant</th>
                      <th className="py-3 px-4 text-center">Statut</th>
                      <th className="py-3 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {data?.map((f) => (
                      <tr key={f.id} className="transition-colors hover:bg-muted/30">
                        <td className="py-3 px-6 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">FAC-{f.id.toString().padStart(5, "0")}</span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Calendar className="size-3" />
                              {new Date(f.date_creation).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {f.patient_nom} {f.patient_prenom}
                        </td>
                        <td className="py-3 px-4">
                          {getTypeBadge(f.type)}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground truncate max-w-[200px]" title={f.designation || f.actes}>
                          {f.designation || f.actes}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-foreground">
                          {Number(f.montant).toLocaleString("fr-FR")} Ar
                        </td>
                        <td className="py-3 px-4 text-center">
                          {getStatusBadge(f.statut)}
                        </td>
                        <td className="py-3 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Action Encaisser (Secrétaire ou Admin sur facture impayée) */}
                            {isSecretaireOrAdmin && f.statut === "IMPAYEE" && (
                              <Button
                                size="sm"
                                onClick={() => encaisserMutation.mutate(f.id)}
                                disabled={encaisserMutation.isPending}
                                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
                              >
                                <CheckCircle2 className="size-3.5 mr-1" />
                                Encaisser
                              </Button>
                            )}

                            {/* Action Imprimer le reçu (Facture Payée) */}
                            {f.statut === "PAYEE" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePrintRecu(f.id)}
                                className="h-8 text-xs border-primary/30 text-primary hover:bg-primary/10 shadow-xs"
                              >
                                <Printer className="size-3.5 mr-1" />
                                Reçu
                              </Button>
                            )}
                          </div>
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

      {/* Modal Création Facture Manuelle */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <CreditCard className="size-5 text-primary" /> Nouvelle Facture
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
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Sélectionner un patient</option>
                  {patients?.map(p => (
                    <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label>Type de facture *</Label>
                <select 
                  value={form.type} 
                  onChange={e => setForm({...form, type: e.target.value})}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="MEDICAMENTS">Médicaments</option>
                  <option value="CONSULTATION">Consultation</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label>Désignation *</Label>
                <Textarea 
                  required 
                  placeholder="Ex: Médicaments ordonnance n°..." 
                  value={form.designation} 
                  onChange={e => setForm({...form, designation: e.target.value})} 
                />
              </div>

              <div className="space-y-1">
                <Label>Montant total (Ar) *</Label>
                <Input 
                  type="number" 
                  step="100" 
                  min="0" 
                  required 
                  placeholder="20000" 
                  value={form.montant} 
                  onChange={e => setForm({...form, montant: e.target.value})} 
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                  {createMutation.isPending ? "Création..." : "Créer la facture"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

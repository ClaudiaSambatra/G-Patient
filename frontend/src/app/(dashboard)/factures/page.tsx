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
  User,
  Plus,
  CheckCircle2,
  AlertCircle,
  XCircle,
  DollarSign
} from "lucide-react"

interface Facture {
  id: number
  patient: number
  patient_nom: string
  patient_prenom: string
  actes: string
  montant: string
  statut: "EN_ATTENTE" | "PAYEE" | "IMPAYEE"
  date_creation: string
}

interface Patient {
  id: number
  nom: string
  prenom: string
}

export default function FacturesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  
  const [form, setForm] = useState({
    patient: "",
    actes: "",
    montant: "",
    statut: "EN_ATTENTE"
  })

  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await apiClient.get<CurrentUser>("/accounts/me/")
      return data
    },
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["factures", search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      const { data } = await apiClient.get(`/billing/?${params.toString()}`)
      return data.results as Facture[]
    },
  })

  const { data: patients } = useQuery({
    queryKey: ["patients_list_for_billing"],
    queryFn: async () => {
      const { data } = await apiClient.get(`/patients/`)
      return data.results as Patient[]
    },
    enabled: isCreateOpen
  })

  const createMutation = useMutation({
    mutationFn: async () => apiClient.post("/billing/", form),
    onSuccess: () => {
      setIsCreateOpen(false)
      setForm({ patient: "", actes: "", montant: "", statut: "EN_ATTENTE" })
      queryClient.invalidateQueries({ queryKey: ["factures"] })
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, statut }: { id: number, statut: string }) => {
      return apiClient.patch(`/billing/${id}/`, { statut })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["factures"] })
    }
  })

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'PAYEE':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600"><CheckCircle2 className="size-3" /> Payée</span>
      case 'IMPAYEE':
        return <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600"><AlertCircle className="size-3" /> Impayée</span>
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">En attente</span>
    }
  }

  const isSecretaireOrAdmin = currentUser?.role === "SECRETAIRE" || currentUser?.role === "ADMIN" || currentUser?.is_superuser

  return (
    <div className="flex-1 flex flex-col">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2.5">
              <CreditCard className="size-7 text-emerald-600" />
              Facturation
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Génération des factures et suivi des règlements
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button onClick={() => refetch()} title="Rafraîchir" className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground">
              <RefreshCw className="size-4" />
            </button>
            {isSecretaireOrAdmin && (
              <button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 transition-all hover:scale-[1.01] hover:shadow-emerald-500/35 active:scale-[0.99]">
                <Plus className="size-4.5" />
                <span>Nouvelle Facture</span>
              </button>
            )}
          </div>
        </div>

        <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden mt-2">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base font-semibold">Registre des factures</CardTitle>
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Rechercher (patient, actes...)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <RefreshCw className="mx-auto size-5 animate-spin mb-2 text-emerald-600" />
                Chargement...
              </div>
            ) : data?.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                <CreditCard className="mx-auto size-10 mb-2 opacity-30" />
                <p className="font-medium text-foreground">Aucune facture trouvée</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-6">Réf & Date</th>
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4">Actes</th>
                      <th className="py-3 px-4 text-right">Montant</th>
                      <th className="py-3 px-4 text-center">Statut</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {data?.map((f) => (
                      <tr key={f.id} className="transition-colors hover:bg-muted/30">
                        <td className="py-3 px-6 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">FAC-{f.id.toString().padStart(4, '0')}</span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Calendar className="size-3" />
                              {new Date(f.date_creation).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {f.patient_nom} {f.patient_prenom}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground truncate max-w-[200px]" title={f.actes}>
                          {f.actes}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-foreground">
                          {Number(f.montant).toLocaleString('fr-FR')} Ar
                        </td>
                        <td className="py-3 px-4 text-center">
                          {getStatusBadge(f.statut)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <select 
                            value={f.statut}
                            onChange={(e) => updateStatusMutation.mutate({ id: f.id, statut: e.target.value })}
                            className="text-xs bg-background border border-input rounded-md px-2 py-1 shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="EN_ATTENTE">En attente</option>
                            <option value="PAYEE">Payée</option>
                            <option value="IMPAYEE">Impayée</option>
                          </select>
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

      {/* Modal Création Facture */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <CreditCard className="size-5 text-emerald-600" /> Nouvelle Facture
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
                  {patients?.map(p => (
                    <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label>Description des actes *</Label>
                <Textarea 
                  required 
                  placeholder="Ex: Consultation générale + Analyse sang..." 
                  value={form.actes} 
                  onChange={e => setForm({...form, actes: e.target.value})} 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Montant (Ar) *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input 
                      type="number"
                      step="0.01"
                      required 
                      placeholder="0.00" 
                      value={form.montant} 
                      onChange={e => setForm({...form, montant: e.target.value})}
                      className="pl-9" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Statut initial</Label>
                  <select 
                    value={form.statut}
                    onChange={e => setForm({...form, statut: e.target.value})}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="EN_ATTENTE">En attente</option>
                    <option value="PAYEE">Payée</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/60 mt-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {createMutation.isPending ? "Génération..." : "Générer la facture"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

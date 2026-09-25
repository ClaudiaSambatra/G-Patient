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
  Pill, 
  Search, 
  RefreshCw, 
  Plus,
  AlertTriangle,
  Edit3,
  XCircle,
  Package
} from "lucide-react"

interface StockMedicament {
  id: number
  nom: string
  quantite_disponible: number
  seuil_alerte: number
  unite: string
  date_derniere_mise_a_jour: string
  en_alerte: boolean
}

export default function PharmaciePage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<StockMedicament | null>(null)
  
  const [form, setForm] = useState({
    nom: "",
    quantite_disponible: 0,
    seuil_alerte: 10,
    unite: "boîte"
  })

  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await apiClient.get<CurrentUser>("/accounts/me/")
      return data
    },
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["stocks", search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      const { data } = await apiClient.get(`/pharmacy/?${params.toString()}`)
      return data.results as StockMedicament[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => apiClient.post("/pharmacy/", form),
    onSuccess: () => {
      setIsCreateOpen(false)
      setForm({ nom: "", quantite_disponible: 0, seuil_alerte: 10, unite: "boîte" })
      queryClient.invalidateQueries({ queryKey: ["stocks"] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (id: number) => apiClient.patch(`/pharmacy/${id}/`, form),
    onSuccess: () => {
      setEditingItem(null)
      setForm({ nom: "", quantite_disponible: 0, seuil_alerte: 10, unite: "boîte" })
      queryClient.invalidateQueries({ queryKey: ["stocks"] })
    },
  })

  const handleEdit = (item: StockMedicament) => {
    setEditingItem(item)
    setForm({
      nom: item.nom,
      quantite_disponible: item.quantite_disponible,
      seuil_alerte: item.seuil_alerte,
      unite: item.unite
    })
  }

  return (
    <div className="flex-1 flex flex-col">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2.5">
              <Pill className="size-7 text-rose-500" />
              Pharmacie & Stocks
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestion des stocks de médicaments et matériels
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button onClick={() => refetch()} title="Rafraîchir" className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground">
              <RefreshCw className="size-4" />
            </button>
            <button onClick={() => {
              setEditingItem(null)
              setForm({ nom: "", quantite_disponible: 0, seuil_alerte: 10, unite: "boîte" })
              setIsCreateOpen(true)
            }} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-rose-500/25 transition-all hover:scale-[1.01] hover:shadow-rose-500/35 active:scale-[0.99]">
              <Plus className="size-4.5" />
              <span>Nouveau Produit</span>
            </button>
          </div>
        </div>

        <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden mt-2">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base font-semibold">Inventaire actuel</CardTitle>
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Rechercher un médicament..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500/30"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <RefreshCw className="mx-auto size-5 animate-spin mb-2 text-rose-500" />
                Chargement...
              </div>
            ) : data?.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                <Package className="mx-auto size-10 mb-2 opacity-30" />
                <p className="font-medium text-foreground">Aucun produit en stock</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-6">Produit</th>
                      <th className="py-3 px-4 text-right">Quantité</th>
                      <th className="py-3 px-4">Unité</th>
                      <th className="py-3 px-4 text-center">Statut</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {data?.map((item) => (
                      <tr key={item.id} className="transition-colors hover:bg-muted/30">
                        <td className="py-3 px-6 font-semibold text-foreground">
                          {item.nom}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          {item.quantite_disponible}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {item.unite}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.en_alerte ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                              <AlertTriangle className="size-3" /> Alerte stock bas
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                              En stock
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleEdit(item)}
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Edit3 className="size-4" />
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

      {/* Modal Création/Edition */}
      {(isCreateOpen || editingItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Pill className="size-5 text-rose-500" /> 
                {editingItem ? "Mettre à jour le stock" : "Nouveau Produit"}
              </h3>
              <button 
                onClick={() => {
                  setIsCreateOpen(false)
                  setEditingItem(null)
                }} 
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XCircle className="size-5" />
              </button>
            </div>
            
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              if (editingItem) updateMutation.mutate(editingItem.id)
              else createMutation.mutate()
            }} className="mt-6 flex flex-col gap-4">
              
              <div className="space-y-1">
                <Label>Nom du médicament *</Label>
                <Input 
                  required 
                  value={form.nom} 
                  onChange={e => setForm({...form, nom: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Quantité dispo. *</Label>
                  <Input 
                    type="number"
                    required 
                    value={form.quantite_disponible} 
                    onChange={e => setForm({...form, quantite_disponible: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Seuil d'alerte *</Label>
                  <Input 
                    type="number"
                    required 
                    value={form.seuil_alerte} 
                    onChange={e => setForm({...form, seuil_alerte: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Unité (ex: boîte, flacon) *</Label>
                <Input 
                  required 
                  value={form.unite} 
                  onChange={e => setForm({...form, unite: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/60 mt-2">
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreateOpen(false)
                  setEditingItem(null)
                }}>Annuler</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-rose-500 hover:bg-rose-600 text-white">
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

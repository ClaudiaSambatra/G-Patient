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
  XCircle
} from "lucide-react"

interface Ordonnance {
  id: number
  consultation: number
  patient_nom: string
  patient_prenom: string
  medecin_nom: string
  medicaments: string
  posologie: string
  duree: string
  date_creation: string
}

interface Consultation {
  id: number
  patient_nom: string
  patient_prenom: string
  motif: string
  date_consultation: string
}

export default function OrdonnancesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  
  const [form, setForm] = useState({
    consultation: "",
    medicaments: "",
    posologie: "",
    duree: ""
  })

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
      const { data } = await apiClient.get(`/prescriptions/`)
      return data.results as Ordonnance[]
    },
  })

  const { data: consultations } = useQuery({
    queryKey: ["consultations_list"],
    queryFn: async () => {
      const { data } = await apiClient.get(`/consultations/`)
      return data.results as Consultation[]
    },
    enabled: isCreateOpen
  })

  const createMutation = useMutation({
    mutationFn: async () => apiClient.post("/prescriptions/", form),
    onSuccess: () => {
      setIsCreateOpen(false)
      setForm({ consultation: "", medicaments: "", posologie: "", duree: "" })
      queryClient.invalidateQueries({ queryKey: ["ordonnances"] })
    },
  })

  const handlePrint = (ord: Ordonnance) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Ordonnance - ${ord.patient_nom}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .doctor-info { font-weight: bold; font-size: 1.2em; }
            .patient-info { margin-bottom: 30px; font-size: 1.1em; }
            .content { min-height: 400px; }
            .medicaments { white-space: pre-wrap; font-size: 1.1em; line-height: 1.6; }
            .footer { margin-top: 50px; text-align: right; }
            .signature { margin-top: 20px; border-top: 1px dashed #333; display: inline-block; padding-top: 10px; width: 200px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="doctor-info">${ord.medecin_nom}</div>
            <div>Consultation du ${new Date(ord.date_creation).toLocaleDateString('fr-FR')}</div>
          </div>
          <div class="patient-info">
            <strong>Patient :</strong> ${ord.patient_nom} ${ord.patient_prenom}
          </div>
          <div class="content">
            <h3 style="text-decoration: underline;">Prescription :</h3>
            <div class="medicaments">${ord.medicaments}</div>
            <br/><br/>
            <strong>Posologie :</strong><br/>
            <div style="white-space: pre-wrap;">${ord.posologie}</div>
            <br/><br/>
            <strong>Durée du traitement :</strong> ${ord.duree}
          </div>
          <div class="footer">
            <div>Fait le ${new Date().toLocaleDateString('fr-FR')}</div>
            <div class="signature">Signature du médecin</div>
          </div>
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const isMedecin = currentUser?.role === "MEDECIN" || currentUser?.role === "ADMIN" || currentUser?.is_superuser

  return (
    <div className="flex-1 flex flex-col">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2.5">
              <FileSignature className="size-7 text-primary" />
              Prescriptions & Ordonnances
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <button onClick={() => refetch()} title="Rafraîchir" className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground">
              <RefreshCw className="size-4" />
            </button>
            {isMedecin && (
              <button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]">
                <Plus className="size-4.5" />
                <span>Nouvelle Ordonnance</span>
              </button>
            )}
          </div>
        </div>

        <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden mt-2">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <CardTitle className="text-base font-semibold">Historique des prescriptions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <RefreshCw className="mx-auto size-5 animate-spin mb-2 text-primary" />
                Chargement...
              </div>
            ) : data?.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                <FileSignature className="mx-auto size-10 mb-2 opacity-30" />
                <p className="font-medium text-foreground">Aucune ordonnance trouvée</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-6">Date</th>
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4">Médecin</th>
                      <th className="py-3 px-4">Médicaments</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {data?.map((o) => (
                      <tr key={o.id} className="transition-colors hover:bg-muted/30">
                        <td className="py-3 px-6 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="size-4 text-primary" />
                            <span className="font-medium text-foreground">
                              {new Date(o.date_creation).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {o.patient_nom} {o.patient_prenom}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {o.medecin_nom}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground truncate max-w-[200px]" title={o.medicaments}>
                          {o.medicaments}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handlePrint(o)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                          >
                            <Printer className="size-3.5" />
                            Imprimer
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

      {/* Modal Création Ordonnance */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FileSignature className="size-5 text-primary" /> Nouvelle Ordonnance
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <XCircle className="size-5" />
              </button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="mt-6 flex flex-col gap-4">
              <div className="space-y-1">
                <Label>Consultation de référence *</Label>
                <select 
                  required 
                  value={form.consultation} 
                  onChange={e => setForm({...form, consultation: e.target.value})}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Sélectionner une consultation</option>
                  {consultations?.map(c => (
                    <option key={c.id} value={c.id}>
                      {new Date(c.date_consultation).toLocaleDateString('fr-FR')} - {c.patient_nom} {c.patient_prenom} ({c.motif})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label>Médicaments *</Label>
                <Textarea 
                  required 
                  placeholder="Ex: Paracétamol 1g..." 
                  value={form.medicaments} 
                  onChange={e => setForm({...form, medicaments: e.target.value})} 
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-1">
                <Label>Posologie *</Label>
                <Textarea 
                  required 
                  placeholder="Ex: 1 comprimé matin, midi et soir..." 
                  value={form.posologie} 
                  onChange={e => setForm({...form, posologie: e.target.value})} 
                  className="min-h-[80px]"
                />
              </div>
              
              <div className="space-y-1">
                <Label>Durée du traitement *</Label>
                <Input 
                  required 
                  placeholder="Ex: 7 jours" 
                  value={form.duree} 
                  onChange={e => setForm({...form, duree: e.target.value})} 
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {createMutation.isPending ? "Création..." : "Créer et Imprimer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

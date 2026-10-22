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
  CreditCard,
  XCircle,
  CheckCircle2,
  AlertCircle
} from "lucide-react"

interface Ordonnance {
  id: number
  consultation: number
  patient_id?: number
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
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Modal Facture Médicaments
  const [factureModal, setFactureModal] = useState<{
    isOpen: boolean
    ordonnance: Ordonnance | null
    designation: string
    montant: string
  }>({
    isOpen: false,
    ordonnance: null,
    designation: "",
    montant: ""
  })

  const [form, setForm] = useState({
    consultation: "",
    medicaments: "",
    posologie: "",
    duree: ""
  })

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
    queryKey: ["ordonnances", search],
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: Ordonnance[] }>(`/prescriptions/`)
      return (data.results || []) as Ordonnance[]
    },
  })

  const { data: consultations } = useQuery({
    queryKey: ["consultations_list"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: Consultation[] }>(`/consultations/`)
      return (data.results || []) as Consultation[]
    },
    enabled: isCreateOpen
  })

  const createMutation = useMutation({
    mutationFn: async () => apiClient.post("/prescriptions/", form),
    onSuccess: () => {
      setIsCreateOpen(false)
      setForm({ consultation: "", medicaments: "", posologie: "", duree: "" })
      queryClient.invalidateQueries({ queryKey: ["ordonnances"] })
      showNotification("success", "Ordonnance rédigée avec succès.")
    },
    onError: () => {
      showNotification("error", "Erreur lors de la création de l'ordonnance.")
    }
  })

  const createFactureMedicamentsMutation = useMutation({
    mutationFn: async () => {
      if (!factureModal.ordonnance) return
      return apiClient.post("/billing/", {
        ordonnance: factureModal.ordonnance.id,
        patient: factureModal.ordonnance.patient_id,
        type: "MEDICAMENTS",
        designation: factureModal.designation,
        actes: factureModal.designation,
        montant: Number(factureModal.montant)
      })
    },
    onSuccess: () => {
      setFactureModal({ isOpen: false, ordonnance: null, designation: "", montant: "" })
      queryClient.invalidateQueries({ queryKey: ["factures"] })
      showNotification("success", "Facture des médicaments créée avec succès.")
    },
    onError: () => {
      showNotification("error", "Erreur lors de la création de la facture des médicaments.")
    }
  })

  const handlePrint = (ord: Ordonnance) => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ordonnance - ${ord.patient_nom}</title>
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
            <div class="doctor-info">${ord.medecin_nom}</div>
            <div style="font-size: 0.9em; color: #64748b;">Date de prescription : ${new Date(ord.date_creation).toLocaleDateString("fr-FR")}</div>
          </div>
          <div class="patient-box">
            <strong>Patient :</strong> ${ord.patient_nom} ${ord.patient_prenom}
          </div>
          <div class="content">
            <h3 style="color: #0f766e; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">PRESCRIPTION MÉDICALE</h3>
            <div class="medicaments">${ord.medicaments}</div>
            ${ord.posologie ? `<div class="posology-item"><strong>Posologie :</strong> ${ord.posologie}</div>` : ""}
            ${ord.duree ? `<div class="posology-item"><strong>Durée de traitement :</strong> ${ord.duree}</div>` : ""}
          </div>
          <div class="footer">
            <div class="signature">Signature et cachet du médecin</div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const isDoctorOrAdmin = currentUser?.role === "MEDECIN" || currentUser?.role === "ADMIN" || currentUser?.is_superuser
  const isSecretaireOrAdmin = currentUser?.role === "SECRETAIRE" || currentUser?.role === "ADMIN" || currentUser?.is_superuser

  const filteredOrdonnances = (data || []).filter(ord => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      ord.patient_nom.toLowerCase().includes(q) ||
      ord.patient_prenom.toLowerCase().includes(q) ||
      ord.medecin_nom.toLowerCase().includes(q) ||
      ord.medicaments.toLowerCase().includes(q)
    )
  })

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
              <FileSignature className="size-7 text-primary" />
              Ordonnances Médicales
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Rédaction, impression et facturation des prescriptions médicamenteuses
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button onClick={() => refetch()} title="Rafraîchir" className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground">
              <RefreshCw className="size-4" />
            </button>
            {isDoctorOrAdmin && (
              <button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]">
                <Plus className="size-4.5" />
                <span>Rédiger une ordonnance</span>
              </button>
            )}
          </div>
        </div>

        {/* Barre de recherche */}
        <Card className="border-border/80 shadow-xs rounded-2xl p-4 bg-card/60 backdrop-blur-xs">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par patient, médicament..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </Card>

        {/* Tableau des ordonnances */}
        <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-border/60 bg-muted/20 py-3.5 px-6">
            <CardTitle className="text-base font-semibold">Registre des prescriptions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <RefreshCw className="mx-auto size-5 animate-spin mb-2 text-primary" />
                Chargement des ordonnances...
              </div>
            ) : filteredOrdonnances.length === 0 ? (
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
                      <th className="py-3 px-4">Médicaments prescrits</th>
                      <th className="py-3 px-4">Durée</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredOrdonnances.map((ord) => (
                      <tr key={ord.id} className="transition-colors hover:bg-muted/30">
                        <td className="py-3 px-6 whitespace-nowrap">
                          <span className="flex items-center gap-1.5 text-foreground font-medium">
                            <Calendar className="size-3.5 text-muted-foreground" />
                            {new Date(ord.date_creation).toLocaleDateString("fr-FR")}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">
                          <span className="flex items-center gap-1.5">
                            <User className="size-3.5 text-muted-foreground" />
                            {ord.patient_nom} {ord.patient_prenom}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Stethoscope className="size-3.5 text-emerald-600" />
                            {ord.medecin_nom}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="line-clamp-2 text-xs font-medium max-w-[280px]" title={ord.medicaments}>
                            {ord.medicaments}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {ord.duree || "Non spécifiée"}
                        </td>
                        <td className="py-3 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Bouton Imprimer l'ordonnance (Médecin & tous) */}
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handlePrint(ord)} 
                              className="h-8 gap-1.5 text-xs border-border bg-card hover:bg-muted text-foreground"
                            >
                              <Printer className="size-3.5 text-primary" />
                              <span>Imprimer</span>
                            </Button>

                            {/* Bouton Créer la facture des médicaments (Secrétaire & Admin) */}
                            {isSecretaireOrAdmin && (
                              <Button
                                size="sm"
                                onClick={() => setFactureModal({
                                  isOpen: true,
                                  ordonnance: ord,
                                  designation: `Médicaments, ordonnance n°${ord.id}`,
                                  montant: ""
                                })}
                                className="h-8 gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white font-medium"
                              >
                                <CreditCard className="size-3.5" />
                                <span>Facturer médicaments</span>
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

      {/* Modal Créer Ordonnance */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FileSignature className="size-5 text-primary" /> Rédiger une ordonnance
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <XCircle className="size-5" />
              </button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="mt-6 flex flex-col gap-4">
              <div className="space-y-1">
                <Label>Consultation liée *</Label>
                <select 
                  required 
                  value={form.consultation} 
                  onChange={e => setForm({...form, consultation: e.target.value})}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Sélectionner la consultation</option>
                  {consultations?.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.patient_nom} {c.patient_prenom} — {c.motif} ({new Date(c.date_consultation).toLocaleDateString("fr-FR")})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label>Médicaments (un par ligne) *</Label>
                <Textarea 
                  required 
                  placeholder="Ex : Paracétamol 1g&#10;Amoxicilline 500mg" 
                  value={form.medicaments} 
                  onChange={e => setForm({...form, medicaments: e.target.value})} 
                  rows={4}
                />
              </div>

              <div className="space-y-1">
                <Label>Posologie</Label>
                <Input 
                  placeholder="Ex : 1 comprimé 3 fois par jour après les repas" 
                  value={form.posologie} 
                  onChange={e => setForm({...form, posologie: e.target.value})} 
                />
              </div>

              <div className="space-y-1">
                <Label>Durée du traitement</Label>
                <Input 
                  placeholder="Ex : 7 jours" 
                  value={form.duree} 
                  onChange={e => setForm({...form, duree: e.target.value})} 
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                  {createMutation.isPending ? "Enregistrement..." : "Créer l'ordonnance"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Créer la facture des médicaments */}
      {factureModal.isOpen && factureModal.ordonnance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <CreditCard className="size-5 text-primary" /> Facturer les médicaments
              </h3>
              <button 
                onClick={() => setFactureModal({ isOpen: false, ordonnance: null, designation: "", montant: "" })} 
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); createFactureMedicamentsMutation.mutate(); }} className="mt-5 flex flex-col gap-4">
              <div className="rounded-xl bg-muted/40 p-3 text-xs space-y-1 border border-border/60">
                <p><strong>Patient :</strong> {factureModal.ordonnance.patient_nom} {factureModal.ordonnance.patient_prenom}</p>
                <p><strong>Prescription :</strong> Ordonnance n°{factureModal.ordonnance.id}</p>
                <p className="text-muted-foreground truncate"><strong>Contenu :</strong> {factureModal.ordonnance.medicaments}</p>
              </div>

              <div className="space-y-1">
                <Label>Désignation de la facture *</Label>
                <Input
                  required
                  value={factureModal.designation}
                  onChange={(e) => setFactureModal({ ...factureModal, designation: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label>Montant total (Ar) *</Label>
                <Input
                  type="number"
                  step="100"
                  min="0"
                  required
                  placeholder="Ex : 25000"
                  value={factureModal.montant}
                  onChange={(e) => setFactureModal({ ...factureModal, montant: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setFactureModal({ isOpen: false, ordonnance: null, designation: "", montant: "" })}
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={createFactureMedicamentsMutation.isPending || !factureModal.montant}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  {createFactureMedicamentsMutation.isPending ? "Création..." : "Générer la facture"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

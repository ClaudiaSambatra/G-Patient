import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CreditCard, XCircle } from "lucide-react"
import { Patient, RdvOption } from "./types"

interface FactureCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: () => void
  isPending: boolean
  form: {
    patient: string
    rendez_vous: string
    type: string
    designation: string
    montant: string
  }
  setForm: React.Dispatch<React.SetStateAction<{
    patient: string
    rendez_vous: string
    type: string
    designation: string
    montant: string
  }>>
  patients?: Patient[]
  patientRdvs?: RdvOption[]
}

export function FactureCreateModal({
  isOpen,
  onClose,
  onSubmit,
  isPending,
  form,
  setForm,
  patients,
  patientRdvs,
}: FactureCreateModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <CreditCard className="size-5 text-primary" /> Nouvelle Facture
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <XCircle className="size-5" />
          </button>
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="mt-6 flex flex-col gap-4">
          <div className="space-y-1">
            <Label>Patient *</Label>
            <select 
              required 
              value={form.patient} 
              onChange={e => setForm({...form, patient: e.target.value, rendez_vous: ""})}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Sélectionner un patient</option>
              {patients?.map(p => (
                <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>
              ))}
            </select>
          </div>

          {form.patient && patientRdvs && patientRdvs.length > 0 && (
            <div className="space-y-1.5 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <Label className="text-xs font-semibold text-foreground">
                Rattacher à un rendez-vous planifié
              </Label>
              <select
                value={form.rendez_vous}
                onChange={e => setForm({ ...form, rendez_vous: e.target.value })}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Liaison automatique lors de l&apos;encaissement</option>
                {patientRdvs.map(r => (
                  <option key={r.id} value={r.id}>
                    RDV #{r.id} du {new Date(r.date_heure).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })} {r.medecin_nom ? `— Dr. ${r.medecin_nom}` : ""}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                Le rendez-vous sélectionné sera automatiquement confirmé lors du règlement de cette facture.
              </p>
            </div>
          )}

          <div className="space-y-1">
            <Label>Type de prestation *</Label>
            <select 
              value={form.type} 
              onChange={e => setForm({...form, type: e.target.value})}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="CONSULTATION">Consultation médicale</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label>Désignation / Motif *</Label>
            <Input 
              required 
              placeholder="Ex: Frais de consultation, Acte médical..." 
              value={form.designation} 
              onChange={e => setForm({...form, designation: e.target.value})} 
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>Montant total (Ar) *</Label>
              <span className="text-[11px] text-muted-foreground">Tarif standard : 20 000 Ar</span>
            </div>
            <Input 
              type="number" 
              step="500" 
              min="0" 
              required 
              placeholder="20000" 
              value={form.montant} 
              onChange={e => setForm({...form, montant: e.target.value})} 
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              {isPending ? "Création..." : "Créer la facture"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

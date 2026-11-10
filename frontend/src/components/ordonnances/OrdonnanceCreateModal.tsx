import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { FileSignature, XCircle } from "lucide-react"
import { Consultation, LigneOrdonnance } from "./types"
import { OrdonnanceLignesForm } from "./OrdonnanceLignesForm"

interface OrdonnanceCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  isPending: boolean
  consultations?: Consultation[]
  formConsultation: string
  setFormConsultation: (v: string) => void
  formLignes: LigneOrdonnance[]
  onAddLine: () => void
  onUpdateLine: (index: number, field: keyof LigneOrdonnance, value: string) => void
  onRemoveLine: (index: number) => void
}

export function OrdonnanceCreateModal({
  isOpen,
  onClose,
  onSubmit,
  isPending,
  consultations,
  formConsultation,
  setFormConsultation,
  formLignes,
  onAddLine,
  onUpdateLine,
  onRemoveLine,
}: OrdonnanceCreateModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileSignature className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                Créer une ordonnance
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <XCircle className="size-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Consultation *</Label>
            <select
              required
              value={formConsultation}
              onChange={(e) => setFormConsultation(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Sélectionner une consultation...</option>
              {consultations?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.patient_nom} {c.patient_prenom} — {c.motif || "Consultation"} (
                  {new Date(c.date_consultation).toLocaleDateString("fr-FR")})
                  {c.medecin_nom ? ` [Dr. ${c.medecin_nom}]` : ""}
                </option>
              ))}
            </select>
          </div>

          <OrdonnanceLignesForm
            lignes={formLignes}
            onAddLine={onAddLine}
            onUpdateLine={onUpdateLine}
            onRemoveLine={onRemoveLine}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
            >
              {isPending ? "Génération..." : "Valider l'ordonnance"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileSignature, XCircle } from "lucide-react"

export interface FactureMedModalState {
  isOpen: boolean
  ordonnanceId: number
  patientId: number
  designation: string
  montant: string
}

interface FactureMedicamentsModalProps {
  modalState: FactureMedModalState | null
  setModalState: React.Dispatch<React.SetStateAction<FactureMedModalState | null>>
  onSubmit: (e: React.FormEvent) => void
  isPending: boolean
}

export function FactureMedicamentsModal({
  modalState,
  setModalState,
  onSubmit,
  isPending,
}: FactureMedicamentsModalProps) {
  if (!modalState?.isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h3 className="text-base font-bold flex items-center gap-2">
            <FileSignature className="size-5 text-emerald-600" />
            Créer la facture des médicaments
          </h3>
          <button
            type="button"
            onClick={() => setModalState(null)}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted"
          >
            <XCircle className="size-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="facture-med-desig">Désignation *</Label>
            <Input
              id="facture-med-desig"
              required
              value={modalState.designation}
              onChange={(e) =>
                setModalState((prev) =>
                  prev ? { ...prev, designation: e.target.value } : null
                )
              }
              placeholder="Ex: Médicaments, ordonnance n°12"
              className="mt-1 rounded-xl"
            />
          </div>

          <div>
            <Label htmlFor="facture-med-montant">Montant total (Ar) *</Label>
            <Input
              id="facture-med-montant"
              type="number"
              required
              min="0"
              step="500"
              value={modalState.montant}
              onChange={(e) =>
                setModalState((prev) =>
                  prev ? { ...prev, montant: e.target.value } : null
                )
              }
              placeholder="Ex: 35000"
              className="mt-1 rounded-xl"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalState(null)}
              className="rounded-xl"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isPending || !modalState.montant}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
            >
              {isPending ? "Création..." : "Enregistrer la facture"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

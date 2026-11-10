import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Pencil, XCircle, ShieldAlert } from "lucide-react"
import { Ordonnance, LigneOrdonnance } from "./types"
import { OrdonnanceLignesForm } from "./OrdonnanceLignesForm"

interface OrdonnanceEditModalProps {
  isOpen: boolean
  ordonnance: Ordonnance | null
  motif: string
  setMotif: (motif: string) => void
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  isPending: boolean
  formLignes: LigneOrdonnance[]
  onAddLine: () => void
  onUpdateLine: (index: number, field: keyof LigneOrdonnance, value: string) => void
  onRemoveLine: (index: number) => void
}

export function OrdonnanceEditModal({
  isOpen,
  ordonnance,
  motif,
  setMotif,
  onClose,
  onSubmit,
  isPending,
  formLignes,
  onAddLine,
  onUpdateLine,
  onRemoveLine,
}: OrdonnanceEditModalProps) {
  if (!isOpen || !ordonnance) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <Pencil className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                Correction de l&apos;ordonnance {ordonnance.numero}
              </h3>
              <p className="text-xs text-muted-foreground">
                Patient :{" "}
                <strong>
                  {ordonnance.patient_nom} {ordonnance.patient_prenom}
                </strong>
              </p>
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
          {/* Alerte et Motif de correction obligatoire */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-xs">
              <ShieldAlert className="size-4" />
              Traçabilité réglementaire obligatoire
            </div>
            <p className="text-xs text-muted-foreground">
              Conformément aux exigences médicales, tout changement sur une
              ordonnance validée doit être justifié et sera consigné dans
              l&apos;historique d&apos;audit.
            </p>
            <div className="space-y-1 pt-1">
              <Label className="text-xs font-bold text-foreground">
                Motif médical de la correction *
              </Label>
              <Textarea
                required
                rows={2}
                placeholder="Ex : Remplacement pour intolérance digestive, adaptation de la posologie..."
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                className="rounded-xl text-xs bg-background"
              />
            </div>
          </div>

          <OrdonnanceLignesForm
            lignes={formLignes}
            onAddLine={onAddLine}
            onUpdateLine={onUpdateLine}
            onRemoveLine={onRemoveLine}
            title="Lignes de prescription"
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
              disabled={isPending || !motif.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl"
            >
              {isPending ? "Enregistrement..." : "Enregistrer la correction"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

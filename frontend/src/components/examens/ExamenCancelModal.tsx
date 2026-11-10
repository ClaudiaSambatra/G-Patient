import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Prohibit, X } from "@phosphor-icons/react"
import { DemandeExamen } from "./types"

interface ExamenCancelModalProps {
  isOpen: boolean
  demande: DemandeExamen | null
  motif: string
  setMotif: (v: string) => void
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  isPending: boolean
}

export function ExamenCancelModal({
  isOpen,
  demande,
  motif,
  setMotif,
  onClose,
  onSubmit,
  isPending,
}: ExamenCancelModalProps) {
  if (!isOpen || !demande) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h3 className="text-base font-bold flex items-center gap-2 text-red-600 dark:text-red-400">
            <Prohibit size={22} weight="duotone" />
            Annuler la demande {demande.numero}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1 text-muted-foreground hover:bg-muted"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Une annulation est définitive. Elle préserve l&apos;intégrité
            médico-légale du dossier patient et enregistre le motif de suppression.
          </p>

          <div>
            <Label
              htmlFor="cancel-motif"
              className="font-semibold text-xs text-foreground"
            >
              Motif obligatoire de l&apos;annulation *
            </Label>
            <Textarea
              id="cancel-motif"
              required
              rows={3}
              placeholder="Ex : Erreur d'orientation, patient hospitalisé, examens réalisés sur place..."
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              className="mt-1.5 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl"
            >
              Fermer
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl"
            >
              {isPending ? "Annulation..." : "Confirmer l'annulation"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

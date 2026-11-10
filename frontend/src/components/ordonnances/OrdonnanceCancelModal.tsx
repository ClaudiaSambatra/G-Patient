import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Ban, XCircle } from "lucide-react"
import { Ordonnance } from "./types"

interface OrdonnanceCancelModalProps {
  isOpen: boolean
  ordonnance: Ordonnance | null
  motif: string
  setMotif: (motif: string) => void
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  isPending: boolean
}

export function OrdonnanceCancelModal({
  isOpen,
  ordonnance,
  motif,
  setMotif,
  onClose,
  onSubmit,
  isPending,
}: OrdonnanceCancelModalProps) {
  if (!isOpen || !ordonnance) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl border border-destructive/40 bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h3 className="text-base font-bold text-destructive flex items-center gap-2">
            <Ban className="size-5" /> Annuler l&apos;ordonnance {ordonnance.numero}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
          >
            <XCircle className="size-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Cette action marquera l&apos;ordonnance comme annulée. Un motif obligatoire
            doit être consigné.
          </p>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Motif d&apos;annulation *</Label>
            <Textarea
              required
              rows={3}
              placeholder="Ex : Erreur de diagnostic, prescription remplacée par un autre protocole..."
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              className="rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl text-xs"
            >
              Retour
            </Button>
            <Button
              type="submit"
              disabled={isPending || !motif.trim()}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold rounded-xl text-xs"
            >
              {isPending ? "Annulation..." : "Confirmer l'annulation"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

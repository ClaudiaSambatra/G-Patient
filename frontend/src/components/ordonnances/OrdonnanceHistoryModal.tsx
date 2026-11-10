import { Button } from "@/components/ui/button"
import { History, XCircle, User, Clock } from "lucide-react"
import { Ordonnance } from "./types"

interface OrdonnanceHistoryModalProps {
  isOpen: boolean
  ordonnance: Ordonnance | null
  onClose: () => void
}

export function OrdonnanceHistoryModal({
  isOpen,
  ordonnance,
  onClose,
}: OrdonnanceHistoryModalProps) {
  if (!isOpen || !ordonnance) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <History className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                Historique d&apos;audit — {ordonnance.numero}
              </h3>
              <p className="text-xs text-muted-foreground">
                Traçabilité complète des corrections apportées
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

        <div className="mt-5 space-y-4">
          {ordonnance.historique?.map((h) => (
            <div
              key={h.id}
              className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between text-muted-foreground border-b border-border/40 pb-2">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <User className="size-3.5" />
                  {h.auteur_nom}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {new Date(h.date_modification).toLocaleString("fr-FR")}
                </span>
              </div>

              <div>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  Motif :{" "}
                </span>
                <span className="text-foreground">{h.motif_correction}</span>
              </div>

              {h.anciennes_lignes && h.anciennes_lignes.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/40">
                  <span className="font-semibold text-muted-foreground">
                    Prescription initiale :
                  </span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-muted-foreground">
                    {h.anciennes_lignes.map((l, i) => (
                      <li key={i}>
                        {l.medicament} {l.dosage || ""} — {l.frequence} ({l.duree})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {h.nouvelles_lignes && h.nouvelles_lignes.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/40">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Nouvelle prescription :
                  </span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-foreground font-medium">
                    {h.nouvelles_lignes.map((l, i) => (
                      <li key={i}>
                        {l.medicament} {l.dosage || ""} — {l.frequence} ({l.duree})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-5 border-t border-border/60 mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl text-xs"
          >
            Fermer
          </Button>
        </div>
      </div>
    </div>
  )
}

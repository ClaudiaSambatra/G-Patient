import { Button } from "@/components/ui/button"
import { ClockCounterClockwise, User, X } from "@phosphor-icons/react"
import { DemandeExamen } from "./types"

interface ExamenHistoryModalProps {
  isOpen: boolean
  demande: DemandeExamen | null
  onClose: () => void
}

export function ExamenHistoryModal({
  isOpen,
  demande,
  onClose,
}: ExamenHistoryModalProps) {
  if (!isOpen || !demande) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h3 className="text-base font-bold flex items-center gap-2">
            <ClockCounterClockwise
              size={22}
              weight="duotone"
              className="text-amber-600"
            />
            Audit Trail — Demande {demande.numero}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1 text-muted-foreground hover:bg-muted"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="space-y-4">
          {!demande.historique || demande.historique.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">
              Aucune modification enregistrée pour cette demande.
            </p>
          ) : (
            demande.historique.map((h, i) => (
              <div
                key={h.id || i}
                className="p-4 rounded-2xl border border-border/80 bg-muted/20 text-xs space-y-2.5"
              >
                <div className="flex items-center justify-between text-muted-foreground border-b border-border/50 pb-2">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <User size={15} weight="duotone" />
                    {h.auteur_nom || "Praticien"}
                  </span>
                  <span className="text-[11px] font-mono">
                    {new Date(h.date_modification).toLocaleString("fr-FR")}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
                  <strong>Motif consigné :</strong> {h.motif_correction}
                </div>

                {h.anciennes_lignes && h.anciennes_lignes.length > 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Anciens examens prescrits :
                    </span>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      {h.anciennes_lignes.map((al, idx) => (
                        <li key={idx}>
                          {al.nom_examen} ({al.categorie})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-xl"
          >
            Fermer
          </Button>
        </div>
      </div>
    </div>
  )
}

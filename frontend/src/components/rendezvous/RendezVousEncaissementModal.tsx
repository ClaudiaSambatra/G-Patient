"use client"

import { CheckCircle2, XCircle, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EncaissementModalState } from "./types"

interface RendezVousEncaissementModalProps {
  modalState: EncaissementModalState | null
  onClose: () => void
  onEncaisser: (factureId: number) => void
  isEncaisserPending: boolean
  onPrintRecu: (factureId: number) => void
  onRefetch: () => void
}

export function RendezVousEncaissementModal({
  modalState,
  onClose,
  onEncaisser,
  isEncaisserPending,
  onPrintRecu,
  onRefetch,
}: RendezVousEncaissementModalProps) {
  if (!modalState?.isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h3 className="text-base font-bold flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-600" />
            {modalState.isPaid ? "Paiement encaissé" : "Encaissement des frais de consultation"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          >
            <XCircle className="size-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Patient</span>
              <span className="font-semibold text-foreground">{modalState.patientNom}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Désignation</span>
              <span className="font-medium text-foreground">Frais de consultation</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-3 pt-3 border-t border-border/60">
              <span className="font-semibold text-foreground">Montant à régler</span>
              <span className="text-lg font-bold text-primary">
                {modalState.montant.toLocaleString("fr-FR")} Ar
              </span>
            </div>
          </div>

          {modalState.isPaid ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-300">
              <p className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                Paiement enregistré avec succès !
              </p>
              <p className="mt-1 text-[11px] opacity-90">
                Le rendez-vous est maintenant confirmé. Vous pouvez imprimer le reçu officiel pour le patient.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Le patient paie les frais de consultation à l&apos;accueil. L&apos;encaissement confirmera automatiquement le rendez-vous.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-border/60">
          {modalState.isPaid ? (
            <>
              <Button
                type="button"
                onClick={() => onPrintRecu(modalState.factureId)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
              >
                <Printer className="size-4" />
                Imprimer le reçu
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onClose()
                  onRefetch()
                }}
              >
                Fermer
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={onClose}>
                Plus tard
              </Button>
              <Button
                type="button"
                disabled={isEncaisserPending}
                onClick={() => onEncaisser(modalState.factureId)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
              >
                <CheckCircle2 className="size-4" />
                {isEncaisserPending ? "Encaissement..." : "Encaisser maintenant"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

"use client"

import { FileText, XCircle, RefreshCw, FileSignature } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ConsultationOrigineModalState } from "./types"

interface RendezVousConsultationOrigineModalProps {
  modalState: ConsultationOrigineModalState
  onClose: () => void
}

export function RendezVousConsultationOrigineModal({
  modalState,
  onClose,
}: RendezVousConsultationOrigineModalProps) {
  if (!modalState.isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              Consultation d&apos;origine
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dossier de référence pour la visite de suivi gratuite
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          >
            <XCircle className="size-5" />
          </button>
        </div>

        {modalState.loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <RefreshCw className="mx-auto size-5 animate-spin mb-2 text-primary" />
            Chargement de la consultation d&apos;origine…
          </div>
        ) : modalState.consultation ? (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs bg-muted/20 p-3 rounded-xl border border-border/60">
              <div>
                <span className="text-muted-foreground">Patient :</span>{" "}
                <strong className="text-foreground">
                  {modalState.consultation.patient_nom} {modalState.consultation.patient_prenom}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground">Médecin d&apos;origine :</span>{" "}
                <strong className="text-foreground">{modalState.consultation.medecin_nom}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Date consultation :</span>{" "}
                <span className="font-medium text-foreground">
                  {new Date(modalState.consultation.date_consultation).toLocaleString("fr-FR")}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Statut paiement initial :</span>{" "}
                <span className="font-semibold text-emerald-600">Payé</span>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground uppercase font-semibold">Motif</Label>
                <p className="mt-1 rounded-lg border border-border/60 bg-muted/10 p-2.5 text-xs text-foreground">
                  {modalState.consultation.motif || "Non renseigné"}
                </p>
              </div>

              {modalState.consultation.observations && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase font-semibold">Observations</Label>
                  <p className="mt-1 rounded-lg border border-border/60 bg-muted/10 p-2.5 text-xs text-foreground whitespace-pre-wrap">
                    {modalState.consultation.observations}
                  </p>
                </div>
              )}

              {modalState.consultation.diagnostic && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase font-semibold">Diagnostic</Label>
                  <p className="mt-1 rounded-lg border border-border/60 bg-muted/10 p-2.5 text-xs text-foreground whitespace-pre-wrap font-medium">
                    {modalState.consultation.diagnostic}
                  </p>
                </div>
              )}

              {modalState.consultation.compte_rendu && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase font-semibold">Compte-rendu</Label>
                  <p className="mt-1 rounded-lg border border-border/60 bg-muted/10 p-2.5 text-xs text-foreground whitespace-pre-wrap">
                    {modalState.consultation.compte_rendu}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border/60">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <FileSignature className="size-4 text-primary" />
                Ordonnances délivrées lors de la consultation d&apos;origine
              </h4>
              {modalState.ordonnances.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Aucune ordonnance rédigée lors de cette consultation.
                </p>
              ) : (
                <div className="space-y-2">
                  {modalState.ordonnances.map((ord) => (
                    <div key={ord.id} className="rounded-xl border border-border/70 bg-card p-3 text-xs space-y-1.5">
                      <div className="flex justify-between items-center font-bold text-foreground">
                        <span className="font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                          {ord.numero || `Ordonnance n°${ord.id}`}
                        </span>
                        <span className="text-muted-foreground font-normal">
                          {new Date(ord.date_creation).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-muted-foreground">Médicaments :</span>
                        <div className="font-mono text-foreground mt-0.5 whitespace-pre-wrap">{ord.medicaments}</div>
                      </div>
                      <div>
                        <span className="font-semibold text-muted-foreground">Posologie :</span>{" "}
                        <span className="text-foreground">{ord.posologie}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-muted-foreground">Durée :</span>{" "}
                        <span className="text-foreground">{ord.duree}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Détails de consultation indisponibles.
          </div>
        )}

        <div className="flex justify-end pt-4 mt-4 border-t border-border/60">
          <Button type="button" variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  )
}

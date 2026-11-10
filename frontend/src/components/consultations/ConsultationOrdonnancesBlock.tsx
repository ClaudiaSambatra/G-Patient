import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CurrentUser } from "@/components/sidebar"
import { FileSignature, Plus, Printer, Pill } from "lucide-react"

interface ConsultationOrdonnancesBlockProps {
  currentPrescriptions: any[]
  currentUser?: CurrentUser
  onPrintPrescription: (ord: any) => void
  onOpenFactureMedModal: (ord: any) => void
}

export function ConsultationOrdonnancesBlock({
  currentPrescriptions,
  currentUser,
  onPrintPrescription,
  onOpenFactureMedModal,
}: ConsultationOrdonnancesBlockProps) {
  const isSecretaryOrAdmin =
    currentUser?.role === "ADMIN" || currentUser?.role === "SECRETAIRE"

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Pill className="size-4 text-primary" />
          Ordonnances et Prescriptions ({currentPrescriptions.length})
        </h4>

        {currentPrescriptions.length === 0 ? (
          <Link
            href="/ordonnances"
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors shadow-xs"
          >
            <FileSignature className="size-3.5" /> Gérer dans Ordonnances →
          </Link>
        ) : (
          <Link
            href="/ordonnances"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <FileSignature className="size-3.5" /> Ouvrir dans Ordonnances →
          </Link>
        )}
      </div>

      {currentPrescriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-border/70 bg-muted/10 text-center gap-2">
          <FileSignature className="size-8 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">
            Aucune ordonnance n&apos;a été délivrée lors de cette consultation.
          </p>
          <Link
            href="/ordonnances"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
          >
            <Plus className="size-3.5" /> Gérer dans Ordonnances
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {currentPrescriptions.map((ord: any) => (
            <div
              key={ord.id}
              className="rounded-xl border border-border/80 bg-muted/20 p-3.5 text-xs space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    {ord.numero || `Ordonnance n°${ord.id}`}
                  </span>
                  {ord.statut === "ACTIVE" && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Active
                    </span>
                  )}
                  {ord.statut === "MODIFIEE" && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      Modifiée
                    </span>
                  )}
                  {ord.statut === "ANNULEE" && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                      Annulée
                    </span>
                  )}
                  <span className="text-muted-foreground font-normal text-[11px]">
                    Émise le {new Date(ord.date_creation).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onPrintPrescription(ord)}
                    className="h-7 text-xs px-2.5 gap-1 rounded-lg"
                  >
                    <Printer className="size-3" /> Imprimer
                  </Button>
                  {isSecretaryOrAdmin &&
                    !ord.facture_id &&
                    ord.statut !== "ANNULEE" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenFactureMedModal(ord)}
                        className="h-7 text-xs px-2.5 gap-1 text-emerald-700 hover:bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:hover:bg-emerald-950/40 rounded-lg"
                      >
                        Facturer médicaments
                      </Button>
                    )}
                  {ord.facture_statut === "PAYEE" && (
                    <span className="text-[10px] text-emerald-600 font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30">
                      ✓ Facture payée
                    </span>
                  )}
                  {ord.facture_statut === "IMPAYEE" && (
                    <span className="text-[10px] text-amber-600 font-semibold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30">
                      ⏳ Facture impayée
                    </span>
                  )}
                </div>
              </div>

              {ord.lignes && ord.lignes.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  {ord.lignes.map((l: any, idx: number) => (
                    <div
                      key={l.id || idx}
                      className="rounded-lg bg-background p-2.5 border border-border/60 flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground text-xs">
                          {idx + 1}. {l.medicament} {l.dosage ? `(${l.dosage})` : ""}
                        </span>
                        {l.forme && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {l.forme}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                        {l.dose_par_prise && (
                          <span>
                            Prise : <strong>{l.dose_par_prise}</strong>
                          </span>
                        )}
                        {l.frequence && (
                          <span>
                            Fréquence : <strong>{l.frequence}</strong>
                          </span>
                        )}
                        {l.duree && (
                          <span>
                            Durée : <strong>{l.duree}</strong>
                          </span>
                        )}
                        {l.voie_administration && (
                          <span>Voie : {l.voie_administration}</span>
                        )}
                      </div>
                      {l.instructions && (
                        <div className="text-[11px] italic text-muted-foreground/90 border-t border-border/30 pt-1 mt-0.5">
                          ℹ️ {l.instructions}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="bg-background/80 p-2.5 rounded-lg border border-border/50 font-mono text-foreground whitespace-pre-wrap">
                    {ord.medicaments || "Aucun médicament spécifié"}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                    {ord.posologie && (
                      <span>
                        <strong>Posologie :</strong> {ord.posologie}
                      </span>
                    )}
                    {ord.duree && (
                      <span>
                        <strong>Durée :</strong> {ord.duree}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

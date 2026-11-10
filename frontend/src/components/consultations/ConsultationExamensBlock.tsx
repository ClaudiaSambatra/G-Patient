import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, Printer, FlaskConical } from "lucide-react"

interface ConsultationExamensBlockProps {
  currentExamens: any[]
  onPrintExam: (exam: any) => void
}

export function ConsultationExamensBlock({
  currentExamens,
  onPrintExam,
}: ConsultationExamensBlockProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/15 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <FlaskConical className="size-4 text-sky-600 dark:text-sky-400" />
          Demandes d&apos;examens médicaux ({currentExamens.length})
        </h4>

        {currentExamens.length === 0 ? (
          <Link
            href="/examens"
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/40 px-3 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-100 transition-colors shadow-xs"
          >
            <FlaskConical className="size-3.5" /> Gérer dans Examens →
          </Link>
        ) : (
          <Link
            href="/examens"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
          >
            <FlaskConical className="size-3.5" /> Ouvrir dans Examens →
          </Link>
        )}
      </div>

      {currentExamens.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-sky-200 dark:border-sky-900/60 bg-sky-50/10 text-center gap-2">
          <FlaskConical className="size-8 text-sky-400/40" />
          <p className="text-xs text-muted-foreground">
            Aucune demande d&apos;examens n&apos;a été prescrite lors de cette
            consultation.
          </p>
          <Link
            href="/examens"
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 transition-all shadow-xs"
          >
            <Plus className="size-3.5" /> Gérer dans Examens
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {currentExamens.map((exam: any) => (
            <div
              key={exam.id}
              className="rounded-xl border border-sky-200/70 dark:border-sky-900/60 bg-sky-50/20 dark:bg-sky-950/10 p-3.5 text-xs space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                    {exam.numero || `Demande n°${exam.id}`}
                  </span>
                  {exam.statut === "ACTIVE" && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Active
                    </span>
                  )}
                  {exam.statut === "MODIFIEE" && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      Modifiée
                    </span>
                  )}
                  {exam.statut === "ANNULEE" && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                      Annulée
                    </span>
                  )}
                  <span className="text-muted-foreground font-normal text-[11px]">
                    Émise le {new Date(exam.date_creation).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onPrintExam(exam)}
                    className="h-7 text-xs px-2.5 gap-1 rounded-lg border-sky-300 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300"
                  >
                    <Printer className="size-3" /> Imprimer
                  </Button>
                </div>
              </div>

              {exam.renseignements_cliniques && (
                <div className="text-[11px] text-muted-foreground bg-background/60 p-2 rounded-lg border border-border/40">
                  <strong className="text-foreground">Renseignements :</strong>{" "}
                  {exam.renseignements_cliniques}
                </div>
              )}

              <div className="space-y-1.5">
                {(exam.lignes || []).map((l: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded-md bg-background/80 border border-border/40"
                  >
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <span>
                        {l.categorie === "BIOLOGIE"
                          ? "🔬"
                          : l.categorie === "IMAGERIE"
                          ? "🩻"
                          : "📋"}
                      </span>
                      {l.nom_examen}
                    </span>
                    {l.instructions && (
                      <span className="text-[11px] text-muted-foreground italic">
                        {l.instructions}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="text-[10px] text-muted-foreground italic">
                Examens réalisés auprès d&apos;un prestataire externe agréé.
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

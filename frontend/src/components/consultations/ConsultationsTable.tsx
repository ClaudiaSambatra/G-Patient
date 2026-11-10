import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  FileText,
  RefreshCw,
  Calendar,
  Clock,
  Stethoscope,
  Activity,
  CheckCircle2,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Consultation, getInitials } from "./types"

interface ConsultationsTableProps {
  consultations: Consultation[]
  isLoading: boolean
  totalCount: number
  page: number
  totalPages: number
  hasActiveFilters: boolean
  onPageChange: (newPage: number) => void
  onResetFilters: () => void
  onSelectConsultation: (consultation: Consultation) => void
}

export function ConsultationsTable({
  consultations,
  isLoading,
  totalCount,
  page,
  totalPages,
  hasActiveFilters,
  onPageChange,
  onResetFilters,
  onSelectConsultation,
}: ConsultationsTableProps) {
  return (
    <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-border/60 bg-muted/20 py-3.5 px-6 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <CardTitle className="text-base font-semibold">
            Registre des consultations
          </CardTitle>
        </div>
        <span className="text-xs text-muted-foreground">
          Page {page} sur {totalPages} ({totalCount} résultat
          {totalCount > 1 ? "s" : ""})
        </span>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <RefreshCw className="mx-auto size-6 animate-spin mb-3 text-primary" />
            <p className="font-medium text-foreground">
              Chargement des dossiers médicaux…
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Veuillez patienter quelques instants
            </p>
          </div>
        ) : consultations.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground/60 mb-3">
              <FileText className="size-7" />
            </div>
            <p className="font-semibold text-foreground text-base">
              Aucune consultation trouvée
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Aucun dossier médical ne correspond à vos critères de recherche.
              Essayez de réinitialiser les filtres.
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResetFilters}
                className="mt-4 rounded-xl text-xs"
              >
                Effacer les filtres
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-6">Date & Heure</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Médecin</th>
                  <th className="py-3 px-4">Motif &amp; Diagnostic</th>
                  <th className="py-3 px-4">Indicateurs</th>
                  <th className="py-3 px-4">Paiement</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {consultations.map((c) => {
                  const hasVitals = Boolean(
                    c.constantes &&
                      (c.constantes.temperature ||
                        c.constantes.tension_arterielle ||
                        c.constantes.frequence_cardiaque ||
                        c.constantes.poids ||
                        c.constantes.taille)
                  )
                  const hasControl = Boolean(c.date_controle_recommandee)
                  const initials = getInitials(c.patient_nom, c.patient_prenom)

                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelectConsultation(c)}
                      className="transition-colors hover:bg-muted/40 cursor-pointer group"
                    >
                      {/* Date & Heure */}
                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Calendar className="size-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-foreground block">
                              {new Date(c.date_consultation).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Clock className="size-3" />
                              {new Date(c.date_consultation).toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Patient */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs ring-2 ring-primary/20">
                            {initials}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground group-hover:text-primary transition-colors block">
                              {c.patient_nom} {c.patient_prenom}
                            </span>
                            <span className="text-[11px] text-muted-foreground block">
                              {c.patient_contact
                                ? c.patient_contact
                                : "Sans contact renseigné"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Médecin */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground border border-border/50">
                          <Stethoscope className="size-3.5 text-primary" />
                          <span>{c.medecin_nom}</span>
                        </div>
                      </td>

                      {/* Motif & Diagnostic */}
                      <td className="py-3.5 px-4 max-w-[240px]">
                        <div
                          className="truncate font-medium text-foreground text-xs"
                          title={c.motif}
                        >
                          {c.motif || "Motif non précisé"}
                        </div>
                        <div
                          className="truncate text-[11px] text-muted-foreground mt-0.5"
                          title={c.diagnostic}
                        >
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            Diag :{" "}
                          </span>
                          {c.diagnostic || "En attente"}
                        </div>
                      </td>

                      {/* Indicateurs */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          {hasVitals ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                              <Activity className="size-3" /> Constantes
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/60 italic">
                              Sans constantes
                            </span>
                          )}

                          {hasControl && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800">
                              <Calendar className="size-3" /> Suivi prévu
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Statut Paiement */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {c.statut_paiement === "PAYE" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <CheckCircle2 className="size-3" /> Payé
                          </span>
                        )}
                        {c.statut_paiement === "IMPAYE" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-400">
                            <AlertCircle className="size-3" /> Impayé
                          </span>
                        )}
                        {(!c.statut_paiement ||
                          c.statut_paiement === "GRATUIT") && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300">
                            Gratuit
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td
                        className="py-3.5 px-6 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSelectConsultation(c)}
                          className="rounded-xl h-8 px-3 gap-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground border-primary/30 transition-all shadow-2xs"
                        >
                          <Eye className="size-3.5" /> Consulter
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/60 px-6 py-4 bg-muted/10 text-xs text-muted-foreground">
            <div>
              Page <strong className="text-foreground">{page}</strong> sur{" "}
              <strong className="text-foreground">{totalPages}</strong> (
              {totalCount} consultation{totalCount > 1 ? "s" : ""})
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => onPageChange(Math.max(1, page - 1))}
                className="h-8 gap-1.5 rounded-xl text-xs"
              >
                <ChevronLeft className="size-3.5" /> Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                className="h-8 gap-1.5 rounded-xl text-xs"
              >
                Suivant <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

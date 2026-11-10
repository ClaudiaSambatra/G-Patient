import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CurrentUser } from "@/components/sidebar"
import {
  Flask,
  Microscope,
  ArrowClockwise,
  X,
} from "@phosphor-icons/react"
import { DemandeExamen } from "./types"
import { ExamenTableRow } from "./ExamenTableRow"

interface ExamensTableProps {
  demandesList: DemandeExamen[]
  isLoading: boolean
  filterCategorie: string
  hasActiveFilters: boolean
  expandedExamId: number | null
  setExpandedExamId: (id: number | null) => void
  currentUser?: CurrentUser
  onResetFilters: () => void
  onPreview: (demande: DemandeExamen) => void
  onPrint: (demande: DemandeExamen) => void
  onOpenHistory: (demande: DemandeExamen) => void
  onOpenEdit: (demande: DemandeExamen) => void
  onOpenCancel: (demande: DemandeExamen) => void
}

export function ExamensTable({
  demandesList,
  isLoading,
  filterCategorie,
  hasActiveFilters,
  expandedExamId,
  setExpandedExamId,
  currentUser,
  onResetFilters,
  onPreview,
  onPrint,
  onOpenHistory,
  onOpenEdit,
  onOpenCancel,
}: ExamensTableProps) {
  return (
    <Card className="rounded-xl border-border/80 shadow-xs overflow-hidden">
      <CardHeader className="p-3 sm:px-4 sm:py-3 border-b border-border/60 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
            {filterCategorie === "BIOLOGIE" ? (
              <Microscope
                size={18}
                weight="duotone"
                className="text-cyan-600 dark:text-cyan-400"
              />
            ) : (
              <Flask size={18} weight="duotone" className="text-primary" />
            )}
            <span>
              {filterCategorie === "BIOLOGIE"
                ? "Analyses de laboratoire prescrites"
                : filterCategorie === "IMAGERIE"
                ? "Examens radiologiques prescrits"
                : filterCategorie === "AUTRE"
                ? "Autres explorations médicales"
                : "Registre des demandes d'examens"}
            </span>
            <Badge variant="secondary" className="text-xs font-semibold">
              {demandesList.length}
            </Badge>
          </CardTitle>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Cliquez sur une ligne pour afficher les détails et instructions
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-16 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-3">
            <ArrowClockwise
              size={28}
              weight="duotone"
              className="animate-spin text-primary"
            />
            <span>Chargement des demandes d&apos;examens...</span>
          </div>
        ) : demandesList.length === 0 ? (
          <div className="py-16 px-4 text-center text-muted-foreground text-sm flex flex-col items-center justify-center">
            <div className="size-14 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-3">
              {filterCategorie === "BIOLOGIE" ? (
                <Microscope size={32} weight="duotone" />
              ) : (
                <Flask size={32} weight="duotone" />
              )}
            </div>
            <p className="font-semibold text-foreground text-base">
              {filterCategorie === "BIOLOGIE"
                ? "Aucune analyse de laboratoire trouvée"
                : "Aucune demande d'examens trouvée"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {hasActiveFilters
                ? "Aucun résultat ne correspond à vos filtres de recherche. Essayez d'élargir vos critères."
                : "Aucune prescription d'examen n'a encore été enregistrée."}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResetFilters}
                className="mt-4 rounded-xl text-xs gap-1.5"
              >
                <X size={14} weight="bold" />
                Effacer les filtres
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Numéro</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Médecin prescripteur</th>
                  <th className="py-3 px-4">
                    {filterCategorie === "BIOLOGIE"
                      ? "Analyses prescrites"
                      : "Examens prescrits"}
                  </th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {demandesList.map((demande) => (
                  <ExamenTableRow
                    key={demande.id}
                    demande={demande}
                    isExpanded={expandedExamId === demande.id}
                    onToggleExpand={() =>
                      setExpandedExamId(
                        expandedExamId === demande.id ? null : demande.id
                      )
                    }
                    filterCategorie={filterCategorie}
                    currentUser={currentUser}
                    onPreview={onPreview}
                    onPrint={onPrint}
                    onOpenHistory={onOpenHistory}
                    onOpenEdit={onOpenEdit}
                    onOpenCancel={onOpenCancel}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

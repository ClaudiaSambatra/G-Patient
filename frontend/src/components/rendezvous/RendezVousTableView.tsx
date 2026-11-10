"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Calendar as CalendarIcon, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { CurrentUser } from "@/components/sidebar"
import { RendezVous, RendezVousListResponse } from "./types"
import { RendezVousTableRow } from "./RendezVousTableRow"

interface RendezVousTableViewProps {
  rdvData?: RendezVousListResponse
  isLoading: boolean
  currentPage: number
  setCurrentPage: (updater: (p: number) => number) => void
  totalCount: number
  totalPages: number
  currentUser?: CurrentUser
  todayStr: string
  onOpenConsultationOrigine: (consultationId: number) => void
  onUpdateStatus: (id: number, statut: string) => void
  onEncaisserRow: (rdv: RendezVous) => void
  onOpenConsultation: (rdv: RendezVous) => void
  onOpenEdit: (rdv: RendezVous) => void
  onCancelRdv: (id: number) => void
  onDeleteRdv: (id: number) => void
}

export function RendezVousTableView({
  rdvData,
  isLoading,
  currentPage,
  setCurrentPage,
  totalCount,
  totalPages,
  currentUser,
  todayStr,
  onOpenConsultationOrigine,
  onUpdateStatus,
  onEncaisserRow,
  onOpenConsultation,
  onOpenEdit,
  onCancelRdv,
  onDeleteRdv,
}: RendezVousTableViewProps) {
  return (
    <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-border/60 bg-muted/20 py-3.5 px-6 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">Rendez-vous programmés</CardTitle>
        <span className="text-xs text-muted-foreground">
          Page {currentPage} sur {totalPages} ({totalCount} résultat{totalCount > 1 ? "s" : ""})
        </span>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <RefreshCw className="mx-auto size-5 animate-spin mb-2 text-primary" />
            Chargement de l&apos;agenda…
          </div>
        ) : !rdvData || rdvData.results.length === 0 ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            <CalendarIcon className="mx-auto size-10 mb-2 opacity-30" />
            <p className="font-medium text-foreground">Aucun rendez-vous trouvé</p>
            <p className="text-xs mt-1">Modifiez vos filtres ou planifiez un nouveau créneau.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-6">Date &amp; Heure</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Médecin</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4">Paiement</th>
                  <th className="py-3 px-4">Motif</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {rdvData.results.map((rdv) => (
                  <RendezVousTableRow
                    key={rdv.id}
                    rdv={rdv}
                    currentUser={currentUser}
                    todayStr={todayStr}
                    onOpenConsultationOrigine={onOpenConsultationOrigine}
                    onUpdateStatus={onUpdateStatus}
                    onEncaisserRow={onEncaisserRow}
                    onOpenConsultation={onOpenConsultation}
                    onOpenEdit={onOpenEdit}
                    onCancelRdv={onCancelRdv}
                    onDeleteRdv={onDeleteRdv}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/60 px-6 py-3 bg-muted/10">
            <span className="text-xs text-muted-foreground">
              Affichage page {currentPage} sur {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium shadow-xs disabled:opacity-40 hover:bg-muted"
              >
                <ChevronLeft className="size-3.5" />
                Précédent
              </button>
              <span className="text-xs font-semibold px-2">{currentPage}</span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium shadow-xs disabled:opacity-40 hover:bg-muted"
              >
                Suivant
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

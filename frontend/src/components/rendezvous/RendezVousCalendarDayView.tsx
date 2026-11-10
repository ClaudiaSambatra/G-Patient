"use client"

import { AlertTriangle } from "lucide-react"
import { CurrentUser } from "@/components/sidebar"
import { Medecin, RendezVous, TIME_SLOTS_30MIN } from "./types"

interface RendezVousCalendarDayViewProps {
  calendarDate: Date
  todayStr: string
  medecinsData: Medecin[]
  currentUser?: CurrentUser
  rdvList: RendezVous[]
  onSlotClick: (dateStr: string, timeStr: string, medecinId?: number, isSlotBusy?: boolean) => void
  onOpenConsultation: (rdv: RendezVous) => void
}

export function RendezVousCalendarDayView({
  calendarDate,
  todayStr,
  medecinsData,
  currentUser,
  rdvList,
  onSlotClick,
  onOpenConsultation,
}: RendezVousCalendarDayViewProps) {
  const visibleDoctors = medecinsData.filter(
    (m) => currentUser?.role !== "MEDECIN" || m.id === currentUser.medecin_id
  )
  const dateSelectedStr = calendarDate.toISOString().slice(0, 10)

  return (
    <div className="min-w-[700px]">
      <div className="grid grid-cols-[80px_repeat(auto-fit,minmax(180px,1fr))] border-b border-border/60 pb-2">
        <div className="text-xs font-bold text-muted-foreground text-center">Créneau</div>
        {visibleDoctors.map((m) => (
          <div key={m.id} className="text-xs font-bold text-center px-2">
            <div>
              Dr. {m.nom} {m.prenom}
            </div>
            <div className="text-[10px] text-muted-foreground font-normal">{m.specialite}</div>
            {m.absent_aujourdhui && dateSelectedStr === todayStr && (
              <span className="inline-block mt-0.5 text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 px-1.5 rounded">
                Absent aujourd&apos;hui
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="divide-y divide-border/40">
        {TIME_SLOTS_30MIN.map((slot) => (
          <div
            key={slot}
            className="grid grid-cols-[80px_repeat(auto-fit,minmax(180px,1fr))] min-h-[52px] items-stretch"
          >
            <div className="py-2 text-xs font-semibold text-muted-foreground text-center border-r border-border/40 flex items-center justify-center">
              {slot}
            </div>
            {visibleDoctors.map((m) => {
              const rdvsForSlot = rdvList.filter((rdv) => {
                const dt = new Date(rdv.date_heure)
                const rdvDate = dt.toISOString().slice(0, 10)
                const hours = String(dt.getHours()).padStart(2, "0")
                const mins = String(dt.getMinutes()).padStart(2, "0")
                return rdv.medecin === m.id && rdvDate === dateSelectedStr && `${hours}:${mins}` === slot
              })

              const activeRdvs = rdvsForSlot.filter(
                (r) => r.statut === "PLANIFIE" || r.statut === "CONFIRME"
              )
              const hasConflict = activeRdvs.length > 1
              const isSlotBusy = activeRdvs.length >= 1

              return (
                <div
                  key={m.id}
                  onClick={() => onSlotClick(dateSelectedStr, slot, m.id, isSlotBusy)}
                  className={`p-1 border-r border-border/30 transition-colors ${
                    hasConflict
                      ? "bg-rose-100/70 border-rose-400 dark:bg-rose-950/40"
                      : isSlotBusy
                      ? "bg-muted/20"
                      : "hover:bg-muted/30 cursor-pointer"
                  }`}
                >
                  {hasConflict && (
                    <div className="mb-1 rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white flex items-center gap-1 shadow-xs animate-pulse">
                      <AlertTriangle className="size-3 shrink-0" />
                      Conflit : 2 RDV à la même heure impossible !
                    </div>
                  )}

                  {rdvsForSlot.map((rdv) => {
                    let bgBadge =
                      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                    if (rdv.statut === "CONFIRME")
                      bgBadge =
                        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                    if (rdv.statut === "ANNULE")
                      bgBadge =
                        "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                    if (rdv.statut === "TERMINE")
                      bgBadge =
                        "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300"

                    return (
                      <div
                        key={rdv.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (
                            (currentUser?.role === "MEDECIN" || currentUser?.role === "ADMIN") &&
                            (rdv.statut === "CONFIRME" || rdv.statut === "TERMINE")
                          ) {
                            onOpenConsultation(rdv)
                          }
                        }}
                        className={`rounded-md border p-1.5 text-xs shadow-2xs mb-1 cursor-pointer transition-transform hover:scale-[1.01] ${bgBadge}`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>
                            {new Date(rdv.date_heure).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="text-[9px] uppercase font-bold">{rdv.statut}</span>
                        </div>
                        <div className="font-semibold truncate">{rdv.patient_nom}</div>
                        {rdv.motif && <div className="text-[10px] truncate opacity-80">{rdv.motif}</div>}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

"use client"

import { AlertTriangle } from "lucide-react"
import { CurrentUser } from "@/components/sidebar"
import { RendezVous, TIME_SLOTS_30MIN } from "./types"

interface RendezVousCalendarWeekViewProps {
  calendarDate: Date
  todayStr: string
  currentUser?: CurrentUser
  rdvList: RendezVous[]
  onSlotClick: (dateStr: string, timeStr: string, medecinId?: number, isSlotBusy?: boolean) => void
  onOpenConsultation: (rdv: RendezVous) => void
}

export function RendezVousCalendarWeekView({
  calendarDate,
  todayStr,
  currentUser,
  rdvList,
  onSlotClick,
  onOpenConsultation,
}: RendezVousCalendarWeekViewProps) {
  const weekDays = [0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
    const curr = new Date(calendarDate)
    const first = curr.getDate() - (curr.getDay() === 0 ? 6 : curr.getDay() - 1)
    const d = new Date(curr.setDate(first + dayOffset))
    const isCurrentDay = d.toISOString().slice(0, 10) === todayStr
    return { dayOffset, date: d, dateStr: d.toISOString().slice(0, 10), isCurrentDay }
  })

  return (
    <div className="min-w-[800px]">
      <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-border/60 pb-2">
        <div className="text-xs font-bold text-muted-foreground text-center">Créneau</div>
        {weekDays.map(({ dayOffset, date, isCurrentDay }) => (
          <div
            key={dayOffset}
            className={`text-xs font-bold text-center px-1 ${
              isCurrentDay ? "text-primary" : "text-foreground"
            }`}
          >
            <div>{date.toLocaleDateString("fr-FR", { weekday: "short" })}</div>
            <div
              className={`text-[11px] font-semibold mt-0.5 inline-block px-1.5 rounded-full ${
                isCurrentDay ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {date.getDate()} {date.toLocaleDateString("fr-FR", { month: "short" })}
            </div>
          </div>
        ))}
      </div>

      <div className="divide-y divide-border/40">
        {TIME_SLOTS_30MIN.map((slot) => (
          <div
            key={slot}
            className="grid grid-cols-[80px_repeat(7,1fr)] min-h-[48px] items-stretch"
          >
            <div className="py-1 text-xs font-semibold text-muted-foreground text-center border-r border-border/40 flex items-center justify-center">
              {slot}
            </div>
            {weekDays.map(({ dayOffset, dateStr }) => {
              const rdvsForSlot = rdvList.filter((rdv) => {
                const dt = new Date(rdv.date_heure)
                const rdvDate = dt.toISOString().slice(0, 10)
                const hours = String(dt.getHours()).padStart(2, "0")
                const mins = String(dt.getMinutes()).padStart(2, "0")
                return rdvDate === dateStr && `${hours}:${mins}` === slot
              })

              const activeRdvs = rdvsForSlot.filter(
                (r) => r.statut === "PLANIFIE" || r.statut === "CONFIRME"
              )
              const hasConflict = activeRdvs.length > 1
              const isSlotBusy = activeRdvs.length >= 1

              return (
                <div
                  key={dayOffset}
                  onClick={() => onSlotClick(dateStr, slot, undefined, isSlotBusy)}
                  className={`p-1 border-r border-border/30 transition-colors ${
                    hasConflict
                      ? "bg-rose-100/70 border-rose-400 dark:bg-rose-950/40"
                      : isSlotBusy
                      ? "bg-muted/20"
                      : "hover:bg-muted/30 cursor-pointer"
                  }`}
                >
                  {hasConflict && (
                    <div className="mb-1 rounded bg-rose-600 px-1 py-0.5 text-[9px] font-bold text-white flex items-center gap-1 shadow-xs animate-pulse">
                      <AlertTriangle className="size-2.5 shrink-0" />
                      Conflit heure !
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
                        className={`rounded border p-1 text-[11px] shadow-2xs mb-1 cursor-pointer truncate ${bgBadge}`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>
                            {new Date(rdv.date_heure).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="font-semibold truncate">{rdv.patient_nom}</div>
                        <div className="text-[10px] truncate opacity-75">{rdv.medecin_nom}</div>
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

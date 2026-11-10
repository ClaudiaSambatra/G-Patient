"use client"

import { Card } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react"
import { CurrentUser } from "@/components/sidebar"
import { Medecin, RendezVous } from "./types"
import { RendezVousCalendarDayView } from "./RendezVousCalendarDayView"
import { RendezVousCalendarWeekView } from "./RendezVousCalendarWeekView"

interface RendezVousCalendarViewProps {
  calendarView: "day" | "week"
  setCalendarView: (v: "day" | "week") => void
  calendarDate: Date
  setCalendarDate: (d: Date | ((prev: Date) => Date)) => void
  todayStr: string
  medecinsData: Medecin[]
  currentUser?: CurrentUser
  rdvList: RendezVous[]
  onSlotClick: (dateStr: string, timeStr: string, medecinId?: number, isSlotBusy?: boolean) => void
  onOpenConsultation: (rdv: RendezVous) => void
}

export function RendezVousCalendarView({
  calendarView,
  setCalendarView,
  calendarDate,
  setCalendarDate,
  todayStr,
  medecinsData,
  currentUser,
  rdvList,
  onSlotClick,
  onOpenConsultation,
}: RendezVousCalendarViewProps) {
  function handlePrev() {
    const next = new Date(calendarDate)
    if (calendarView === "day") next.setDate(next.getDate() - 1)
    else next.setDate(next.getDate() - 7)
    setCalendarDate(next)
  }

  function handleNext() {
    const next = new Date(calendarDate)
    if (calendarView === "day") next.setDate(next.getDate() + 1)
    else next.setDate(next.getDate() + 7)
    setCalendarDate(next)
  }

  return (
    <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden p-6 bg-card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-border/60">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrev}
            className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setCalendarDate(new Date())}
            className="px-3 py-1 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted text-foreground"
          >
            Aujourd&apos;hui
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground"
          >
            <ChevronRight className="size-4" />
          </button>

          <h2 className="text-base font-bold text-foreground capitalize ml-2">
            {calendarDate.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setCalendarView("day")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                calendarView === "day"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              Vue Jour
            </button>
            <button
              type="button"
              onClick={() => setCalendarView("week")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                calendarView === "week"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              Vue Semaine
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 py-3 text-xs text-muted-foreground border-b border-border/40">
        <span className="font-medium">Créneau d&apos;affichage fixe 30 min :</span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-blue-500" /> Planifié
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-emerald-500" /> Confirmé
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-rose-500" /> Annulé
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-slate-400" /> Terminé
        </span>
        <span className="flex items-center gap-1.5 text-rose-600 font-bold">
          <AlertTriangle className="size-3.5" /> 2 RDV même heure = Impossible
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        {calendarView === "day" ? (
          <RendezVousCalendarDayView
            calendarDate={calendarDate}
            todayStr={todayStr}
            medecinsData={medecinsData}
            currentUser={currentUser}
            rdvList={rdvList}
            onSlotClick={onSlotClick}
            onOpenConsultation={onOpenConsultation}
          />
        ) : (
          <RendezVousCalendarWeekView
            calendarDate={calendarDate}
            todayStr={todayStr}
            currentUser={currentUser}
            rdvList={rdvList}
            onSlotClick={onSlotClick}
            onOpenConsultation={onOpenConsultation}
          />
        )}
      </div>
    </Card>
  )
}

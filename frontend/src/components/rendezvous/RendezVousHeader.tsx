"use client"

import { Calendar as CalendarIcon, Check, Ban, List, CalendarDays, Plus } from "lucide-react"
import { CurrentUser } from "@/components/sidebar"
import { Medecin } from "./types"

interface RendezVousHeaderProps {
  totalCount: number
  currentUser?: CurrentUser
  connectedMedecinProfile?: Medecin | null
  isUpdatingPresence: boolean
  onTogglePresence: (medecinId: number, absent: boolean) => void
  viewMode: "list" | "calendar"
  onSetViewMode: (mode: "list" | "calendar") => void
  onOpenCreate: () => void
}

export function RendezVousHeader({
  totalCount,
  currentUser,
  connectedMedecinProfile,
  isUpdatingPresence,
  onTogglePresence,
  viewMode,
  onSetViewMode,
  onOpenCreate,
}: RendezVousHeaderProps) {
  const canCreate = currentUser?.role === "ADMIN" || currentUser?.role === "SECRETAIRE"

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2.5">
          <CalendarIcon className="size-7 text-primary" />
          Agenda &amp; Rendez-vous
          <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-foreground">
            {totalCount}
          </span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gérez les rendez-vous des patients et le planning médical en temps réel
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {currentUser?.role === "MEDECIN" && connectedMedecinProfile && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 shadow-xs">
            <span className="text-xs font-medium text-muted-foreground">Ma présence aujourd&apos;hui :</span>
            <button
              type="button"
              onClick={() =>
                onTogglePresence(
                  connectedMedecinProfile.id,
                  !connectedMedecinProfile.absent_aujourdhui
                )
              }
              disabled={isUpdatingPresence}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all shadow-xs ${
                connectedMedecinProfile.absent_aujourdhui
                  ? "bg-rose-500 text-white hover:bg-rose-600"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              {connectedMedecinProfile.absent_aujourdhui ? (
                <>
                  <Ban className="size-3.5" />
                  Absent aujourd&apos;hui
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  Présent aujourd&apos;hui
                </>
              )}
            </button>
          </div>
        )}

        <div className="flex items-center rounded-xl border border-border bg-card p-1 shadow-xs">
          <button
            type="button"
            onClick={() => onSetViewMode("list")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "list"
                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="size-3.5" />
            Liste
          </button>
          <button
            type="button"
            onClick={() => onSetViewMode("calendar")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "calendar"
                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarDays className="size-3.5" />
            Calendrier
          </button>
        </div>

        {canCreate && (
          <button
            onClick={onOpenCreate}
            className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus className="size-4" />
            <span>Nouveau RDV</span>
          </button>
        )}
      </div>
    </div>
  )
}

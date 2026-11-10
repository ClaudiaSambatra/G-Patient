"use client"

import { Search } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CurrentUser } from "@/components/sidebar"
import { Medecin } from "./types"

interface RendezVousFiltersProps {
  currentUser?: CurrentUser
  medecinsData: Medecin[]
  viewMode: "list" | "calendar"
  search: string
  setSearch: (v: string) => void
  statutFilter: string
  setStatutFilter: (v: string) => void
  medecinFilter: string
  setMedecinFilter: (v: string) => void
  dateFilterMode: "none" | "single" | "range"
  setDateFilterMode: (v: "none" | "single" | "range") => void
  singleDate: string
  setSingleDate: (v: string) => void
  startDate: string
  setStartDate: (v: string) => void
  endDate: string
  setEndDate: (v: string) => void
  onResetPage: () => void
}

export function RendezVousFilters({
  currentUser,
  medecinsData,
  viewMode,
  search,
  setSearch,
  statutFilter,
  setStatutFilter,
  medecinFilter,
  setMedecinFilter,
  dateFilterMode,
  setDateFilterMode,
  singleDate,
  setSingleDate,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onResetPage,
}: RendezVousFiltersProps) {
  return (
    <Card className="border-border/80 shadow-xs rounded-2xl p-4 bg-card/60 backdrop-blur-xs">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par patient, motif..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              onResetPage()
            }}
            className="h-9 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground shrink-0">Statut :</span>
          <select
            value={statutFilter}
            onChange={(e) => {
              setStatutFilter(e.target.value)
              onResetPage()
            }}
            className="h-9 rounded-xl border border-border bg-background px-2.5 text-xs font-medium shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="PLANIFIE">Planifié</option>
            <option value="CONFIRME">Confirmé</option>
            <option value="ANNULE">Annulé</option>
            <option value="TERMINE">Terminé</option>
          </select>
        </div>

        {currentUser?.role !== "MEDECIN" && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground shrink-0">Médecin :</span>
            <select
              value={medecinFilter}
              onChange={(e) => {
                setMedecinFilter(e.target.value)
                onResetPage()
              }}
              className="h-9 rounded-xl border border-border bg-background px-2.5 text-xs font-medium shadow-xs focus:outline-none focus:ring-1 focus:ring-primary max-w-[200px]"
            >
              <option value="ALL">Tous les médecins</option>
              {medecinsData.map((m) => (
                <option key={m.id} value={m.id.toString()}>
                  Dr. {m.nom} {m.prenom} {m.absent_aujourdhui ? " - Absent" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {viewMode === "list" && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={dateFilterMode}
              onChange={(e) => {
                setDateFilterMode(e.target.value as "none" | "single" | "range")
                onResetPage()
              }}
              className="h-9 rounded-xl border border-border bg-background px-2 text-xs font-medium shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="none">Toutes dates</option>
              <option value="single">Date précise</option>
              <option value="range">Intervalle</option>
            </select>

            {dateFilterMode === "single" && (
              <Input
                type="date"
                value={singleDate}
                onChange={(e) => {
                  setSingleDate(e.target.value)
                  onResetPage()
                }}
                className="h-9 text-xs w-[140px]"
              />
            )}

            {dateFilterMode === "range" && (
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  value={startDate}
                  placeholder="Début"
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    onResetPage()
                  }}
                  className="h-9 text-xs w-[130px]"
                />
                <span className="text-xs text-muted-foreground">à</span>
                <Input
                  type="date"
                  value={endDate}
                  placeholder="Fin"
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    onResetPage()
                  }}
                  className="h-9 text-xs w-[130px]"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

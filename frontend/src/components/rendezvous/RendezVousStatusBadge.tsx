"use client"

import { CurrentUser } from "@/components/sidebar"
import { RendezVous } from "./types"

interface RendezVousStatusBadgeProps {
  rdv: RendezVous
  currentUser?: CurrentUser
  onUpdateStatus: (id: number, statut: string) => void
}

export function RendezVousStatusBadge({
  rdv,
  currentUser,
  onUpdateStatus,
}: RendezVousStatusBadgeProps) {
  const canChangeStatus =
    (currentUser?.role === "ADMIN" || currentUser?.role === "SECRETAIRE") &&
    (rdv.statut === "PLANIFIE" || rdv.statut === "CONFIRME" || rdv.statut === "ANNULE" || rdv.statut === "NON_VENU")
  // « Non venu » n'a de sens qu'une fois l'heure du rendez-vous passée (règle aussi vérifiée par l'API)
  const heurePassee = new Date(rdv.date_heure) <= new Date()

  if (canChangeStatus) {
    return (
      <select
        value={rdv.statut}
        onChange={(e) => {
          const nextStatus = e.target.value
          if (nextStatus === rdv.statut) return
          const confirmation =
            nextStatus === "ANNULE"
              ? "Êtes-vous sûr de vouloir annuler ce rendez-vous ?"
              : nextStatus === "NON_VENU"
                ? "Marquer le patient comme non venu ? Sa facture impayée sera annulée."
                : null
          if (confirmation) {
            if (!window.confirm(confirmation)) {
              e.target.value = rdv.statut
              return
            }
          }
          onUpdateStatus(rdv.id, nextStatus)
        }}
        className="text-xs font-semibold rounded-lg border border-border bg-background px-2.5 py-1 shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {rdv.statut === "PLANIFIE" && (
          <>
            <option value="PLANIFIE">Planifié</option>
            <option value="CONFIRME">Confirmé</option>
            <option value="ANNULE">Annuler le RDV</option>
            {heurePassee && <option value="NON_VENU">Patient non venu</option>}
          </>
        )}
        {rdv.statut === "CONFIRME" && (
          <>
            <option value="CONFIRME">Confirmé</option>
            <option value="ANNULE">Annuler le RDV</option>
            {heurePassee && <option value="NON_VENU">Patient non venu</option>}
          </>
        )}
        {rdv.statut === "NON_VENU" && (
          <>
            <option value="NON_VENU">Non venu</option>
            <option value="CONFIRME">Corriger : Confirmé</option>
          </>
        )}
        {rdv.statut === "ANNULE" && (
          <>
            <option value="ANNULE">Annulé</option>
            <option value="PLANIFIE">Rétablir en Planifié</option>
          </>
        )}
      </select>
    )
  }

  switch (rdv.statut) {
    case "PLANIFIE":
      return (
        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400">
          Planifié
        </span>
      )
    case "CONFIRME":
      return (
        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-400">
          Confirmé
        </span>
      )
    case "ANNULE":
      return (
        <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-900/30 dark:text-rose-400">
          Annulé
        </span>
      )
    case "NON_VENU":
      return (
        <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300">
          Non venu
        </span>
      )
    case "TERMINE":
      return (
        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-500/20 dark:bg-slate-800 dark:text-slate-400">
          Terminé
        </span>
      )
    default:
      return <span>{rdv.statut}</span>
  }
}

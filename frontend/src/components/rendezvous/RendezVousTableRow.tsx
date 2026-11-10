"use client"

import {
  Clock,
  User,
  Stethoscope,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Eye,
  Edit,
  Ban,
  RotateCcw,
  Trash2,
} from "lucide-react"
import { CurrentUser } from "@/components/sidebar"
import { RendezVous } from "./types"
import { RendezVousStatusBadge } from "./RendezVousStatusBadge"

interface RendezVousTableRowProps {
  rdv: RendezVous
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

export function RendezVousTableRow({
  rdv,
  currentUser,
  todayStr,
  onOpenConsultationOrigine,
  onUpdateStatus,
  onEncaisserRow,
  onOpenConsultation,
  onOpenEdit,
  onCancelRdv,
  onDeleteRdv,
}: RendezVousTableRowProps) {
  const rdvDateStr = new Date(rdv.date_heure).toISOString().slice(0, 10)
  const isToday = rdvDateStr === todayStr
  const isDoctorAbsentToday = isToday && Boolean(rdv.medecin_absent_aujourdhui)

  const isStaff = currentUser?.role === "ADMIN" || currentUser?.role === "SECRETAIRE"
  const isMedOrAdmin = currentUser?.role === "MEDECIN" || currentUser?.role === "ADMIN"

  return (
    <tr className="transition-colors hover:bg-muted/30">
      <td className="py-3 px-6 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-primary" />
          <span className="font-medium text-foreground">
            {new Date(rdv.date_heure).toLocaleString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </td>

      <td className="py-3 px-4">
        <div className="font-semibold text-foreground flex items-center gap-1.5">
          <User className="size-3.5 text-muted-foreground" />
          {rdv.patient_nom}
        </div>
        <div className="text-[11px] text-muted-foreground ml-5">
          {rdv.patient_contact || "Aucun contact"}
        </div>
      </td>

      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <Stethoscope className="size-3.5 text-emerald-600" />
          <span>{rdv.medecin_nom}</span>
        </div>
        {isDoctorAbsentToday && (
          <span className="inline-flex items-center gap-1 mt-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-400">
            <AlertTriangle className="size-3" />
            Médecin absent
          </span>
        )}
      </td>

      <td className="py-3 px-4">
        {rdv.type === "CONTROLE" ? (
          <div className="flex flex-col items-start gap-1">
            <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-700 ring-1 ring-inset ring-purple-600/20 dark:bg-purple-950/40 dark:text-purple-300">
              Suivi
            </span>
            {rdv.consultation_origine && (
              <button
                type="button"
                onClick={() => onOpenConsultationOrigine(rdv.consultation_origine!)}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                title="Consulter les détails et ordonnances de la visite d'origine"
              >
                <FileText className="size-3" />
                Origine #{rdv.consultation_origine}
              </button>
            )}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20 dark:bg-sky-950/40 dark:text-sky-300">
            Consultation
          </span>
        )}
      </td>

      <td className="py-3 px-4">
        <RendezVousStatusBadge
          rdv={rdv}
          currentUser={currentUser}
          onUpdateStatus={onUpdateStatus}
        />
      </td>

      <td className="py-3 px-4">
        <div className="flex flex-col items-start gap-1">
          {rdv.statut_paiement === "PAYE" && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="size-3" /> Payé
            </span>
          )}
          {rdv.statut_paiement === "IMPAYE" && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-400">
                Impayé
              </span>
              {isStaff && rdv.statut !== "ANNULE" && (
                <button
                  type="button"
                  onClick={() => onEncaisserRow(rdv)}
                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded px-1.5 py-0.5 dark:bg-emerald-950/60 dark:text-emerald-300 transition-colors"
                >
                  Encaisser
                </button>
              )}
            </div>
          )}
          {rdv.statut_paiement === "GRATUIT" && (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300">
              Gratuit
            </span>
          )}
        </div>
      </td>

      <td className="py-3 px-4 text-muted-foreground truncate max-w-[200px]" title={rdv.motif}>
        {rdv.type === "CONTROLE" ? (
          rdv.motif || <span className="italic opacity-50">Suivi</span>
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </td>

      <td className="py-3 px-6 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {isMedOrAdmin && (rdv.statut === "CONFIRME" || rdv.statut === "TERMINE") && (
            <button
              onClick={() => onOpenConsultation(rdv)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 dark:bg-primary/20 dark:text-primary-foreground"
            >
              {rdv.statut === "TERMINE" ? <Eye className="size-3.5" /> : <FileText className="size-3.5" />}
              {rdv.statut === "TERMINE" ? "Voir Consultation" : "Consulter"}
            </button>
          )}

          {isStaff && (rdv.statut === "PLANIFIE" || rdv.statut === "CONFIRME") && (
            <>
              <button
                onClick={() => onOpenEdit(rdv)}
                title="Modifier le rendez-vous"
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Edit className="size-3.5" />
                Éditer
              </button>
              <button
                onClick={() => {
                  if (window.confirm("Êtes-vous sûr de vouloir annuler ce rendez-vous ? Le créneau horaire sera libéré.")) {
                    onCancelRdv(rdv.id)
                  }
                }}
                title="Annuler le rendez-vous"
                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400"
              >
                <Ban className="size-3.5" />
                Annuler
              </button>
            </>
          )}

          {isStaff && rdv.statut === "ANNULE" && (
            <button
              onClick={() => onUpdateStatus(rdv.id, "PLANIFIE")}
              title="Rétablir le rendez-vous au statut Planifié"
              className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 dark:bg-primary/20 dark:text-primary-foreground"
            >
              <RotateCcw className="size-3.5" />
              Rétablir
            </button>
          )}

          {currentUser?.role === "ADMIN" && rdv.statut !== "TERMINE" && !rdv.consultation_id && (
            <button
              onClick={() => {
                if (window.confirm("Voulez-vous vraiment supprimer définitivement ce rendez-vous ?")) {
                  onDeleteRdv(rdv.id)
                }
              }}
              title="Supprimer définitivement"
              className="inline-flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

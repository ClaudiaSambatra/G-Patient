import { Fragment } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CurrentUser } from "@/components/sidebar"
import {
  CheckCircle,
  PencilSimple,
  Printer,
  Eye,
  CalendarDots,
  Stethoscope,
  Prohibit,
  CaretDown,
  CaretUp,
  ClockCounterClockwise,
} from "@phosphor-icons/react"
import { DemandeExamen, getAge } from "./types"
import { ExamenAccordionDetail } from "./ExamenAccordionDetail"

interface ExamenTableRowProps {
  demande: DemandeExamen
  isExpanded: boolean
  onToggleExpand: () => void
  filterCategorie: string
  currentUser?: CurrentUser
  onPreview: (demande: DemandeExamen) => void
  onPrint: (demande: DemandeExamen) => void
  onOpenHistory: (demande: DemandeExamen) => void
  onOpenEdit: (demande: DemandeExamen) => void
  onOpenCancel: (demande: DemandeExamen) => void
}

export function ExamenTableRow({
  demande,
  isExpanded,
  onToggleExpand,
  filterCategorie,
  currentUser,
  onPreview,
  onPrint,
  onOpenHistory,
  onOpenEdit,
  onOpenCancel,
}: ExamenTableRowProps) {
  const isDoctor = currentUser?.role === "MEDECIN"
  const isAdmin = currentUser?.role === "ADMIN"
  const canEditOrCancel =
    (isAdmin || (isDoctor && currentUser?.id === demande.medecin_id)) &&
    demande.statut !== "ANNULEE"

  const displayLignes = (
    filterCategorie === "BIOLOGIE"
      ? demande.lignes?.filter((l) => l.categorie === "BIOLOGIE")
      : filterCategorie === "IMAGERIE"
      ? demande.lignes?.filter((l) => l.categorie === "IMAGERIE")
      : demande.lignes
  ) || []

  return (
    <Fragment>
      <tr
        onClick={onToggleExpand}
        className={`hover:bg-muted/30 transition-colors cursor-pointer select-none ${
          isExpanded ? "bg-muted/20" : ""
        }`}
      >
        <td className="py-3.5 px-3 text-center text-muted-foreground">
          <div className="size-6 rounded-lg bg-muted/60 flex items-center justify-center hover:bg-muted text-muted-foreground">
            {isExpanded ? (
              <CaretUp size={14} weight="bold" />
            ) : (
              <CaretDown size={14} weight="bold" />
            )}
          </div>
        </td>

        <td className="py-3.5 px-4 font-mono font-bold text-xs text-primary">
          <span className="hover:underline flex items-center gap-1.5">
            {demande.numero || `#${demande.id}`}
          </span>
        </td>

        <td className="py-3.5 px-4">
          {demande.statut === "ACTIVE" && (
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 font-semibold gap-1 text-[11px] hover:bg-emerald-500/20">
              <CheckCircle
                size={13}
                weight="duotone"
                className="text-emerald-600"
              />
              Active
            </Badge>
          )}
          {demande.statut === "MODIFIEE" && (
            <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 font-semibold gap-1 text-[11px] hover:bg-amber-500/20">
              <ClockCounterClockwise
                size={13}
                weight="duotone"
                className="text-amber-600"
              />
              Modifiée
            </Badge>
          )}
          {demande.statut === "ANNULEE" && (
            <Badge className="bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20 font-semibold gap-1 text-[11px] hover:bg-red-500/20">
              <Prohibit size={13} weight="duotone" className="text-red-600" />
              Annulée
            </Badge>
          )}
        </td>

        <td className="py-3.5 px-4">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 flex items-center justify-center font-bold text-xs shrink-0">
              {demande.patient_nom?.[0]?.toUpperCase() || "P"}
            </div>
            <div>
              <div className="font-semibold text-foreground">
                {demande.patient_nom} {demande.patient_prenom}
              </div>
              <div className="text-xs text-muted-foreground">
                {getAge(demande.patient_date_naissance) && (
                  <span>{getAge(demande.patient_date_naissance)}</span>
                )}
                {demande.patient_date_naissance &&
                  demande.patient_contact &&
                  " • "}
                {demande.patient_contact && (
                  <span>{demande.patient_contact}</span>
                )}
              </div>
            </div>
          </div>
        </td>

        <td className="py-3.5 px-4">
          <div className="font-medium text-foreground flex items-center gap-1.5">
            <Stethoscope size={15} weight="duotone" className="text-primary" />
            {demande.medecin_nom || "Praticien"}
          </div>
          {demande.medecin_specialite && (
            <div className="text-xs text-muted-foreground pl-5">
              {demande.medecin_specialite}
            </div>
          )}
        </td>

        <td className="py-3.5 px-4 max-w-xs">
          {displayLignes.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {displayLignes.slice(0, 3).map((l, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    l.categorie === "BIOLOGIE"
                      ? "bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border border-cyan-500/25"
                      : l.categorie === "IMAGERIE"
                      ? "bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-500/25"
                      : "bg-slate-500/10 text-slate-800 dark:text-slate-300 border border-slate-500/25"
                  }`}
                >
                  <span>
                    {l.categorie === "BIOLOGIE"
                      ? "🔬"
                      : l.categorie === "IMAGERIE"
                      ? "🩻"
                      : "📋"}
                  </span>
                  <span>{l.nom_examen}</span>
                </span>
              ))}
              {displayLignes.length > 3 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0.5 font-normal"
                >
                  +{displayLignes.length - 3} autre(s)
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground italic">
              Aucun examen
            </span>
          )}
        </td>

        <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <CalendarDots
              size={14}
              weight="duotone"
              className="text-muted-foreground"
            />
            {new Date(demande.date_creation).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </div>
        </td>

        <td
          className="py-3.5 px-4 text-right"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPreview(demande)}
              className="size-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
              title="Aperçu officiel de la demande"
            >
              <Eye size={17} weight="duotone" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPrint(demande)}
              className="size-8 p-0 rounded-lg text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/40"
              title="Imprimer la demande"
            >
              <Printer size={17} weight="duotone" />
            </Button>

            {demande.historique && demande.historique.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenHistory(demande)}
                className="size-8 p-0 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                title="Audit médico-légal des modifications"
              >
                <ClockCounterClockwise size={17} weight="duotone" />
              </Button>
            )}

            {canEditOrCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenEdit(demande)}
                className="size-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                title="Modifier avec motif obligatoire"
              >
                <PencilSimple size={17} weight="duotone" />
              </Button>
            )}

            {canEditOrCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenCancel(demande)}
                className="size-8 p-0 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                title="Annuler la demande"
              >
                <Prohibit size={17} weight="duotone" />
              </Button>
            )}
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr className="bg-muted/15 border-b border-border/60">
          <td colSpan={8} className="p-4 sm:p-5">
            <ExamenAccordionDetail
              demande={demande}
              onPreview={onPreview}
              onPrint={onPrint}
            />
          </td>
        </tr>
      )}
    </Fragment>
  )
}

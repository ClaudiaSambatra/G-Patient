import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Flask, Microscope, Eye, Printer, Info } from "@phosphor-icons/react"
import { DemandeExamen } from "./types"

interface ExamenAccordionDetailProps {
  demande: DemandeExamen
  onPreview: (demande: DemandeExamen) => void
  onPrint: (demande: DemandeExamen) => void
}

export function ExamenAccordionDetail({
  demande,
  onPreview,
  onPrint,
}: ExamenAccordionDetailProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-xs animate-in slide-in-from-top-2 duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            <Flask size={20} weight="duotone" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              Détails de la demande {demande.numero}
              <Badge variant="outline" className="text-[10px] font-normal">
                Consultation #{demande.consultation}
              </Badge>
            </h4>
            <p className="text-xs text-muted-foreground">
              Patient :{" "}
              <strong>
                {demande.patient_nom} {demande.patient_prenom}
              </strong>{" "}
              • Délivrée par <strong>{demande.medecin_nom}</strong> le{" "}
              {new Date(demande.date_creation).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPreview(demande)}
            className="h-8 text-xs gap-1.5 rounded-xl"
          >
            <Eye size={15} weight="duotone" />
            Aperçu officiel
          </Button>
          <Button
            size="sm"
            onClick={() => onPrint(demande)}
            className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground rounded-xl"
          >
            <Printer size={15} weight="duotone" />
            Imprimer A4
          </Button>
        </div>
      </div>

      {demande.renseignements_cliniques && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3.5 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-cyan-800 dark:text-cyan-300 uppercase tracking-wide text-[11px] mb-1">
            <Info size={15} weight="duotone" />
            Renseignements cliniques & Contexte
          </div>
          <p className="text-cyan-900/90 dark:text-cyan-200 whitespace-pre-line leading-relaxed">
            {demande.renseignements_cliniques}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Microscope size={15} weight="duotone" className="text-primary" />
          Examens prescrits ({demande.lignes?.length || 0})
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {(demande.lignes || []).map((ligne, idx) => (
            <div
              key={ligne.id || idx}
              className="p-3 rounded-xl border border-border/80 bg-background flex flex-col justify-between text-xs space-y-1.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <span className="size-5 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-bold shrink-0">
                    {idx + 1}
                  </span>
                  {ligne.nom_examen}
                </div>
                <Badge
                  className={`text-[10px] shrink-0 font-medium ${
                    ligne.categorie === "BIOLOGIE"
                      ? "bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border-cyan-500/20"
                      : ligne.categorie === "IMAGERIE"
                      ? "bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-500/20"
                      : "bg-slate-500/10 text-slate-800 dark:text-slate-300 border-slate-500/20"
                  }`}
                >
                  {ligne.categorie === "BIOLOGIE"
                    ? "Biologie"
                    : ligne.categorie === "IMAGERIE"
                    ? "Imagerie"
                    : "Exploration"}
                </Badge>
              </div>

              {ligne.instructions ? (
                <p className="text-[11px] text-muted-foreground pl-6 italic">
                  Précautions : {ligne.instructions}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground/60 pl-6 italic">
                  Aucune instruction particulière
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

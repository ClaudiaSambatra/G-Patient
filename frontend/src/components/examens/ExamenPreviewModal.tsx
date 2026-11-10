import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Printer, X } from "@phosphor-icons/react"
import { DemandeExamen, getAge } from "./types"

interface ExamenPreviewModalProps {
  demande: DemandeExamen | null
  onClose: () => void
  onPrint: (demande: DemandeExamen) => void
}

export function ExamenPreviewModal({
  demande,
  onClose,
  onPrint,
}: ExamenPreviewModalProps) {
  if (!demande) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-6">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <FileText size={22} weight="duotone" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                Aperçu officiel — Demande {demande.numero}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Feuille de prescription médicale stylisée */}
        <div className="rounded-2xl border border-border/80 bg-background p-6 space-y-6 shadow-xs font-sans">
          {/* En-tête de la clinique */}
          <div className="flex items-start justify-between border-b-2 border-cyan-600 pb-4">
            <div>
              <div className="text-lg font-extrabold text-cyan-700 dark:text-cyan-400">
                CENTRE MÉDICAL & CLINIQUE
              </div>
              <div className="text-xs text-muted-foreground">
                Service des Consultations Médicales
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Antananarivo, Madagascar • Tél: +261 20 22 000 00
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-foreground">
                {demande.medecin_nom || "Dr. Praticien"}
              </div>
              <div className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">
                {demande.medecin_specialite || "Médecine Générale"}
              </div>
              {demande.medecin_numero_ordre && (
                <div className="text-[11px] text-muted-foreground">
                  N° Ordre : {demande.medecin_numero_ordre}
                </div>
              )}
            </div>
          </div>

          {/* Infos Patient & Date */}
          <div className="grid grid-cols-2 gap-4 p-3.5 rounded-xl bg-muted/30 border border-border/60 text-xs">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold block mb-1">
                Patient
              </span>
              <div className="text-sm font-bold text-foreground">
                {demande.patient_nom} {demande.patient_prenom}
              </div>
              <div className="text-muted-foreground mt-0.5">
                {getAge(demande.patient_date_naissance) &&
                  `${getAge(demande.patient_date_naissance)} • `}
                {demande.patient_contact &&
                  `Contact: ${demande.patient_contact}`}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold block mb-1">
                Prescription
              </span>
              <div className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                {demande.numero}
              </div>
              <div className="text-muted-foreground mt-0.5">
                Délivrée le{" "}
                {new Date(demande.date_creation).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>

          {/* Renseignements cliniques */}
          {demande.renseignements_cliniques && (
            <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-xs text-cyan-900 dark:text-cyan-200">
              <strong className="block mb-1 text-[11px] uppercase tracking-wider">
                Renseignements cliniques / Diagnostic d&apos;orientation :
              </strong>
              <p className="whitespace-pre-line leading-relaxed">
                {demande.renseignements_cliniques}
              </p>
            </div>
          )}

          {/* Tableau des examens */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 border-b border-border/60 pb-1.5">
              Analyses biologiques & Explorations prescrites
            </div>
            <div className="divide-y divide-border/60 border border-border/60 rounded-xl overflow-hidden">
              {(demande.lignes || []).map((l, idx) => (
                <div
                  key={idx}
                  className="p-3 flex items-start justify-between text-xs bg-card"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <span className="text-muted-foreground font-mono font-bold text-[11px]">
                        {idx + 1}.
                      </span>
                      {l.nom_examen}
                    </div>
                    {l.instructions && (
                      <div className="text-[11px] text-muted-foreground pl-4 italic">
                        Précautions : {l.instructions}
                      </div>
                    )}
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-[10px] shrink-0 font-medium"
                  >
                    {l.categorie === "BIOLOGIE"
                      ? "🔬 Biologie"
                      : l.categorie === "IMAGERIE"
                      ? "🩻 Imagerie"
                      : "📋 Exploration"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Mentions légales */}
          <div className="pt-3 border-t border-border/60 flex items-end justify-between text-[11px] text-muted-foreground">
            <p className="max-w-xs leading-relaxed">
              À réaliser dans un laboratoire d&apos;analyses médicales ou centre
              d&apos;imagerie conventionné de votre choix. Règlement direct
              auprès du prestataire.
            </p>
            <div className="text-center font-medium">
              <div className="text-[10px] text-muted-foreground mb-4">
                Signature & Cachet
              </div>
              <div className="border-t border-foreground/30 pt-1 text-foreground font-bold">
                {demande.medecin_nom || "Le Médecin"}
              </div>
            </div>
          </div>
        </div>

        {/* Actions footer */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Fermer
          </Button>
          <Button
            onClick={() => onPrint(demande)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl gap-2 shadow-xs"
          >
            <Printer size={16} weight="duotone" />
            Imprimer en format A4
          </Button>
        </div>
      </div>
    </div>
  )
}

import {
  AlertTriangle,
  AlertCircle,
  FileText,
  Activity,
  Thermometer,
  Heart,
  Scale,
  User,
  Calendar,
  Sparkles,
} from "lucide-react"
import { Consultation, computeBMI } from "./types"
import { ConsultationOrigineCard } from "./ConsultationOrigineCard"

interface ConsultationVitalsSectionProps {
  consultation: Consultation
}

export function ConsultationVitalsSection({
  consultation,
}: ConsultationVitalsSectionProps) {
  const bmi = computeBMI(
    consultation.constantes?.poids,
    consultation.constantes?.taille
  )

  return (
    <div className="space-y-6">
      {/* Consultation d'origine si suivi */}
      <ConsultationOrigineCard
        orig={consultation.consultation_origine_details}
      />

      {/* 1. Alerte Médicale Prioritaire : Allergies & Antécédents */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
          <AlertTriangle className="size-4 shrink-0 text-amber-600" />
          Dossier médical patient — Alertes cliniques
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-background/90 p-3 rounded-xl border border-border/60 shadow-2xs">
            <span className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1 mb-1">
              <AlertCircle className="size-3.5" /> Allergies signalées :
            </span>
            <span className="text-foreground font-medium">
              {consultation.patient_allergies || (
                <span className="italic text-muted-foreground font-normal">
                  Aucune allergie connue répertoriée
                </span>
              )}
            </span>
          </div>
          <div className="bg-background/90 p-3 rounded-xl border border-border/60 shadow-2xs">
            <span className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1 mb-1">
              <FileText className="size-3.5" /> Antécédents médicaux :
            </span>
            <span className="text-foreground font-medium">
              {consultation.patient_antecedents || (
                <span className="italic text-muted-foreground font-normal">
                  Aucun antécédent médical répertorié
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Constantes Physiologiques & IMC */}
      {consultation.constantes && (
        <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="size-4 text-primary" /> Constantes physiologiques
              de la visite
            </span>
            {bmi && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${bmi.color}`}
              >
                IMC : {bmi.val} kg/m² — {bmi.label}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="bg-muted/30 p-3 rounded-xl border border-border/60 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground mb-1">
                <Thermometer className="size-3 text-rose-500" />
                <span>Température</span>
              </div>
              <span className="text-base font-bold text-foreground">
                {consultation.constantes.temperature
                  ? `${consultation.constantes.temperature} °C`
                  : "—"}
              </span>
            </div>

            <div className="bg-muted/30 p-3 rounded-xl border border-border/60 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground mb-1">
                <Activity className="size-3 text-primary" />
                <span>Tension</span>
              </div>
              <span className="text-base font-bold text-foreground">
                {consultation.constantes.tension_arterielle || "—"}
              </span>
            </div>

            <div className="bg-muted/30 p-3 rounded-xl border border-border/60 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground mb-1">
                <Heart className="size-3 text-rose-500" />
                <span>Fréq. card.</span>
              </div>
              <span className="text-base font-bold text-foreground">
                {consultation.constantes.frequence_cardiaque
                  ? `${consultation.constantes.frequence_cardiaque} bpm`
                  : "—"}
              </span>
            </div>

            <div className="bg-muted/30 p-3 rounded-xl border border-border/60 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground mb-1">
                <Scale className="size-3 text-amber-500" />
                <span>Poids</span>
              </div>
              <span className="text-base font-bold text-foreground">
                {consultation.constantes.poids
                  ? `${consultation.constantes.poids} kg`
                  : "—"}
              </span>
            </div>

            <div className="bg-muted/30 p-3 rounded-xl border border-border/60 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground mb-1">
                <User className="size-3 text-blue-500" />
                <span>Taille</span>
              </div>
              <span className="text-base font-bold text-foreground">
                {consultation.constantes.taille
                  ? `${consultation.constantes.taille} cm`
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Recommandation de Suivi / Contrôle Médical */}
      {(consultation.date_suivi_recommandee ||
        consultation.date_controle_recommandee ||
        consultation.suivi_recommande) && (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400">
                <Calendar className="size-5" />
              </div>
              <div>
                <span className="font-bold text-foreground text-sm block">
                  Date de suivi recommandée :{" "}
                  {consultation.date_suivi_recommandee ||
                  consultation.date_controle_recommandee
                    ? new Date(
                        consultation.date_suivi_recommandee ||
                          consultation.date_controle_recommandee!
                      ).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "Date libre / à l'appréciation du patient"}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Recommandation médicale à titre indicatif. Le patient peut
                  revenir sans réservation préalable.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
              Suivi recommandé
            </span>
          </div>
          {consultation.motif_suivi && (
            <div className="pl-13 text-xs text-blue-950 dark:text-blue-200 bg-background/60 p-2.5 rounded-xl border border-blue-500/20">
              <strong>Motif du suivi recommandé : </strong>
              {consultation.motif_suivi}
            </div>
          )}
        </div>
      )}

      {/* 4. Examen Clinique & Diagnostic */}
      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-2xl border border-border/60 bg-muted/10 p-4 space-y-1">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
            Motif de la consultation
          </span>
          <p className="text-base font-semibold text-foreground">
            {consultation.motif}
          </p>
        </div>

        <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
            <Sparkles className="size-3.5" />
            Conclusion Diagnostique
          </div>
          <p className="text-base font-bold text-foreground whitespace-pre-wrap">
            {consultation.diagnostic || (
              <span className="italic font-normal text-muted-foreground">
                Aucun diagnostic saisi
              </span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Observations cliniques
            </span>
            <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
              {consultation.observations || (
                <span className="italic text-muted-foreground">
                  Aucune observation consignée
                </span>
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Compte-rendu médical
            </span>
            <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
              {consultation.compte_rendu || (
                <span className="italic text-muted-foreground">
                  Aucun compte-rendu spécifique
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

import { RotateCcw } from "lucide-react"

interface ConsultationOrigineCardProps {
  orig: any
}

export function ConsultationOrigineCard({ orig }: ConsultationOrigineCardProps) {
  if (!orig) return null

  return (
    <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2 text-xs uppercase tracking-wider">
          <RotateCcw className="size-4 text-emerald-600" /> Suivi rattaché à la
          consultation d&apos;origine #{orig.id}
        </span>
        <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-200/50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
          Parcours de suivi
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          Praticien initial :{" "}
          <strong className="text-foreground">{orig.medecin_nom}</strong>
        </div>
        <div>
          Date initiale :{" "}
          <strong className="text-foreground">
            {orig.date_consultation_formatee}
          </strong>
        </div>
      </div>

      <div className="bg-background/90 p-3 rounded-xl border border-border/60 text-xs space-y-1.5">
        <div>
          <span className="font-bold text-foreground">Motif initial : </span>
          <span>{orig.motif}</span>
        </div>
        <div>
          <span className="font-bold text-foreground">
            Diagnostic initial :{" "}
          </span>
          <span className="text-muted-foreground">
            {orig.diagnostic || "Non précisé"}
          </span>
        </div>
        <div>
          <span className="font-bold text-foreground">
            Observations cliniques initiales :{" "}
          </span>
          <span className="text-muted-foreground">
            {orig.observations || "Non précisé"}
          </span>
        </div>
        {orig.compte_rendu && (
          <div>
            <span className="font-bold text-foreground">
              Compte-rendu initial :{" "}
            </span>
            <span className="text-muted-foreground">{orig.compte_rendu}</span>
          </div>
        )}
        {orig.motif_suivi && (
          <div className="pt-1 text-emerald-800 dark:text-emerald-300 font-medium">
            <strong>Motif du suivi recommandé : </strong>
            {orig.motif_suivi}
          </div>
        )}
      </div>

      {orig.ordonnances && orig.ordonnances.length > 0 && (
        <div className="bg-background/90 p-2.5 rounded-xl border border-border/60 text-xs space-y-1">
          <span className="font-bold text-blue-700 dark:text-blue-400 block mb-0.5">
            💊 Traitement prescrit lors de la consultation initiale :
          </span>
          {orig.ordonnances.map((ord: any) => (
            <div key={ord.id} className="text-muted-foreground pl-2 text-[11px]">
              • {ord.medicaments} ({ord.posologie}) — Durée : {ord.duree}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

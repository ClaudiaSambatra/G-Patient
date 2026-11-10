import { History, User } from "lucide-react"
import { ConsultationHistoriqueItem } from "./types"

interface ConsultationAuditSectionProps {
  historique?: ConsultationHistoriqueItem[]
}

export function ConsultationAuditSection({
  historique,
}: ConsultationAuditSectionProps) {
  if (!historique || historique.length === 0) return null

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/15 p-4 space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <History className="size-4 text-amber-600" />
        Historique des modifications &amp; Traçabilité ({historique.length})
      </h4>
      <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
        {historique.map((h) => (
          <div
            key={h.id}
            className="rounded-xl border border-border/60 bg-card p-3 text-xs space-y-1.5 shadow-2xs"
          >
            <div className="flex justify-between items-center text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground flex items-center gap-1">
                <User className="size-3 text-primary" /> Modifié par {h.auteur_nom}
              </span>
              <span>{new Date(h.date_modification).toLocaleString("fr-FR")}</span>
            </div>
            <div className="text-foreground">
              <span className="font-semibold text-amber-700 dark:text-amber-400">
                Justification :{" "}
              </span>
              {h.motif_correction}
            </div>
            <div className="text-[11px] text-muted-foreground flex flex-wrap gap-1">
              <span className="font-medium">Champs modifiés :</span>
              {h.champs_modifies.map((champ, idx) => (
                <span
                  key={idx}
                  className="rounded-md bg-muted px-1.5 py-0.2 text-[10px] font-mono"
                >
                  {champ}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

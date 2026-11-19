import { History, PackagePlus, ClipboardCheck, Pencil } from "lucide-react"
import { StockMedicament, formatAriary } from "./types"

interface StockTableProps {
  data: StockMedicament[] | undefined
  isLoading: boolean
  canManage: boolean
  onEntree: (med: StockMedicament) => void
  onAjustement: (med: StockMedicament) => void
  onEdit: (med: StockMedicament) => void
  onHistorique: (med: StockMedicament) => void
}

export function StockTable({ data, isLoading, canManage, onEntree, onAjustement, onEdit, onHistorique }: StockTableProps) {
  if (isLoading) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Chargement du stock…</p>
  }
  if (!data || data.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        Aucun médicament trouvé.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Médicament</th>
            <th className="px-4 py-3 font-medium">Prix unitaire</th>
            <th className="px-4 py-3 font-medium">En stock</th>
            <th className="px-4 py-3 font-medium">Seuil</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((med) => (
            <tr key={med.id} className={med.actif ? "" : "opacity-60"}>
              <td className="px-4 py-3">
                <div className="font-medium text-foreground">{med.nom}</div>
                <div className="text-xs text-muted-foreground">
                  {[med.dosage, med.forme].filter(Boolean).join(" · ")}
                  {!med.actif && " · désactivé"}
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {formatAriary(med.prix_unitaire)} <span className="text-xs text-muted-foreground">/ {med.unite}</span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                    med.quantite === 0
                      ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                      : med.en_alerte
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  }`}
                >
                  {med.quantite} {med.unite}
                  {med.quantite > 1 ? "s" : ""}
                  {med.quantite === 0 ? " · rupture" : med.en_alerte ? " · à commander" : ""}
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{med.seuil_alerte}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => onEntree(med)}
                        title="Réception (entrée)"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
                      >
                        <PackagePlus className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onAjustement(med)}
                        title="Inventaire / ajustement"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
                      >
                        <ClipboardCheck className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(med)}
                        title="Modifier"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onHistorique(med)}
                        title="Historique des mouvements"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
                      >
                        <History className="size-4" />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

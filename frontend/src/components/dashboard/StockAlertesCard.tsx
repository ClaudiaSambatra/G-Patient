import Link from "next/link"
import { Warning } from "@phosphor-icons/react"
import { StockAlerte } from "./types"

// Module 11 : médicaments à ou sous leur seuil d'alerte. Rien n'est affiché si le stock va bien.
export function StockAlertesCard({ alertes }: { alertes?: StockAlerte[] }) {
  if (!alertes || alertes.length === 0) return null

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/30">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
          <Warning size={18} weight="fill" />
          {alertes.length} médicament{alertes.length > 1 ? "s" : ""} à commander
        </p>
        <Link href="/stocks" className="text-xs font-medium text-amber-900 underline dark:text-amber-200">
          Voir le stock
        </Link>
      </div>
      <ul className="mt-2 flex flex-wrap gap-2">
        {alertes.map((a) => (
          <li
            key={a.id}
            className="rounded-md bg-white/70 px-2 py-1 text-xs text-amber-900 dark:bg-amber-950/60 dark:text-amber-100"
          >
            {a.libelle} : <strong>{a.quantite === 0 ? "rupture" : `${a.quantite} ${a.unite}(s)`}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

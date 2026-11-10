import { Card } from "@/components/ui/card"
import { Search } from "lucide-react"

interface OrdonnanceFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  statutFilter: string
  onStatutChange: (statut: string) => void
}

export function OrdonnanceFilters({
  search,
  onSearchChange,
  statutFilter,
  onStatutChange,
}: OrdonnanceFiltersProps) {
  return (
    <Card className="border-border/80 shadow-xs rounded-2xl p-4 bg-card/60 backdrop-blur-xs">
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par numéro, patient, médicament..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
            Statut :
          </span>
          <div className="flex rounded-xl bg-muted/50 p-1 border border-border/60 text-xs font-medium">
            {["ALL", "ACTIVE", "MODIFIEE", "ANNULEE"].map((st) => (
              <button
                key={st}
                onClick={() => onStatutChange(st)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statutFilter === st
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st === "ALL"
                  ? "Toutes"
                  : st === "ACTIVE"
                  ? "Actives"
                  : st === "MODIFIEE"
                  ? "Modifiées"
                  : "Annulées"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

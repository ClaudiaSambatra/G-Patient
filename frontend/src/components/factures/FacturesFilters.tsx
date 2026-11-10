import { Card } from "@/components/ui/card"
import { Search } from "lucide-react"

interface FacturesFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  typeFilter: string
  onTypeFilterChange: (value: string) => void
  statutFilter: string
  onStatutFilterChange: (value: string) => void
}

export function FacturesFilters({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statutFilter,
  onStatutFilterChange,
}: FacturesFiltersProps) {
  return (
    <Card className="border-border/80 shadow-xs rounded-2xl p-4 bg-card/60 backdrop-blur-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par patient, libellé..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Filtre Type */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Type :</span>
            <select
              value={typeFilter}
              onChange={(e) => onTypeFilterChange(e.target.value)}
              className="h-9 rounded-xl border border-border bg-background px-2.5 text-xs font-medium shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">Tous les types</option>
              <option value="CONSULTATION">Consultation</option>
              <option value="MEDICAMENTS">Médicaments</option>
            </select>
          </div>

          {/* Filtre Statut */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Statut :</span>
            <select
              value={statutFilter}
              onChange={(e) => onStatutFilterChange(e.target.value)}
              className="h-9 rounded-xl border border-border bg-background px-2.5 text-xs font-medium shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="IMPAYEE">Impayée</option>
              <option value="PAYEE">Payée</option>
              <option value="ANNULEE">Annulée</option>
            </select>
          </div>
        </div>
      </div>
    </Card>
  )
}

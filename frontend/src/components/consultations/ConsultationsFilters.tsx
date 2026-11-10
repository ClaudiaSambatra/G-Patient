import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Search, Calendar, FilterX } from "lucide-react"

interface ConsultationsFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  dateDebut: string
  onDateDebutChange: (value: string) => void
  dateFin: string
  onDateFinChange: (value: string) => void
  onResetFilters: () => void
}

export function ConsultationsFilters({
  search,
  onSearchChange,
  dateDebut,
  onDateDebutChange,
  dateFin,
  onDateFinChange,
  onResetFilters,
}: ConsultationsFiltersProps) {
  const hasActiveFilters = Boolean(search || dateDebut || dateFin)

  return (
    <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden p-4 bg-card/60 backdrop-blur-xs">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Recherche textuelle */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par nom de patient, motif, diagnostic..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>

        {/* Filtres par date */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Calendar className="size-3.5 text-primary" />
            <span>Du :</span>
          </div>
          <input
            type="date"
            value={dateDebut}
            onChange={(e) => onDateDebutChange(e.target.value)}
            className="h-10 rounded-xl border border-border bg-background px-3 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium ml-1">
            <span>Au :</span>
          </div>
          <input
            type="date"
            value={dateFin}
            onChange={(e) => onDateFinChange(e.target.value)}
            className="h-10 rounded-xl border border-border bg-background px-3 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              className="h-10 rounded-xl text-xs gap-1.5 text-muted-foreground hover:text-foreground border-dashed"
            >
              <FilterX className="size-3.5" /> Réinitialiser filtres
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

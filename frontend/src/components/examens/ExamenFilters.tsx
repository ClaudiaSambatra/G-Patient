import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Flask,
  Microscope,
  MagnifyingGlass,
  CheckCircle,
  ClockCounterClockwise,
  Prohibit,
  X,
} from "@phosphor-icons/react"

interface ExamenFiltersProps {
  filterCategorie: string
  setFilterCategorie: (cat: string) => void
  filterStatut: string
  setFilterStatut: (st: string) => void
  search: string
  setSearch: (s: string) => void
  hasActiveFilters: boolean
  onResetFilters: () => void
  stats: {
    total: number
    actives: number
    modifiees: number
    annulees: number
    countDemandesBio: number
    countDemandesImg: number
    countDemandesAutre: number
  }
}

export function ExamenFilters({
  filterCategorie,
  setFilterCategorie,
  filterStatut,
  setFilterStatut,
  search,
  setSearch,
  hasActiveFilters,
  onResetFilters,
  stats,
}: ExamenFiltersProps) {
  return (
    <Card className="rounded-xl border-border/80 shadow-2xs">
      <CardContent className="p-2 sm:p-2.5 space-y-2">
        {/* Ligne 1 : Onglets Catégories rapides */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => setFilterCategorie("ALL")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all shrink-0 ${
                filterCategorie === "ALL"
                  ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
              }`}
            >
              <Flask size={14} weight="duotone" />
              <span>Toutes</span>
              <span className="text-[10px] opacity-80 font-mono">
                ({stats.total})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterCategorie("BIOLOGIE")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all shrink-0 ${
                filterCategorie === "BIOLOGIE"
                  ? "bg-cyan-500 text-white shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 font-medium"
              }`}
            >
              <Microscope size={14} weight="duotone" />
              <span>Laboratoire & Biologie</span>
              <span className="text-[10px] opacity-90 font-mono font-bold">
                ({stats.countDemandesBio})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterCategorie("IMAGERIE")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all shrink-0 ${
                filterCategorie === "IMAGERIE"
                  ? "bg-blue-600 text-white shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-medium"
              }`}
            >
              <span className="text-xs">🩻</span>
              <span>Radiologie</span>
              <span className="text-[10px] opacity-80 font-mono">
                ({stats.countDemandesImg})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterCategorie("AUTRE")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all shrink-0 ${
                filterCategorie === "AUTRE"
                  ? "bg-slate-700 text-white shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
              }`}
            >
              <span className="text-xs">📋</span>
              <span>Autres</span>
              <span className="text-[10px] opacity-80 font-mono">
                ({stats.countDemandesAutre})
              </span>
            </button>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="h-7 px-2 rounded-lg text-[11px] text-muted-foreground hover:text-foreground gap-1 shrink-0"
              title="Réinitialiser tous les critères"
            >
              <X size={12} weight="bold" />
              Effacer
            </Button>
          )}
        </div>

        {/* Ligne 2 : Recherche compacte + Filtres de statuts */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1.5 border-t border-border/50">
          <div className="relative flex-1 w-full">
            <MagnifyingGlass
              size={15}
              weight="duotone"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              placeholder="Rechercher par n°, patient, médecin prescripteur, analyse..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-7 rounded-lg bg-muted/30 border-border/70 text-xs h-8"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              >
                <X size={12} weight="bold" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 flex-wrap w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setFilterStatut("ALL")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                filterStatut === "ALL"
                  ? "bg-muted text-foreground font-semibold border border-border/80 shadow-2xs"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              Tous ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatut("ACTIVE")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1 ${
                filterStatut === "ACTIVE"
                  ? "bg-emerald-600 text-white font-semibold shadow-2xs"
                  : "bg-emerald-50/70 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100"
              }`}
            >
              <CheckCircle size={12} weight="duotone" />
              Actives ({stats.actives})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatut("MODIFIEE")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1 ${
                filterStatut === "MODIFIEE"
                  ? "bg-amber-600 text-white font-semibold shadow-2xs"
                  : "bg-amber-50/70 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100"
              }`}
            >
              <ClockCounterClockwise size={12} weight="duotone" />
              Modifiées ({stats.modifiees})
            </button>
            {stats.annulees > 0 && (
              <button
                type="button"
                onClick={() => setFilterStatut("ANNULEE")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1 ${
                  filterStatut === "ANNULEE"
                    ? "bg-red-600 text-white font-semibold shadow-2xs"
                    : "bg-red-50/70 text-red-800 dark:bg-red-950/40 dark:text-red-300 hover:bg-red-100"
                }`}
              >
                <Prohibit size={12} weight="duotone" />
                Annulées ({stats.annulees})
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

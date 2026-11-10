import { Search, Stethoscope, Briefcase, Shield } from "lucide-react"

interface UserFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  roleFilter: string
  onRoleFilterChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
}

export function UserFilters({
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
}: UserFiltersProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Recherche textuelle */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          id="input-search-users"
          placeholder="Rechercher par nom, prénom, email, identifiant..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Filtres par Rôle et Statut */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Rôle */}
        <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border/60">
          <button
            onClick={() => onRoleFilterChange("")}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
              roleFilter === ""
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Tous les rôles
          </button>
          <button
            onClick={() => onRoleFilterChange("MEDECIN")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
              roleFilter === "MEDECIN"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Stethoscope className="size-3" /> Médecins
          </button>
          <button
            onClick={() => onRoleFilterChange("SECRETAIRE")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
              roleFilter === "SECRETAIRE"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Briefcase className="size-3" /> Secrétaires
          </button>
          <button
            onClick={() => onRoleFilterChange("ADMIN")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
              roleFilter === "ADMIN"
                ? "bg-primary text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Shield className="size-3" /> Admins
          </button>
        </div>

        {/* Statut */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="h-9 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:border-primary focus:outline-none cursor-pointer"
        >
          <option value="">Tous les statuts</option>
          <option value="true">Actifs uniquement</option>
          <option value="false">Inactifs uniquement</option>
        </select>
      </div>
    </div>
  )
}

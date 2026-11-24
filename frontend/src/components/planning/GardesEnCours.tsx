import { useQuery } from "@tanstack/react-query"
import { Moon } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { Garde, plageGarde } from "./types"

// Encart « De garde en ce moment » : rien n'est affiché s'il n'y a aucune garde en cours.
export function GardesEnCours() {
  const { data: gardes = [] } = useQuery({
    queryKey: ["planning-gardes-en-cours"],
    queryFn: async () => (await apiClient.get<Garde[]>("/planning/gardes/en-cours/")).data,
    refetchInterval: 60000,
  })

  if (gardes.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm dark:border-indigo-900/60 dark:bg-indigo-950/30">
      <span className="flex items-center gap-2 font-semibold text-indigo-800 dark:text-indigo-200">
        <Moon className="size-4" /> De garde en ce moment
      </span>
      {gardes.map((g) => (
        <span key={g.id} className="text-foreground">
          {g.medecin_nom}
          {g.medecin_specialite && <span className="text-muted-foreground"> · {g.medecin_specialite}</span>}
          <span className="ml-1.5 text-xs text-muted-foreground">({plageGarde(g)})</span>
        </span>
      ))}
    </div>
  )
}

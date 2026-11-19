import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, Clock } from "lucide-react"
import { apiClient } from "@/lib/api-client"

interface Creneaux {
  duree_minutes: number
  horaires_definis: boolean
  absence: string | null
  creneaux: string[]
}

interface CreneauxPickerProps {
  medecinId: string | number
  date: string
  heure: string
  onChoisir: (heure: string) => void
}

/** Créneaux libres de 15 minutes du médecin pour la date choisie : un clic remplit l'heure. */
export function CreneauxPicker({ medecinId, date, heure, onChoisir }: CreneauxPickerProps) {
  const actif = Boolean(medecinId && date)
  const { data, isLoading } = useQuery({
    queryKey: ["planning-creneaux", String(medecinId), date],
    queryFn: async () =>
      (await apiClient.get<Creneaux>(`/planning/creneaux/?medecin=${medecinId}&date=${date}`)).data,
    enabled: actif,
  })

  if (!actif) {
    return <p className="text-xs text-muted-foreground">Choisissez un médecin et une date pour voir les créneaux libres.</p>
  }
  if (isLoading || !data) {
    return <p className="text-xs text-muted-foreground">Recherche des créneaux libres…</p>
  }
  if (data.absence) {
    return (
      <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-600">
        <AlertTriangle className="size-4 shrink-0" />
        Médecin absent ce jour-là ({data.absence.toLowerCase()}) : choisissez une autre date ou un autre médecin.
      </p>
    )
  }
  if (data.creneaux.length === 0) {
    return (
      <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
        <AlertTriangle className="size-4 shrink-0" />
        Aucun créneau libre ce jour-là{data.horaires_definis ? " (journée complète ou pas de consultation)" : ""}.
      </p>
    )
  }

  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3.5" />
        {data.creneaux.length} créneau{data.creneaux.length > 1 ? "x" : ""} libre{data.creneaux.length > 1 ? "s" : ""} de{" "}
        {data.duree_minutes} min{!data.horaires_definis && " (horaires du médecin non renseignés : 8h-17h)"}
      </p>
      <div className="grid max-h-36 grid-cols-5 gap-1.5 overflow-y-auto sm:grid-cols-6">
        {data.creneaux.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChoisir(c)}
            className={`rounded-md border px-1.5 py-1 text-xs font-medium tabular-nums transition-colors ${
              heure === c
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}

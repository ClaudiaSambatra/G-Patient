import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CalendarX, Plus, Trash2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Absence, TYPES_ABSENCE, aujourdhuiISO, formatDate, messageErreur } from "./types"

interface Props {
  medecinId: number
  peutModifier: boolean
  notifier: (type: "success" | "error", message: string) => void
}

export function AbsencesSection({ medecinId, peutModifier, notifier }: Props) {
  const queryClient = useQueryClient()
  const aujourdhui = aujourdhuiISO()
  const [debut, setDebut] = useState(aujourdhui)
  const [fin, setFin] = useState(aujourdhui)
  const [type, setType] = useState("CONGE")
  const [motif, setMotif] = useState("")

  const { data: absences = [] } = useQuery({
    queryKey: ["planning-absences", medecinId],
    queryFn: async () =>
      (await apiClient.get<{ results: Absence[] }>(`/planning/absences/?medecin=${medecinId}&a_venir=1&page_size=100`)).data
        .results || [],
  })

  const rafraichir = () => {
    queryClient.invalidateQueries({ queryKey: ["planning-absences", medecinId] })
    queryClient.invalidateQueries({ queryKey: ["planning-a-reaffecter"] })
    queryClient.invalidateQueries({ queryKey: ["medecins"] })
  }

  const ajouter = useMutation({
    mutationFn: async () =>
      (await apiClient.post<Absence>("/planning/absences/", { medecin: medecinId, date_debut: debut, date_fin: fin, type, motif })).data,
    onSuccess: (absence) => {
      setMotif("")
      rafraichir()
      notifier(
        "success",
        absence.nb_rdv_concernes > 0
          ? `Absence enregistrée. ${absence.nb_rdv_concernes} rendez-vous à réaffecter ou décaler.`
          : "Absence enregistrée.",
      )
    },
    onError: (err) => notifier("error", messageErreur(err, "Impossible d'enregistrer l'absence.")),
  })

  const supprimer = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/planning/absences/${id}/`),
    onSuccess: rafraichir,
    onError: (err) => notifier("error", messageErreur(err, "Impossible de supprimer l'absence.")),
  })

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <CalendarX className="size-4.5 text-primary" /> Absences prévues
      </h2>

      {absences.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Aucune absence à venir.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {absences.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div>
                <span className="font-medium">
                  {a.date_debut === a.date_fin
                    ? formatDate(a.date_debut)
                    : `${formatDate(a.date_debut)} → ${formatDate(a.date_fin)}`}
                </span>
                <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">{a.type_display}</span>
                {a.motif && <span className="ml-2 text-xs text-muted-foreground">{a.motif}</span>}
                {a.nb_rdv_concernes > 0 && (
                  <span className="ml-2 text-xs font-medium text-amber-700">{a.nb_rdv_concernes} RDV concerné(s)</span>
                )}
              </div>
              {peutModifier && (
                <button
                  type="button"
                  onClick={() => supprimer.mutate(a.id)}
                  title="Supprimer l'absence"
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {peutModifier && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            ajouter.mutate()
          }}
          className="mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-4"
        >
          <label className="text-xs">
            <span className="mb-1 block text-muted-foreground">Du</span>
            <input type="date" required value={debut} min={aujourdhui} onChange={(e) => { setDebut(e.target.value); if (e.target.value > fin) setFin(e.target.value) }} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-muted-foreground">Au (inclus)</span>
            <input type="date" required value={fin} min={debut} onChange={(e) => setFin(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-muted-foreground">Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              {TYPES_ABSENCE.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1 text-xs">
            <span className="mb-1 block text-muted-foreground">Motif (facultatif)</span>
            <input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex : congrès de cardiologie" className="h-9 w-full min-w-40 rounded-md border border-input bg-background px-2 text-sm" />
          </label>
          <Button type="submit" size="sm" disabled={ajouter.isPending} className="h-9 gap-1.5">
            <Plus className="size-4" /> Déclarer l&apos;absence
          </Button>
        </form>
      )}
    </section>
  )
}

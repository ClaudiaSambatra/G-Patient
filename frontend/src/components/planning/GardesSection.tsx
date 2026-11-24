import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Moon, Plus, Trash2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Garde, aujourdhuiISO, formatDate, messageErreur, plageGarde } from "./types"

interface Props {
  medecinId: number
  peutModifier: boolean
  notifier: (type: "success" | "error", message: string) => void
}

export function GardesSection({ medecinId, peutModifier, notifier }: Props) {
  const queryClient = useQueryClient()
  const aujourdhui = aujourdhuiISO()
  const [date, setDate] = useState(aujourdhui)
  const [debut, setDebut] = useState("18:00")
  const [fin, setFin] = useState("08:00")
  const [motif, setMotif] = useState("")

  const { data: gardes = [] } = useQuery({
    queryKey: ["planning-gardes", medecinId],
    queryFn: async () =>
      (await apiClient.get<{ results: Garde[] }>(`/planning/gardes/?medecin=${medecinId}&a_venir=1&page_size=100`)).data
        .results || [],
  })

  const rafraichir = () => {
    queryClient.invalidateQueries({ queryKey: ["planning-gardes", medecinId] })
    queryClient.invalidateQueries({ queryKey: ["planning-gardes-en-cours"] })
    queryClient.invalidateQueries({ queryKey: ["planning-a-reaffecter"] })
  }

  const ajouter = useMutation({
    mutationFn: async () =>
      (await apiClient.post<Garde>("/planning/gardes/", { medecin: medecinId, date, heure_debut: debut, heure_fin: fin, motif }))
        .data,
    onSuccess: () => {
      setMotif("")
      rafraichir()
      notifier("success", "Garde enregistrée : les rendez-vous sont possibles sur ce créneau.")
    },
    onError: (err) => notifier("error", messageErreur(err, "Impossible d'enregistrer la garde.")),
  })

  const supprimer = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/planning/gardes/${id}/`),
    onSuccess: rafraichir,
    onError: (err) => notifier("error", messageErreur(err, "Impossible de supprimer la garde.")),
  })

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Moon className="size-4.5 text-primary" /> Gardes
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Nuits, week-ends, jours fériés : en plus des horaires habituels. Plusieurs médecins peuvent être de garde en même temps.
      </p>

      {gardes.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Aucune garde à venir.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {gardes.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div>
                <span className="font-medium">{formatDate(g.date)}</span>
                <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">{plageGarde(g)}</span>
                {g.motif && <span className="ml-2 text-xs text-muted-foreground">{g.motif}</span>}
              </div>
              {peutModifier && (
                <button
                  type="button"
                  onClick={() => supprimer.mutate(g.id)}
                  title="Supprimer la garde"
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
            <span className="mb-1 block text-muted-foreground">Le</span>
            <input type="date" required value={date} min={aujourdhui} onChange={(e) => setDate(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-muted-foreground">De</span>
            <input type="time" required value={debut} onChange={(e) => setDebut(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-muted-foreground">À {fin && debut && fin <= debut ? "(lendemain)" : ""}</span>
            <input type="time" required value={fin} onChange={(e) => setFin(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
          </label>
          <label className="flex-1 text-xs">
            <span className="mb-1 block text-muted-foreground">Motif (facultatif)</span>
            <input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex : garde de nuit, week-end" className="h-9 w-full min-w-40 rounded-md border border-input bg-background px-2 text-sm" />
          </label>
          <Button type="submit" size="sm" disabled={ajouter.isPending} className="h-9 gap-1.5">
            <Plus className="size-4" /> Ajouter la garde
          </Button>
        </form>
      )}
    </section>
  )
}

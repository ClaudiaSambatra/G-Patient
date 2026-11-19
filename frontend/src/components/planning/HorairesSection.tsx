import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Clock, Plus, Trash2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Horaire, JOURS, messageErreur } from "./types"

interface Props {
  medecinId: number
  peutModifier: boolean
  notifier: (type: "success" | "error", message: string) => void
}

export function HorairesSection({ medecinId, peutModifier, notifier }: Props) {
  const queryClient = useQueryClient()
  const [jour, setJour] = useState("0")
  const [debut, setDebut] = useState("08:00")
  const [fin, setFin] = useState("12:00")

  const { data: horaires = [] } = useQuery({
    queryKey: ["planning-horaires", medecinId],
    queryFn: async () => (await apiClient.get<Horaire[]>(`/planning/horaires/?medecin=${medecinId}`)).data,
  })

  const rafraichir = () => {
    queryClient.invalidateQueries({ queryKey: ["planning-horaires", medecinId] })
    queryClient.invalidateQueries({ queryKey: ["planning-a-reaffecter"] })
  }

  const ajouter = useMutation({
    mutationFn: () =>
      apiClient.post("/planning/horaires/", { medecin: medecinId, jour: Number(jour), heure_debut: debut, heure_fin: fin }),
    onSuccess: () => {
      notifier("success", "Plage horaire ajoutée.")
      rafraichir()
    },
    onError: (err) => notifier("error", messageErreur(err, "Impossible d'ajouter la plage.")),
  })

  const supprimer = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/planning/horaires/${id}/`),
    onSuccess: rafraichir,
    onError: (err) => notifier("error", messageErreur(err, "Impossible de supprimer la plage.")),
  })

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Clock className="size-4.5 text-primary" /> Horaires de consultation
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {horaires.length === 0
          ? "Aucune plage définie : les rendez-vous peuvent être pris à toute heure."
          : "Les rendez-vous ne peuvent être pris que pendant ces plages."}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {JOURS.map((nomJour, idx) => {
          const plages = horaires.filter((h) => h.jour === idx)
          return (
            <div key={nomJour} className="rounded-md border border-border/70 px-3 py-2">
              <p className="text-xs font-semibold text-foreground">{nomJour}</p>
              {plages.length === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">{horaires.length ? "Pas de consultation" : "—"}</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {plages.map((h) => (
                    <li key={h.id} className="flex items-center justify-between text-sm">
                      <span>
                        {h.heure_debut.slice(0, 5)} – {h.heure_fin.slice(0, 5)}
                      </span>
                      {peutModifier && (
                        <button
                          type="button"
                          onClick={() => supprimer.mutate(h.id)}
                          title="Supprimer"
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      {peutModifier && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            ajouter.mutate()
          }}
          className="mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-4"
        >
          <label className="text-xs">
            <span className="mb-1 block text-muted-foreground">Jour</span>
            <select value={jour} onChange={(e) => setJour(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              {JOURS.map((j, i) => (
                <option key={j} value={i}>
                  {j}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-muted-foreground">De</span>
            <input type="time" required value={debut} onChange={(e) => setDebut(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-muted-foreground">À</span>
            <input type="time" required value={fin} onChange={(e) => setFin(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
          </label>
          <Button type="submit" size="sm" disabled={ajouter.isPending} className="h-9 gap-1.5">
            <Plus className="size-4" /> Ajouter la plage
          </Button>
        </form>
      )}
    </section>
  )
}

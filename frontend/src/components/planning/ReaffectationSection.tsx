import { useState } from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowRightLeft, CheckCircle2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { RdvAReaffecter, Remplacant, messageErreur } from "./types"

function LigneRdv({ rdv, notifier }: { rdv: RdvAReaffecter; notifier: Props["notifier"] }) {
  const queryClient = useQueryClient()
  const [choix, setChoix] = useState("")

  const { data: remplacants, isLoading } = useQuery({
    queryKey: ["planning-remplacants", rdv.id],
    queryFn: async () => (await apiClient.get<Remplacant[]>(`/planning/rdv-a-reaffecter/${rdv.id}/remplacants/`)).data,
  })

  const reaffecter = useMutation({
    mutationFn: () => apiClient.post(`/planning/rdv-a-reaffecter/${rdv.id}/reaffecter/`, { medecin: Number(choix) }),
    onSuccess: () => {
      const nom = remplacants?.find((m) => String(m.id) === choix)?.nom
      notifier("success", `Rendez-vous de ${rdv.patient_nom} confié à ${nom}.`)
      queryClient.invalidateQueries({ queryKey: ["planning-a-reaffecter"] })
      queryClient.invalidateQueries({ queryKey: ["planning-absences"] })
      queryClient.invalidateQueries({ queryKey: ["rendezvous"] })
    },
    onError: (err) => notifier("error", messageErreur(err, "Impossible de réaffecter ce rendez-vous.")),
  })

  const date = new Date(rdv.date_heure)
  return (
    <tr className="align-top">
      <td className="py-2.5 pr-3 whitespace-nowrap">
        <div className="font-medium">{date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}</div>
        <div className="text-xs text-muted-foreground">{date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
      </td>
      <td className="py-2.5 pr-3">
        <div className="font-medium">{rdv.patient_nom}</div>
        <div className="text-xs text-muted-foreground">{rdv.motif || rdv.type}</div>
      </td>
      <td className="py-2.5 pr-3">
        <div>{rdv.medecin_nom}</div>
        <div className="text-xs text-amber-700">{rdv.raison}</div>
      </td>
      <td className="py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={choix}
            onChange={(e) => setChoix(e.target.value)}
            disabled={isLoading || !remplacants?.length}
            className="h-8 min-w-44 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="">
              {isLoading ? "Chargement…" : remplacants?.length ? "Choisir un remplaçant" : "Aucun médecin disponible"}
            </option>
            {remplacants?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nom} · {m.specialite || "—"}
                {m.meme_specialite ? " ✓" : ""}
              </option>
            ))}
          </select>
          <Button size="sm" className="h-8 gap-1 text-xs" disabled={!choix || reaffecter.isPending} onClick={() => reaffecter.mutate()}>
            <ArrowRightLeft className="size-3.5" /> Réaffecter
          </Button>
          <Link href="/rendezvous" className="text-xs text-primary hover:underline">
            ou décaler
          </Link>
        </div>
      </td>
    </tr>
  )
}

interface Props {
  notifier: (type: "success" | "error", message: string) => void
}

export function ReaffectationSection({ notifier }: Props) {
  const { data: rdvs = [], isLoading } = useQuery({
    queryKey: ["planning-a-reaffecter"],
    queryFn: async () => (await apiClient.get<RdvAReaffecter[]>("/planning/rdv-a-reaffecter/")).data,
  })

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <ArrowRightLeft className="size-4.5 text-primary" /> Rendez-vous à réaffecter
        {rdvs.length > 0 && <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">{rdvs.length}</span>}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Rendez-vous à venir dont le médecin est absent ou hors de ses horaires. Choisissez un remplaçant disponible à ce
        créneau (✓ = même spécialité), ou décalez le rendez-vous.
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Chargement…</p>
      ) : rdvs.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="size-4" /> Aucun rendez-vous à réaffecter.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Patient</th>
                <th className="py-2 pr-3 font-medium">Médecin prévu</th>
                <th className="py-2 font-medium">Remplacement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rdvs.map((rdv) => (
                <LigneRdv key={rdv.id} rdv={rdv} notifier={notifier} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

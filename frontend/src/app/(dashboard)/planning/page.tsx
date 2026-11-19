"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { AlertCircle, CalendarClock, CheckCircle2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { CurrentUser } from "@/components/sidebar"
import { HorairesSection } from "@/components/planning/HorairesSection"
import { AbsencesSection } from "@/components/planning/AbsencesSection"
import { ReaffectationSection } from "@/components/planning/ReaffectationSection"
import { MedecinOption } from "@/components/planning/types"

export default function PlanningPage() {
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [medecinChoisi, setMedecinChoisi] = useState<number | null>(null)

  function notifier(type: "success" | "error", message: string) {
    setNotification({ type, message })
    setTimeout(() => setNotification((c) => (c?.message === message ? null : c)), 5000)
  }

  const { data: user } = useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: async () => (await apiClient.get<CurrentUser>("/accounts/me/")).data,
  })
  const gereLePlanning = user?.role === "SECRETAIRE" || user?.role === "ADMIN" || Boolean(user?.is_superuser)

  const { data: medecins = [] } = useQuery({
    queryKey: ["medecins", "planning"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ results?: MedecinOption[] } | MedecinOption[]>("/medecins/?page_size=100")
      return Array.isArray(data) ? data : data.results || []
    },
  })

  // Un médecin voit et gère son propre planning ; la secrétaire et l'admin choisissent le médecin.
  const medecinId = gereLePlanning ? (medecinChoisi ?? medecins[0]?.id ?? null) : (user?.medecin_id ?? null)
  const medecin = medecins.find((m) => m.id === medecinId)
  const peutModifier = gereLePlanning || (user?.medecin_id != null && user.medecin_id === medecinId)

  return (
    <div className="flex flex-1 flex-col">
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg px-4 py-3 text-white shadow-lg ${
            notification.type === "success" ? "bg-emerald-600" : "bg-destructive"
          }`}
        >
          {notification.type === "success" ? <CheckCircle2 className="size-5" /> : <AlertCircle className="size-5" />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-bold text-foreground sm:text-3xl">
              <CalendarClock className="size-7 text-primary" />
              Planning des médecins
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Horaires de consultation et absences : la prise de rendez-vous en tient compte automatiquement.
            </p>
          </div>
          {gereLePlanning && medecins.length > 0 && (
            <label className="text-xs">
              <span className="mb-1 block text-muted-foreground">Médecin</span>
              <select
                value={medecinId ?? ""}
                onChange={(e) => setMedecinChoisi(Number(e.target.value))}
                className="h-10 min-w-56 rounded-lg border border-border bg-background px-3 text-sm"
              >
                {medecins.map((m) => (
                  <option key={m.id} value={m.id}>
                    Dr. {m.nom} {m.prenom} {m.specialite ? `· ${m.specialite}` : ""}
                    {m.absent_aujourdhui ? " · absent aujourd'hui" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {gereLePlanning && <ReaffectationSection notifier={notifier} />}

        {medecinId ? (
          <>
            {medecin && (
              <p className="-mb-2 text-sm font-medium text-foreground">
                Dr. {medecin.nom} {medecin.prenom}
                {medecin.specialite && <span className="text-muted-foreground"> · {medecin.specialite}</span>}
              </p>
            )}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <HorairesSection medecinId={medecinId} peutModifier={peutModifier} notifier={notifier} />
              <AbsencesSection medecinId={medecinId} peutModifier={peutModifier} notifier={notifier} />
            </div>
          </>
        ) : (
          <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Aucun médecin enregistré.
          </p>
        )}
      </main>
    </div>
  )
}

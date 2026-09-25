"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { CurrentUser } from "@/components/sidebar"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { 
  FileText, 
  Search, 
  RefreshCw, 
  Calendar,
  User,
  Stethoscope
} from "lucide-react"

interface Consultation {
  id: number
  patient: number
  patient_nom: string
  patient_prenom: string
  medecin: number
  medecin_nom: string
  date_consultation: string
  motif: string
  observations: string
  diagnostic: string
}

interface ConsultationListResponse {
  count: number
  results: Consultation[]
}

export default function ConsultationsPage() {
  const [search, setSearch] = useState("")

  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await apiClient.get<CurrentUser>("/accounts/me/")
      return data
    },
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["consultations", search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      const { data } = await apiClient.get<ConsultationListResponse>(`/consultations/?${params.toString()}`)
      return data
    },
  })

  return (
    <div className="flex-1 flex flex-col">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2.5">
              <FileText className="size-7 text-emerald-600" />
              Toutes les consultations
              <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {data?.count ?? 0}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Historique global des consultations de l'établissement
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button onClick={() => refetch()} title="Rafraîchir" className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground">
              <RefreshCw className="size-4" />
            </button>
          </div>
        </div>

        <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden mt-2">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base font-semibold">Registre des consultations</CardTitle>
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Rechercher patient, motif..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <RefreshCw className="mx-auto size-5 animate-spin mb-2 text-emerald-600" />
                Chargement des consultations…
              </div>
            ) : data?.results.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                <FileText className="mx-auto size-10 mb-2 opacity-30" />
                <p className="font-medium text-foreground">Aucune consultation trouvée</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-6">Date</th>
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4">Médecin</th>
                      <th className="py-3 px-4">Motif</th>
                      <th className="py-3 px-4">Diagnostic</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {data?.results.map((c) => (
                      <tr key={c.id} className="transition-colors hover:bg-muted/30">
                        <td className="py-3 px-6 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="size-4 text-emerald-500" />
                            <span className="font-medium text-foreground">
                              {new Date(c.date_consultation).toLocaleDateString('fr-FR', {
                                day: '2-digit', month: '2-digit', year: 'numeric'
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <User className="size-3.5 text-muted-foreground" />
                            {c.patient_nom} {c.patient_prenom}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                            <Stethoscope className="size-3.5 text-indigo-500" />
                            {c.medecin_nom}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground truncate max-w-[200px]" title={c.motif}>
                          {c.motif || "-"}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground truncate max-w-[200px]" title={c.diagnostic}>
                          {c.diagnostic || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

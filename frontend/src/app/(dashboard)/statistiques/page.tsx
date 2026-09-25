"use client"

import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { CurrentUser } from "@/components/sidebar"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { 
  BarChart3, 
  Users, 
  Calendar, 
  FileText,
  Activity,
  UserCheck
} from "lucide-react"

interface DashboardStats {
  total_patients: number
  rdv_du_jour: number
  total_consultations: number
  medecins_actifs: number
  activite_medecins: { medecin: string, consultations: number }[]
}

export default function StatistiquesPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardStats>("/accounts/dashboard-stats/")
      return data
    },
  })

  return (
    <div className="flex-1 flex flex-col">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2.5">
            <BarChart3 className="size-7 text-indigo-600" />
            Tableau de Bord
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Indicateurs clés et statistiques de l'établissement
          </p>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <Activity className="mx-auto size-6 animate-pulse mb-2 text-indigo-600" />
            Chargement des statistiques...
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            
            <Card className="border-border/80 shadow-xs">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <Users className="size-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Patients</p>
                    <h3 className="text-2xl font-bold text-foreground">{stats.total_patients}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-xs">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                    <Calendar className="size-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Rendez-vous du jour</p>
                    <h3 className="text-2xl font-bold text-foreground">{stats.rdv_du_jour}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-xs">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                    <FileText className="size-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Consultations</p>
                    <h3 className="text-2xl font-bold text-foreground">{stats.total_consultations}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-xs">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                    <UserCheck className="size-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Médecins Actifs</p>
                    <h3 className="text-2xl font-bold text-foreground">{stats.medecins_actifs}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        ) : null}

        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <Card className="border-border/80 shadow-xs">
              <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
                <CardTitle className="text-base font-semibold">Activité par Médecin (Consultations)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/40">
                  {stats.activite_medecins.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                      <span className="font-medium text-sm text-foreground flex items-center gap-2">
                        <Activity className="size-4 text-indigo-500" />
                        {item.medecin}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                        {item.consultations}
                      </span>
                    </div>
                  ))}
                  {stats.activite_medecins.length === 0 && (
                    <div className="p-8 text-center text-sm text-muted-foreground italic">
                      Aucune donnée disponible.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}

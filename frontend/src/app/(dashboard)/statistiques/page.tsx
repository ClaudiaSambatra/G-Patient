"use client"

import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { 
  BarChart3, 
  Users, 
  Calendar, 
  FileText, 
  Activity, 
  CreditCard,
  UserCheck
} from "lucide-react"

interface DashboardStats {
  total_patients: number
  rdv_du_jour: number
  total_consultations: number
  medecins_actifs: number
  factures_impayees?: number
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
            <BarChart3 className="size-7 text-primary" />
            Tableau de Bord
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Indicateurs clés et statistiques de l&apos;établissement
          </p>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <Activity className="mx-auto size-6 animate-pulse mb-2 text-primary" />
            Chargement des statistiques...
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            
            <Card className="border-border/80 shadow-xs">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 dark:bg-primary/20 rounded-xl">
                    <Users className="size-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Patients inscrits</p>
                    <h3 className="text-2xl font-bold text-foreground mt-1">{stats.total_patients}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-xs">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl">
                    <Calendar className="size-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">RDV aujourd&apos;hui</p>
                    <h3 className="text-2xl font-bold text-foreground mt-1">{stats.rdv_du_jour}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-xs">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl">
                    <FileText className="size-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Consultations</p>
                    <h3 className="text-2xl font-bold text-foreground mt-1">{stats.total_consultations}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-xs">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/10 dark:bg-purple-500/20 rounded-xl">
                    <UserCheck className="size-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Médecins actifs</p>
                    <h3 className="text-2xl font-bold text-foreground mt-1">{stats.medecins_actifs}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-xs">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-rose-500/10 dark:bg-rose-500/20 rounded-xl">
                    <CreditCard className="size-6 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Factures impayées</p>
                    <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                      {stats.factures_impayees ?? 0}
                    </h3>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        ) : null}

        {/* Détail activité médecins */}
        {stats && stats.activite_medecins.length > 0 && (
          <Card className="border-border/80 shadow-xs rounded-2xl overflow-hidden mt-6">
            <CardHeader className="border-b border-border/60 bg-muted/20">
              <CardTitle className="text-base font-semibold">Activité par Médecin</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/40">
                {stats.activite_medecins.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <span className="font-semibold text-foreground">{item.medecin}</span>
                    <span className="text-sm font-medium text-muted-foreground">
                      {item.consultations} consultation{item.consultations > 1 ? 's' : ''} réalisée{item.consultations > 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

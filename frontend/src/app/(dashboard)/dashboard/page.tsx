"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { CurrentUser } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CalendarDots,
  WarningCircle,
  CheckCircle,
  Stethoscope,
  ArrowClockwise,
  Heartbeat,
  UserCheck,
  ShieldCheck,
} from "@phosphor-icons/react"

import {
  AnyDashboardData,
  SecretaireDashboardData,
  MedecinDashboardData,
  AdminDashboardData,
} from "@/components/dashboard/types"
import { SecretaireDashboardView } from "@/components/dashboard/SecretaireDashboardView"
import { MedecinDashboardView } from "@/components/dashboard/MedecinDashboardView"
import { AdminDashboardView } from "@/components/dashboard/AdminDashboardView"

export default function DashboardPage() {
  const queryClient = useQueryClient()
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)

  function showNotification(type: "success" | "error", message: string) {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr))
    }, 4500)
  }

  // Profil utilisateur connecté
  const { data: user, isLoading: userLoading } = useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await apiClient.get<CurrentUser>("/accounts/me/")
      return data
    },
  })

  // Données dynamiques du tableau de bord
  const {
    data: stats,
    isLoading: statsLoading,
    isRefetching,
    refetch,
  } = useQuery<AnyDashboardData>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const { data } = await apiClient.get<AnyDashboardData>("/accounts/dashboard-stats/")
      return data
    },
    refetchInterval: 30000,
  })

  // Mutation rapide pour confirmation présence par la secrétaire
  const confirmPresenceMutation = useMutation({
    mutationFn: async (rdvId: number) => {
      return apiClient.patch(`/rendezvous/${rdvId}/`, { statut: "CONFIRME" })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      queryClient.invalidateQueries({ queryKey: ["rendezvous"] })
      showNotification(
        "success",
        "Présence du patient confirmée avec succès. Il apparaît désormais dans la file d'attente."
      )
    },
    onError: () => {
      showNotification("error", "Impossible de confirmer la présence.")
    },
  })

  const isLoading = userLoading || statsLoading
  const todayFormatted = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center min-h-[60vh] gap-3">
        <Heartbeat size={36} weight="duotone" className="text-primary animate-pulse" />
        <p className="text-sm font-medium text-muted-foreground">Chargement de votre tableau de bord...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Toast de notification flottant */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-5 ${
            notification.type === "success"
              ? "border border-emerald-500/30 bg-emerald-600 text-white"
              : "border border-red-500/30 bg-destructive text-white"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle size={20} weight="duotone" className="shrink-0" />
          ) : (
            <WarningCircle size={20} weight="duotone" className="shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* En-tête personnalisé avec Rôle, Nom et Date */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-5">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {user?.role === "MEDECIN" ? (
                  <>Bonjour, Dr. {user.last_name}</>
                ) : user?.role === "ADMIN" || user?.is_superuser ? (
                  <>Tableau de bord Administrateur</>
                ) : (
                  <>Bonjour, {user?.first_name || user?.username}</>
                )}
              </h1>
              <Badge
                variant="outline"
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                  user?.role === "ADMIN" || user?.is_superuser
                    ? "border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300"
                    : user?.role === "MEDECIN"
                    ? "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                }`}
              >
                {user?.role === "ADMIN" || user?.is_superuser ? (
                  <ShieldCheck size={14} weight="duotone" />
                ) : user?.role === "MEDECIN" ? (
                  <Stethoscope size={14} weight="duotone" />
                ) : (
                  <UserCheck size={14} weight="duotone" />
                )}
                {user?.role === "MEDECIN" ? "Médecin Praticien" : user?.role_display || user?.role}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground capitalize flex items-center gap-1.5" suppressHydrationWarning>
              <CalendarDots size={16} weight="duotone" className="text-muted-foreground" />
              {todayFormatted}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="gap-2 text-xs h-9 cursor-pointer"
              title="Actualiser les données"
            >
              <ArrowClockwise size={16} weight="bold" className={`${isRefetching ? "animate-spin text-primary" : ""}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* RENDU SELON LE RÔLE */}
        {user?.role === "SECRETAIRE" && stats?.role === "SECRETAIRE" && (
          <SecretaireDashboardView
            stats={stats as SecretaireDashboardData}
            onConfirmPresence={(rdvId) => confirmPresenceMutation.mutate(rdvId)}
            confirmingId={confirmPresenceMutation.isPending ? (confirmPresenceMutation.variables as number) : null}
          />
        )}

        {user?.role === "MEDECIN" && stats?.role === "MEDECIN" && (
          <MedecinDashboardView stats={stats as MedecinDashboardData} />
        )}

        {(user?.role === "ADMIN" || user?.is_superuser) && stats?.role === "ADMIN" && (
          <AdminDashboardView stats={stats as AdminDashboardData} />
        )}
      </main>
    </div>
  )
}

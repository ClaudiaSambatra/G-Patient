"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { CurrentUser } from "@/components/sidebar"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  CalendarDots,
  ClipboardText,
  ClockCountdown,
  WarningCircle,
  CheckCircle,
  CreditCard,
  UserPlus,
  Stethoscope,
  TrendUp,
  ArrowClockwise,
  Heartbeat,
  Warning,
  UserCheck,
  CalendarCheck,
  CaretRight,
  Eye,
  Receipt,
  ShieldCheck,
} from "@phosphor-icons/react"

// Types pour les tableaux de bord
interface SecretaireDashboardData {
  role: "SECRETAIRE"
  total_patients: number
  nouveaux_patients_jour: number
  rdv_du_jour: number
  patients_en_attente: number
  rdv_a_confirmer: number
  consultations_realisees_jour: number
  factures_du_jour: number
  paiements_du_jour: number
  rdv_jour_liste: Array<{
    id: number
    heure: string
    patient_id: number
    patient_nom: string
    medecin_id: number
    medecin_nom: string
    type: string
    type_display: string
    statut: "PLANIFIE" | "CONFIRME" | "TERMINE" | "ANNULE"
    statut_display: string
    statut_paiement: "PAYE" | "IMPAYE" | "GRATUIT"
    motif: string
    consultation_id: number | null
    facture_id: number | null
  }>
  derniers_patients: Array<{
    id: number
    nom: string
    prenom: string
    contact: string
    date_creation: string
    age: number | null
    sexe: string
  }>
}

interface MedecinDashboardData {
  role: "MEDECIN"
  rdv_du_jour: number
  patients_en_attente: number
  consultations_jour: number
  total_consultations: number
  suivis_recommandes_actifs: number
  suivis_programmes_a_venir: number
  suivis_realises: number
  patients_a_recevoir: Array<{
    rdv_id: number
    heure: string
    patient_id: number
    patient_nom: string
    patient_age: number | null
    patient_sexe: string
    type: string
    type_display: string
    statut: string
    statut_display: string
    motif: string
    en_attente: boolean
    consultation_terminee: boolean
    consultation_id: number | null
  }>
  prochains_suivis: Array<{
    id: number
    heure: string
    patient_id: number
    patient_nom: string
    motif: string
    statut: string
    statut_display: string
  }>
  suivis_en_attente_retour: Array<{
    consultation_id: number
    patient_id: number
    patient_nom: string
    date_consultation: string
    date_suivi_recommandee: string | null
    motif_suivi: string
  }>
}

interface AdminDashboardData {
  role: "ADMIN"
  total_patients: number
  total_rdv: number
  rdv_du_jour: number
  total_consultations: number
  total_factures: number
  total_encaisse: number
  total_impaye: number
  taux_recouvrement: number
  factures_impayees: number
  medecins_actifs: number
  medecins_presents_jour: number
  evolution_consultations: Array<{
    date: string
    label: string
    total: number
  }>
  repartition_rdv: Array<{
    statut: string
    label: string
    count: number
    color: string
  }>
  activite_medecins: Array<{
    id: number
    medecin: string
    specialite: string
    consultations: number
    rdv_jour: number
    absent: boolean
  }>
  dernieres_activites: Array<{
    id: string
    type: "CONSULTATION" | "PATIENT" | "PAIEMENT"
    titre: string
    description: string
    date: string
    lien: string
  }>
}

type AnyDashboardData = SecretaireDashboardData | MedecinDashboardData | AdminDashboardData

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
      showNotification("success", "Présence du patient confirmée avec succès. Il apparaît désormais dans la file d'attente.")
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
              className="gap-2 text-xs h-9"
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

// =========================================================================
// 1. VUE TABLEAU DE BORD SECRÉTAIRE
// =========================================================================
function SecretaireDashboardView({
  stats,
  onConfirmPresence,
  confirmingId,
}: {
  stats: SecretaireDashboardData
  onConfirmPresence: (rdvId: number) => void
  confirmingId: number | null
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* 8 Cartes Statistiques Métier avec icônes Phosphor Duotone */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-4">
        {/* Total Patients */}
        <Card className="border-border/80 shadow-xs hover:border-primary/40 transition-colors">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">Patients enregistrés</span>
              <span className="text-2xl font-bold tracking-tight text-foreground mt-1">
                {stats.total_patients}
              </span>
            </div>
            <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-xs">
              <Users size={24} weight="duotone" />
            </div>
          </CardContent>
        </Card>

        {/* Nouveaux Patients du Jour */}
        <Card className="border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">Nouveaux ajd.</span>
              <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
                +{stats.nouveaux_patients_jour}
              </span>
            </div>
            <div className="size-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
              <UserPlus size={24} weight="duotone" />
            </div>
          </CardContent>
        </Card>

        {/* RDV du jour */}
        <Card className="border-border/80 shadow-xs hover:border-blue-500/40 transition-colors">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">RDV du jour</span>
              <span className="text-2xl font-bold tracking-tight text-foreground mt-1">
                {stats.rdv_du_jour}
              </span>
            </div>
            <div className="size-11 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xs">
              <CalendarDots size={24} weight="duotone" />
            </div>
          </CardContent>
        </Card>

        {/* Patients en attente */}
        <Card className={`border-border/80 shadow-xs transition-colors ${
          stats.patients_en_attente > 0 ? "border-amber-500/40 bg-amber-50/20 dark:bg-amber-950/10" : ""
        }`}>
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                En salle d&apos;attente
                {stats.patients_en_attente > 0 && (
                  <span className="size-2 rounded-full bg-amber-500 animate-ping inline-block" />
                )}
              </span>
              <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 mt-1">
                {stats.patients_en_attente}
              </span>
            </div>
            <div className="size-11 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs">
              <ClockCountdown size={24} weight="duotone" />
            </div>
          </CardContent>
        </Card>

        {/* RDV à confirmer */}
        <Card className="border-border/80 shadow-xs hover:border-sky-500/40 transition-colors">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">À confirmer</span>
              <span className="text-2xl font-bold tracking-tight text-sky-600 dark:text-sky-400 mt-1">
                {stats.rdv_a_confirmer}
              </span>
            </div>
            <div className="size-11 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-xs">
              <WarningCircle size={24} weight="duotone" />
            </div>
          </CardContent>
        </Card>

        {/* Consultations réalisées */}
        <Card className="border-border/80 shadow-xs hover:border-indigo-500/40 transition-colors">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">Consultations ajd.</span>
              <span className="text-2xl font-bold tracking-tight text-foreground mt-1">
                {stats.consultations_realisees_jour}
              </span>
            </div>
            <div className="size-11 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
              <ClipboardText size={24} weight="duotone" />
            </div>
          </CardContent>
        </Card>

        {/* Factures du jour */}
        <Card className="border-border/80 shadow-xs hover:border-slate-400 transition-colors">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">Factures émises</span>
              <span className="text-2xl font-bold tracking-tight text-foreground mt-1">
                {stats.factures_du_jour}
              </span>
            </div>
            <div className="size-11 rounded-xl bg-muted flex items-center justify-center text-foreground shadow-xs">
              <Receipt size={24} weight="duotone" />
            </div>
          </CardContent>
        </Card>

        {/* Paiements encaissés aujourd'hui */}
        <Card className="border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">Encaissé ajd.</span>
              <span className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
                {stats.paiements_du_jour.toLocaleString("fr-FR")} Ar
              </span>
            </div>
            <div className="size-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
              <CreditCard size={24} weight="duotone" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2 Colonnes : Liste des RDV du jour & Nouveaux patients */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste chronologique des RDV du jour */}
        <Card className="lg:col-span-2 border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarDots size={20} weight="duotone" className="text-primary" />
                Rendez-vous du jour
                <span className="text-xs font-normal text-muted-foreground">
                  ({stats.rdv_jour_liste.length})
                </span>
              </CardTitle>
              <Link href="/rendezvous" className="text-xs text-primary hover:underline flex items-center gap-1">
                Voir tout le planning <CaretRight size={14} weight="bold" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {stats.rdv_jour_liste.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center">
                <CalendarCheck size={40} weight="duotone" className="mb-2 text-muted-foreground/60" />
                Aucun rendez-vous prévu pour aujourd&apos;hui.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-muted/40 text-[11px] font-semibold uppercase text-muted-foreground tracking-wider border-b border-border/60">
                    <tr>
                      <th className="py-2.5 px-4">Heure</th>
                      <th className="py-2.5 px-4">Patient</th>
                      <th className="py-2.5 px-4 hidden sm:table-cell">Médecin</th>
                      <th className="py-2.5 px-3">Statut</th>
                      <th className="py-2.5 px-3">Paiement</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {stats.rdv_jour_liste.map((rdv) => (
                      <tr key={rdv.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-foreground whitespace-nowrap">
                          {rdv.heure}
                        </td>
                        <td className="py-3 px-4">
                          <Link
                            href={`/patients/${rdv.patient_id}`}
                            className="font-medium text-foreground hover:text-primary hover:underline"
                          >
                            {rdv.patient_nom}
                          </Link>
                          {rdv.type === "CONTROLE" && (
                            <span className="block text-[10px] text-cyan-600 dark:text-cyan-400 font-medium">
                              Visite de contrôle
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground hidden sm:table-cell truncate max-w-[150px]">
                          {rdv.medecin_nom}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              rdv.statut === "CONFIRME"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                : rdv.statut === "PLANIFIE"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                : rdv.statut === "TERMINE"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                            }`}
                          >
                            {rdv.statut_display}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              rdv.statut_paiement === "PAYE"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                                : rdv.statut_paiement === "GRATUIT"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300"
                            }`}
                          >
                            {rdv.statut_paiement}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {rdv.statut === "PLANIFIE" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onConfirmPresence(rdv.id)}
                              disabled={confirmingId === rdv.id}
                              className="h-7 text-xs border-amber-500/50 text-amber-700 hover:bg-amber-50 dark:text-amber-400 gap-1"
                              title="Valider l'arrivée du patient indépendamment du paiement"
                            >
                              {confirmingId === rdv.id ? (
                                <ArrowClockwise size={12} className="animate-spin" />
                              ) : (
                                <UserCheck size={14} weight="duotone" />
                              )}
                              Confirmer présence
                            </Button>
                          ) : rdv.statut_paiement === "IMPAYE" ? (
                            <Link href={`/factures?search=${encodeURIComponent(rdv.patient_nom)}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-rose-500/50 text-rose-700 hover:bg-rose-50 dark:text-rose-400 gap-1"
                              >
                                <CreditCard size={14} weight="duotone" />
                                Encaisser
                              </Button>
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Derniers patients enregistrés */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users size={20} weight="duotone" className="text-primary" />
                Derniers inscrits
              </CardTitle>
              <Link href="/patients" className="text-xs text-primary hover:underline">
                Tous les patients
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {stats.derniers_patients.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Aucun patient enregistré récemment.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {stats.derniers_patients.map((patient) => (
                  <Link
                    key={patient.id}
                    href={`/patients/${patient.id}`}
                    className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {patient.nom} {patient.prenom}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {patient.age ? `${patient.age} ans` : "Âge non précisé"} • {patient.sexe === "F" ? "Femme" : "Homme"}
                      </span>
                      {patient.contact && (
                        <span className="text-[11px] text-muted-foreground/80 font-mono">
                          {patient.contact}
                        </span>
                      )}
                    </div>
                    <CaretRight size={16} weight="bold" className="text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// =========================================================================
// 2. VUE TABLEAU DE BORD MÉDECIN (Confidentialité et orientation clinique)
// =========================================================================
function MedecinDashboardView({ stats }: { stats: MedecinDashboardData }) {
  return (
    <div className="flex flex-col gap-6">
      {/* 6 Cartes Indicateurs Praticien avec Phosphor Duotone */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
        {/* Mes RDV du jour */}
        <Card className="border-border/80 shadow-xs hover:border-blue-500/40 transition-colors">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">RDV du jour</span>
              <div className="size-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-xs">
                <CalendarDots size={20} weight="duotone" />
              </div>
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {stats.rdv_du_jour}
            </span>
          </CardContent>
        </Card>

        {/* En salle d'attente (Focus praticien) */}
        <Card className={`border-border/80 shadow-xs transition-colors ${
          stats.patients_en_attente > 0 ? "border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/20" : ""
        }`}>
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                En attente
                {stats.patients_en_attente > 0 && (
                  <span className="size-2 rounded-full bg-amber-500 animate-ping inline-block" />
                )}
              </span>
              <div className="size-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shadow-xs">
                <ClockCountdown size={20} weight="duotone" />
              </div>
            </div>
            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {stats.patients_en_attente}
            </span>
          </CardContent>
        </Card>

        {/* Consultations aujourd'hui */}
        <Card className="border-border/80 shadow-xs hover:border-emerald-500/40 transition-colors">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Consultés ajd.</span>
              <div className="size-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-xs">
                <Stethoscope size={20} weight="duotone" />
              </div>
            </div>
            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.consultations_jour}
            </span>
          </CardContent>
        </Card>

        {/* Total Consultations (Historique) */}
        <Card className="border-border/80 shadow-xs hover:border-indigo-500/40 transition-colors">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Total actes</span>
              <div className="size-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 shadow-xs">
                <ClipboardText size={20} weight="duotone" />
              </div>
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {stats.total_consultations}
            </span>
          </CardContent>
        </Card>

        {/* Suivis recommandés actifs */}
        <Card className="border-border/80 shadow-xs hover:border-purple-500/40 transition-colors">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground" title="Recommandations de suivi en attente de retour patient">
                Suivis recommandés
              </span>
              <div className="size-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 shadow-xs">
                <Heartbeat size={20} weight="duotone" />
              </div>
            </div>
            <span className="text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
              {stats.suivis_recommandes_actifs}
            </span>
          </CardContent>
        </Card>

        {/* Suivis programmés à venir (RDVs de contrôle) */}
        <Card className="border-border/80 shadow-xs hover:border-cyan-500/40 transition-colors">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground" title="Visites de contrôle déjà planifiées dans l'agenda">
                Contrôles à venir
              </span>
              <div className="size-9 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-600 shadow-xs">
                <CalendarCheck size={20} weight="duotone" />
              </div>
            </div>
            <span className="text-2xl font-bold tracking-tight text-cyan-600 dark:text-cyan-400">
              {stats.suivis_programmes_a_venir}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* File d'attente et consultation du jour */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Stethoscope size={20} weight="duotone" className="text-primary" />
                File active des patients du jour
                <span className="text-xs font-normal text-muted-foreground">
                  ({stats.patients_a_recevoir.length})
                </span>
              </CardTitle>
              <Link href="/consultations" className="text-xs text-primary hover:underline flex items-center gap-1">
                Historique des consultations <CaretRight size={14} weight="bold" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {stats.patients_a_recevoir.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center">
                <CalendarCheck size={40} weight="duotone" className="mb-2 text-muted-foreground/60" />
                Aucun patient à recevoir aujourd&apos;hui.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {stats.patients_a_recevoir.map((item) => (
                  <div
                    key={item.rdv_id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      item.en_attente
                        ? "bg-amber-50/40 dark:bg-amber-950/10 border-l-4 border-l-amber-500"
                        : item.consultation_terminee
                        ? "bg-muted/10 opacity-75"
                        : "hover:bg-muted/20"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="flex flex-col items-center justify-center min-w-[50px] p-2 rounded-lg bg-background border border-border text-center">
                        <span className="text-xs font-bold text-foreground">{item.heure}</span>
                        <span className="text-[10px] text-muted-foreground">{item.type_display}</span>
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/patients/${item.patient_id}`}
                            className="font-semibold text-foreground hover:text-primary hover:underline text-sm sm:text-base"
                          >
                            {item.patient_nom}
                          </Link>
                          {item.en_attente && (
                            <Badge className="bg-amber-500 text-white hover:bg-amber-600 text-[10px] py-0">
                              En salle d&apos;attente
                            </Badge>
                          )}
                          {item.consultation_terminee && (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-500 text-[10px] py-0">
                              Consulté
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.patient_age ? `${item.patient_age} ans` : "Âge non renseigné"} •{" "}
                          {item.patient_sexe === "F" ? "Féminin" : "Masculin"}
                          {item.motif ? ` • Motif : ${item.motif}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Link href={`/patients/${item.patient_id}`}>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" title="Consulter le dossier médical">
                          <Eye size={14} weight="duotone" />
                          Dossier
                        </Button>
                      </Link>

                      {item.consultation_terminee ? (
                        <Link href="/consultations">
                          <Button size="sm" variant="secondary" className="h-8 text-xs gap-1.5 text-muted-foreground">
                            <CheckCircle size={14} weight="duotone" className="text-emerald-500" />
                            Voir acte
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/rendezvous?search=${encodeURIComponent(item.patient_nom)}`}>
                          <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground shadow-xs">
                            <Stethoscope size={14} weight="duotone" />
                            Démarrer consultation
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Colonne latérale Praticien : Suivis & Visites de Contrôle */}
        <div className="flex flex-col gap-6">
          {/* Prochaines Visites de Contrôle Programmées */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarCheck size={18} weight="duotone" className="text-cyan-600" />
                Contrôles programmés à venir
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {stats.prochains_suivis.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Aucune visite de contrôle planifiée prochainement.
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {stats.prochains_suivis.map((suivi) => (
                    <div key={suivi.id} className="p-3 flex items-center justify-between text-xs">
                      <div className="flex flex-col">
                        <Link
                          href={`/patients/${suivi.patient_id}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {suivi.patient_nom}
                        </Link>
                        <span className="text-[11px] text-muted-foreground mt-0.5">
                          {suivi.heure} • {suivi.motif}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {suivi.statut_display}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Suivis Recommandés en attente de retour patient */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ClockCountdown size={18} weight="duotone" className="text-purple-600" />
                Suivis recommandés actifs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {stats.suivis_en_attente_retour.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Aucun suivi en attente de retour.
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {stats.suivis_en_attente_retour.map((item) => (
                    <div key={item.consultation_id} className="p-3 flex flex-col gap-1 text-xs">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/patients/${item.patient_id}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {item.patient_nom}
                        </Link>
                        {item.date_suivi_recommandee && (
                          <span className="text-[10px] font-mono bg-purple-500/10 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">
                            Recommandé : {item.date_suivi_recommandee}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground line-clamp-1">
                        Motif : {item.motif_suivi}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// =========================================================================
// 3. VUE TABLEAU DE BORD ADMINISTRATEUR (Vue clinique globale & finances)
// =========================================================================
function AdminDashboardView({ stats }: { stats: AdminDashboardData }) {
  const maxCons = Math.max(1, ...stats.evolution_consultations.map((d) => d.total))

  return (
    <div className="flex flex-col gap-6">
      {/* 8 Indicateurs Globaux Clinique & Finances avec Phosphor Duotone */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-4">
        {/* Total Patients */}
        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">Patients inscrits</span>
              <span className="text-2xl font-bold tracking-tight text-foreground mt-1">
                {stats.total_patients}
              </span>
            </div>
            <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-xs">
              <Users size={24} weight="duotone" />
            </div>
          </CardContent>
        </Card>

        {/* Total Consultations */}
        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">Total Consultations</span>
              <span className="text-2xl font-bold tracking-tight text-foreground mt-1">
                {stats.total_consultations}
              </span>
            </div>
            <div className="size-11 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 shadow-xs">
              <ClipboardText size={24} weight="duotone" />
            </div>
          </CardContent>
        </Card>

        {/* Total Encaissé */}
        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">Recettes encaissées</span>
              <span className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
                {stats.total_encaisse.toLocaleString("fr-FR")} Ar
              </span>
            </div>
            <div className="size-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-xs">
              <CreditCard size={24} weight="duotone" />
            </div>
          </CardContent>
        </Card>

        {/* Reste à recouvrer / Impayés */}
        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">Reste à recouvrer</span>
              <span className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400 mt-1">
                {stats.total_impaye.toLocaleString("fr-FR")} Ar
              </span>
            </div>
            <div className="size-11 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 shadow-xs">
              <Warning size={24} weight="duotone" />
            </div>
          </CardContent>
        </Card>

        {/* Taux de Recouvrement */}
        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">Taux recouvrement</span>
              <span className="text-sm font-bold text-foreground">{stats.taux_recouvrement}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, stats.taux_recouvrement))}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Total Rendez-vous */}
        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">Total RDV</span>
              <span className="text-2xl font-bold tracking-tight text-foreground mt-1">
                {stats.total_rdv}
              </span>
            </div>
            <div className="size-11 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-xs">
              <CalendarDots size={24} weight="duotone" />
            </div>
          </CardContent>
        </Card>

        {/* Factures impayées (nombre) */}
        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">Factures impayées</span>
              <span className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 mt-1">
                {stats.factures_impayees}
              </span>
            </div>
            <div className="size-11 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 shadow-xs">
              <Receipt size={24} weight="duotone" />
            </div>
          </CardContent>
        </Card>

        {/* Corps Médical Présent */}
        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">Médecins présents ajd.</span>
              <span className="text-2xl font-bold tracking-tight text-foreground mt-1">
                {stats.medecins_presents_jour} / {stats.medecins_actifs}
              </span>
            </div>
            <div className="size-11 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 shadow-xs">
              <UserCheck size={24} weight="duotone" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques visuels d'analyse */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Évolution des consultations sur 14 jours */}
        <Card className="lg:col-span-2 border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendUp size={20} weight="duotone" className="text-primary" />
                Évolution des consultations (14 derniers jours)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-48 w-full flex items-end gap-2 sm:gap-3 pt-6 pb-2">
              {stats.evolution_consultations.map((item, idx) => {
                const heightPercent = maxCons > 0 ? (item.total / maxCons) * 100 : 0
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[10px] font-semibold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.total}
                    </span>
                    <div className="w-full bg-primary/20 dark:bg-primary/30 rounded-t-sm group-hover:bg-primary transition-colors relative flex items-end justify-center min-h-[4px]" style={{ height: `${Math.max(4, heightPercent)}%` }}>
                      {item.total > 0 && (
                        <div className="absolute top-1 size-1 rounded-full bg-white opacity-80" />
                      )}
                    </div>
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate font-mono">
                      {item.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Répartition des statuts de Rendez-vous */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CalendarDots size={20} weight="duotone" className="text-primary" />
              Répartition des rendez-vous
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex flex-col justify-center gap-4">
            <div className="flex flex-col gap-3">
              {stats.repartition_rdv.map((item) => (
                <div key={item.statut} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.label}
                    </span>
                    <span className="font-semibold text-foreground">
                      {item.count} ({stats.total_rdv > 0 ? Math.round((item.count / stats.total_rdv) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        backgroundColor: item.color,
                        width: `${stats.total_rdv > 0 ? (item.count / stats.total_rdv) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activité par médecin & Dernières activités clinique */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tableau Activité des Médecins */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Stethoscope size={20} weight="duotone" className="text-primary" />
                Corps Médical & Activité
              </CardTitle>
              <Link href="/utilisateurs" className="text-xs text-primary hover:underline">
                Gestion praticiens
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {stats.activite_medecins.map((med) => (
                <div key={med.id} className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground text-sm">{med.medecin}</span>
                    <span className="text-xs text-muted-foreground">{med.specialite}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs font-semibold text-foreground block">
                        {med.consultations} consultation{med.consultations > 1 ? "s" : ""}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {med.rdv_jour} RDV ajd.
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        med.absent
                          ? "border-rose-500 text-rose-600 bg-rose-50 dark:bg-rose-950/20"
                          : "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20"
                      }`}
                    >
                      {med.absent ? "Absent" : "Présent"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dernières activités de la clinique */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Heartbeat size={20} weight="duotone" className="text-primary" />
              Activités récentes de l&apos;établissement
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {stats.dernieres_activites.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Aucune activité récente enregistrée.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {stats.dernieres_activites.map((act) => (
                  <Link
                    key={act.id}
                    href={act.lien}
                    className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`size-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                          act.type === "CONSULTATION"
                            ? "bg-indigo-500/10 text-indigo-600"
                            : act.type === "PAIEMENT"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-blue-500/10 text-blue-600"
                        }`}
                      >
                        {act.type === "CONSULTATION" ? (
                          <Stethoscope size={18} weight="duotone" />
                        ) : act.type === "PAIEMENT" ? (
                          <CreditCard size={18} weight="duotone" />
                        ) : (
                          <UserPlus size={18} weight="duotone" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          {act.titre}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{act.description}</span>
                      </div>
                    </div>
                    <CaretRight size={16} weight="bold" className="text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

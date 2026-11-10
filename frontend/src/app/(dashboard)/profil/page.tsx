"use client"

import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { CurrentUser } from "@/components/sidebar"
import { Loader2 } from "lucide-react"
import { ProfilePhotoCard } from "@/components/profil/ProfilePhotoCard"
import { InformationsPersonnellesCard } from "@/components/profil/InformationsPersonnellesCard"
import { MotDePasseCard } from "@/components/profil/MotDePasseCard"

export default function ProfilPage() {
  const {
    data: user,
    isLoading: isUserLoading,
    isError: isUserError,
  } = useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await apiClient.get<CurrentUser>("/accounts/me/")
      return data
    },
    retry: false,
  })

  if (isUserLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm">Chargement du profil...</p>
        </div>
      </div>
    )
  }

  if (isUserError || !user) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center max-w-md">
          <p className="text-sm font-medium text-red-800">
            Impossible de charger votre profil. Veuillez vous reconnecter.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-50/50 dark:bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1020px] mx-auto w-full space-y-6">
        {/* 1. En-tête de page */}
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Mon profil
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gérez vos informations personnelles et les détails de votre compte
          </p>
        </div>

        {/* 2. Carte Photo (Pleine largeur) */}
        <ProfilePhotoCard user={user} />

        {/* 3 & 4. Cartes Informations personnelles et Mot de passe Côte à Côte */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <InformationsPersonnellesCard user={user} />
          <MotDePasseCard />
        </div>
      </div>
    </div>
  )
}

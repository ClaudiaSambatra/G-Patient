"use client"

import { useState, useRef, useEffect } from "react"
import axios from "axios"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { CurrentUser } from "@/components/sidebar"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/toast"
import { Camera, Eye, EyeOff, Loader2 } from "lucide-react"

function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data
    if (typeof data === "string") return data
    if (data.detail && typeof data.detail === "string") return data.detail
    if (data.message && typeof data.message === "string") return data.message
    if (data.error && typeof data.error === "string") return data.error
    if (typeof data === "object") {
      const messages: string[] = []
      for (const [key, val] of Object.entries(data)) {
        const valStr = Array.isArray(val) ? val.join(" ") : String(val)
        messages.push(`${key}: ${valStr}`)
      }
      if (messages.length > 0) return messages.join(" | ")
    }
  }
  return fallback
}

export default function ProfilPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

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

  // Photo
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  // Upload photo immédiat dès sélection
  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append("photo", file)
      const { data } = await apiClient.patch<CurrentUser>("/accounts/me/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], data)
      queryClient.invalidateQueries({ queryKey: ["me"] })
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(null)
      toast({
        type: "success",
        message: "Photo de profil mise à jour avec succès.",
      })
    },
    onError: (err) => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      toast({
        type: "error",
        message: extractErrorMessage(err, "Impossible de téléverser la photo."),
      })
    },
  })

  // Suppression photo
  const deletePhotoMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete("/accounts/me/photo/")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] })
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      toast({
        type: "success",
        message: "Photo de profil supprimée.",
      })
    },
    onError: (err) => {
      toast({
        type: "error",
        message: extractErrorMessage(err, "Erreur lors de la suppression de la photo."),
      })
    },
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validation taille (max 2 Mo)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        type: "error",
        message: "La photo dépasse la taille maximale autorisée de 2 Mo.",
      })
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    // Validation format
    const allowed = ["image/jpeg", "image/png", "image/webp"]
    if (!allowed.includes(file.type)) {
      toast({
        type: "error",
        message: "Format d'image non supporté. Seuls JPEG, PNG et WebP sont autorisés.",
      })
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    // Aperçu immédiat puis envoi
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    uploadPhotoMutation.mutate(file)
  }

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

  const displayPhoto = previewUrl || user.photo
  const initials = (
    (user.first_name?.[0] || user.username[0] || "U") +
    (user.last_name?.[0] || "")
  ).toUpperCase()

  const roleDisplay =
    user.role_display ||
    (user.role === "ADMIN"
      ? "Administrateur"
      : user.role === "MEDECIN"
        ? "Médecin"
        : "Secrétaire")

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
        <Card className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* À gauche : Avatar 56px, nom complet en gras, rôle en gris */}
            <div className="flex items-center gap-4">
              <Avatar className="size-14 rounded-full border border-slate-200 dark:border-border shrink-0">
                {displayPhoto ? (
                  <AvatarImage
                    src={displayPhoto}
                    alt={user.full_name || user.username}
                  />
                ) : (
                  <AvatarFallback className="bg-slate-100 dark:bg-muted text-slate-700 dark:text-slate-200 font-bold text-base">
                    {initials}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <h2 className="font-bold text-base text-slate-900 dark:text-slate-100 leading-tight">
                  {user.full_name || user.username}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {roleDisplay}
                </p>
              </div>
            </div>

            {/* À droite : Bouton outline Changer la photo + petit bouton Supprimer si photo existe */}
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
                id="profile-photo-input"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg gap-2 text-xs font-medium border-slate-300 dark:border-border text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-muted"
                disabled={uploadPhotoMutation.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadPhotoMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin text-slate-500" />
                ) : (
                  <Camera className="size-3.5 text-slate-500 dark:text-slate-400" />
                )}
                Changer la photo
              </Button>

              {user.photo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-lg text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                  disabled={deletePhotoMutation.isPending || uploadPhotoMutation.isPending}
                  onClick={() => deletePhotoMutation.mutate()}
                >
                  {deletePhotoMutation.isPending && (
                    <Loader2 className="size-3 animate-spin mr-1" />
                  )}
                  Supprimer
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* 3 & 4. Cartes Informations personnelles et Mot de passe Côte à Côte */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* 3. Carte Informations personnelles */}
          <InformationsPersonnellesCard user={user} />

          {/* 4. Carte Mot de passe */}
          <MotDePasseCard />
        </div>
      </div>
    </div>
  )
}

/**
 * 3. Carte « Informations personnelles »
 * Fond gris très clair pour le titre, corps blanc, coins arrondis.
 * Champs : Prénom, Nom, Adresse e-mail (lecture seule), Téléphone.
 * Bouton principal « Enregistrer les modifications », désactivé tant que rien n'a changé.
 */
function InformationsPersonnellesCard({
  user,
}: {
  user: CurrentUser
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [firstName, setFirstName] = useState(user.first_name || "")
  const [lastName, setLastName] = useState(user.last_name || "")
  const [telephone, setTelephone] = useState(user.telephone || "")

  const [fieldErrors, setFieldErrors] = useState<{
    first_name?: string
    last_name?: string
    telephone?: string
  }>({})

  // Détection des modifications : bouton désactivé tant que rien n'a changé
  const hasChanges =
    firstName.trim() !== (user.first_name || "").trim() ||
    lastName.trim() !== (user.last_name || "").trim() ||
    telephone.trim() !== (user.telephone || "").trim()

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: {
      first_name: string
      last_name: string
      telephone: string
    }) => {
      const { data } = await apiClient.patch<CurrentUser>("/accounts/me/", payload)
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], data)
      queryClient.invalidateQueries({ queryKey: ["me"] })
      setFieldErrors({})
      toast({
        type: "success",
        message: "Vos modifications ont été enregistrées avec succès.",
      })
    },
    onError: (err) => {
      if (axios.isAxiosError(err) && err.response?.data) {
        const data = err.response.data
        const newErrors: { first_name?: string; last_name?: string; telephone?: string } = {}
        if (data.first_name) {
          newErrors.first_name = Array.isArray(data.first_name) ? data.first_name.join(" ") : String(data.first_name)
        }
        if (data.last_name) {
          newErrors.last_name = Array.isArray(data.last_name) ? data.last_name.join(" ") : String(data.last_name)
        }
        if (data.telephone) {
          newErrors.telephone = Array.isArray(data.telephone) ? data.telephone.join(" ") : String(data.telephone)
        }
        setFieldErrors(newErrors)
      }
      toast({
        type: "error",
        message: extractErrorMessage(err, "Impossible d'enregistrer les modifications."),
      })
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldErrors({})

    updateProfileMutation.mutate({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      telephone: telephone.trim(),
    })
  }

  return (
    <Card className="flex flex-col h-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card overflow-hidden shadow-xs">
      {/* Titre sur fond gris très clair */}
      <CardHeader className="bg-slate-50/80 dark:bg-muted/30 px-6 py-4 border-b border-slate-200 dark:border-border">
        <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Informations personnelles
        </CardTitle>
      </CardHeader>

      {/* Corps blanc */}
      <CardContent className="p-6 flex flex-col flex-1">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 justify-between space-y-5">
          <div className="space-y-4">
            {/* Ligne 1 : Prénom et Nom côte à côte */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Prénom */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="profile-first-name"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Prénom
                </Label>
                <Input
                  id="profile-first-name"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value)
                    if (fieldErrors.first_name) {
                      setFieldErrors((prev) => ({ ...prev, first_name: undefined }))
                    }
                  }}
                  placeholder="Votre prénom"
                  className="rounded-lg border-slate-200 dark:border-border text-sm"
                />
                {fieldErrors.first_name && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                    {fieldErrors.first_name}
                  </p>
                )}
              </div>

              {/* Nom */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="profile-last-name"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Nom
                </Label>
                <Input
                  id="profile-last-name"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value)
                    if (fieldErrors.last_name) {
                      setFieldErrors((prev) => ({ ...prev, last_name: undefined }))
                    }
                  }}
                  placeholder="Votre nom"
                  className="rounded-lg border-slate-200 dark:border-border text-sm"
                />
                {fieldErrors.last_name && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                    {fieldErrors.last_name}
                  </p>
                )}
              </div>
            </div>

            {/* Adresse e-mail (lecture seule, grisée) */}
            <div className="space-y-1.5">
              <Label
                htmlFor="profile-email"
                className="text-xs font-semibold text-slate-500 dark:text-slate-400"
              >
                Adresse e-mail (lecture seule)
              </Label>
              <Input
                id="profile-email"
                value={user.email}
                disabled
                readOnly
                className="rounded-lg border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/40 text-slate-500 dark:text-slate-400 cursor-not-allowed text-sm"
              />
            </div>

            {/* Téléphone */}
            <div className="space-y-1.5">
              <Label
                htmlFor="profile-telephone"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Téléphone
              </Label>
              <Input
                id="profile-telephone"
                value={telephone}
                onChange={(e) => {
                  setTelephone(e.target.value)
                  if (fieldErrors.telephone) {
                    setFieldErrors((prev) => ({ ...prev, telephone: undefined }))
                  }
                }}
                placeholder="034 00 000 00"
                className="rounded-lg border-slate-200 dark:border-border text-sm"
              />
              {fieldErrors.telephone && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                  {fieldErrors.telephone}
                </p>
              )}
            </div>
          </div>

          {/* En bas à droite : Bouton principal arrondi */}
          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-border/60">
            <Button
              type="submit"
              disabled={!hasChanges || updateProfileMutation.isPending}
              className="rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 text-sm font-medium px-5 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer les modifications"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

/**
 * 4. Carte « Mot de passe »
 * Même style que la carte 3 (titre fond gris très clair, corps blanc).
 * Champs : Mot de passe actuel, Nouveau mot de passe, Confirmation (bouton œil afficher/masquer).
 * Erreurs de validation sous le champ en rouge.
 * Bouton « Changer le mot de passe » en bas à droite avec indicateur de chargement.
 */
function MotDePasseCard() {
  const { toast } = useToast()

  const [ancienMotDePasse, setAncienMotDePasse] = useState("")
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("")
  const [confirmation, setConfirmation] = useState("")

  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [errors, setErrors] = useState<{
    ancien?: string
    nouveau?: string
    confirmation?: string
  }>({})

  const changePasswordMutation = useMutation({
    mutationFn: async (payload: {
      ancien_mot_de_passe: string
      nouveau_mot_de_passe: string
      confirmation: string
    }) => {
      const { data } = await apiClient.post("/accounts/me/change-password/", payload)
      return data
    },
    onSuccess: () => {
      setAncienMotDePasse("")
      setNouveauMotDePasse("")
      setConfirmation("")
      setErrors({})
      toast({
        type: "success",
        message: "Votre mot de passe a été modifié avec succès.",
      })
    },
    onError: (err) => {
      if (axios.isAxiosError(err) && err.response?.data) {
        const data = err.response.data
        const newErrors: { ancien?: string; nouveau?: string; confirmation?: string } = {}
        if (data.ancien_mot_de_passe) {
          newErrors.ancien = Array.isArray(data.ancien_mot_de_passe)
            ? data.ancien_mot_de_passe.join(" ")
            : String(data.ancien_mot_de_passe)
        }
        if (data.nouveau_mot_de_passe) {
          newErrors.nouveau = Array.isArray(data.nouveau_mot_de_passe)
            ? data.nouveau_mot_de_passe.join(" ")
            : String(data.nouveau_mot_de_passe)
        }
        if (data.confirmation) {
          newErrors.confirmation = Array.isArray(data.confirmation)
            ? data.confirmation.join(" ")
            : String(data.confirmation)
        }
        setErrors(newErrors)
      }
      toast({
        type: "error",
        message: extractErrorMessage(err, "Échec du changement de mot de passe."),
      })
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const newErrors: { ancien?: string; nouveau?: string; confirmation?: string } = {}

    if (!ancienMotDePasse) {
      newErrors.ancien = "Veuillez renseigner votre mot de passe actuel."
    }

    if (!nouveauMotDePasse) {
      newErrors.nouveau = "Veuillez renseigner un nouveau mot de passe."
    } else if (nouveauMotDePasse.length < 8) {
      newErrors.nouveau = "Le nouveau mot de passe doit comporter au moins 8 caractères."
    }

    if (!confirmation) {
      newErrors.confirmation = "Veuillez confirmer votre nouveau mot de passe."
    } else if (nouveauMotDePasse && confirmation !== nouveauMotDePasse) {
      newErrors.confirmation = "La confirmation ne correspond pas au nouveau mot de passe."
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    changePasswordMutation.mutate({
      ancien_mot_de_passe: ancienMotDePasse,
      nouveau_mot_de_passe: nouveauMotDePasse,
      confirmation: confirmation,
    })
  }

  return (
    <Card className="flex flex-col h-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card overflow-hidden shadow-xs">
      {/* Titre sur fond gris très clair */}
      <CardHeader className="bg-slate-50/80 dark:bg-muted/30 px-6 py-4 border-b border-slate-200 dark:border-border">
        <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Mot de passe
        </CardTitle>
      </CardHeader>

      {/* Corps blanc */}
      <CardContent className="p-6 flex flex-col flex-1">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 justify-between space-y-5">
          <div className="space-y-4">
            {/* Mot de passe actuel */}
            <div className="space-y-1.5">
              <Label
                htmlFor="current-password"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Mot de passe actuel
              </Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showOld ? "text" : "password"}
                  value={ancienMotDePasse}
                  onChange={(e) => {
                    setAncienMotDePasse(e.target.value)
                    if (errors.ancien) {
                      setErrors((prev) => ({ ...prev, ancien: undefined }))
                    }
                  }}
                  placeholder="Entrez votre mot de passe actuel"
                  className="rounded-lg border-slate-200 dark:border-border pr-10 text-sm"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title={showOld ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  aria-label={showOld ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showOld ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.ancien && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                  {errors.ancien}
                </p>
              )}
            </div>

            {/* Nouveau mot de passe */}
            <div className="space-y-1.5">
              <Label
                htmlFor="new-password"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Nouveau mot de passe
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  value={nouveauMotDePasse}
                  onChange={(e) => {
                    setNouveauMotDePasse(e.target.value)
                    if (errors.nouveau) {
                      setErrors((prev) => ({ ...prev, nouveau: undefined }))
                    }
                  }}
                  placeholder="Minimum 8 caractères"
                  className="rounded-lg border-slate-200 dark:border-border pr-10 text-sm"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title={showNew ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  aria-label={showNew ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.nouveau && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                  {errors.nouveau}
                </p>
              )}
            </div>

            {/* Confirmation */}
            <div className="space-y-1.5">
              <Label
                htmlFor="confirm-password"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Confirmation
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  value={confirmation}
                  onChange={(e) => {
                    setConfirmation(e.target.value)
                    if (errors.confirmation) {
                      setErrors((prev) => ({ ...prev, confirmation: undefined }))
                    }
                  }}
                  placeholder="Confirmez le nouveau mot de passe"
                  className="rounded-lg border-slate-200 dark:border-border pr-10 text-sm"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title={showConfirm ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  aria-label={showConfirm ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.confirmation && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                  {errors.confirmation}
                </p>
              )}
            </div>
          </div>

          {/* En bas à droite : Bouton Changer le mot de passe */}
          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-border/60">
            <Button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 text-sm font-medium px-5 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {changePasswordMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Mise à jour...
                </>
              ) : (
                "Changer le mot de passe"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

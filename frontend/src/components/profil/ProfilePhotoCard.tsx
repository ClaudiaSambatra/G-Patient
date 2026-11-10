import { useState, useRef, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { CurrentUser } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/toast"
import { Camera, Loader2 } from "lucide-react"
import { extractErrorMessage } from "./utils"

interface ProfilePhotoCardProps {
  user: CurrentUser
}

export function ProfilePhotoCard({ user }: ProfilePhotoCardProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

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

    if (file.size > 2 * 1024 * 1024) {
      toast({
        type: "error",
        message: "La photo dépasse la taille maximale autorisée de 2 Mo.",
      })
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"]
    if (!allowed.includes(file.type)) {
      toast({
        type: "error",
        message: "Format d'image non supporté. Seuls JPEG, PNG et WebP sont autorisés.",
      })
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    uploadPhotoMutation.mutate(file)
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
    <Card className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-14 rounded-full border border-slate-200 dark:border-border shrink-0">
            {displayPhoto ? (
              <AvatarImage src={displayPhoto} alt={user.full_name || user.username} />
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
  )
}

import { useState } from "react"
import axios from "axios"
import { useMutation } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { extractErrorMessage } from "./utils"

export function MotDePasseCard() {
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
      <CardHeader className="bg-slate-50/80 dark:bg-muted/30 px-6 py-4 border-b border-slate-200 dark:border-border">
        <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Mot de passe
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 flex flex-col flex-1">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 justify-between space-y-5">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current-password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
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

            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
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

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
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

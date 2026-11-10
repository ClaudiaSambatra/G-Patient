import { useState } from "react"
import axios from "axios"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { CurrentUser } from "@/components/sidebar"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"
import { Loader2 } from "lucide-react"
import { extractErrorMessage } from "./utils"

interface InformationsPersonnellesCardProps {
  user: CurrentUser
}

export function InformationsPersonnellesCard({ user }: InformationsPersonnellesCardProps) {
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
      <CardHeader className="bg-slate-50/80 dark:bg-muted/30 px-6 py-4 border-b border-slate-200 dark:border-border">
        <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Informations personnelles
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 flex flex-col flex-1">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 justify-between space-y-5">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="profile-first-name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
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

              <div className="space-y-1.5">
                <Label htmlFor="profile-last-name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
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

            <div className="space-y-1.5">
              <Label htmlFor="profile-email" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Adresse e-mail
              </Label>
              <Input
                id="profile-email"
                value={user.email}
                disabled
                readOnly
                className="rounded-lg border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/40 text-slate-500 dark:text-slate-400 cursor-not-allowed text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-telephone" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
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

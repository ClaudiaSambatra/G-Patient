import { AlertCircle } from "lucide-react"
import { Utilisateur } from "./types"

interface UserDeleteModalProps {
  user: Utilisateur | null
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
}

export function UserDeleteModal({
  user,
  onClose,
  onConfirm,
  isPending,
}: UserDeleteModalProps) {
  if (!user) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 text-destructive mb-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10">
            <AlertCircle className="size-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Supprimer l&apos;utilisateur ?</h3>
            <p className="text-xs text-muted-foreground">Cette action est irréversible</p>
          </div>
        </div>

        <p className="text-sm text-foreground mt-2">
          Êtes-vous sûr de vouloir supprimer définitivement le compte de{" "}
          <span className="font-bold">
            {user.first_name || user.last_name
              ? `${user.first_name} ${user.last_name}`
              : `@${user.username}`}
          </span>{" "}
          (@{user.username}) ?
        </p>

        <p className="text-xs text-muted-foreground mt-2">
          Toutes les permissions associées à ce compte seront révoquées immédiatement.
        </p>

        <div className="flex items-center justify-end gap-3 pt-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            id="btn-confirm-delete-user"
            className="flex items-center gap-2 rounded-xl bg-destructive px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-destructive/90 disabled:opacity-50 cursor-pointer"
          >
            {isPending ? "Suppression…" : "Supprimer définitivement"}
          </button>
        </div>
      </div>
    </div>
  )
}

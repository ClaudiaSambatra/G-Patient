import { Edit3, XCircle, Lock, Stethoscope, Briefcase, Shield } from "lucide-react"
import { Utilisateur } from "./types"

interface EditUserFormData {
  username: string
  first_name: string
  last_name: string
  email: string
  role: "ADMIN" | "MEDECIN" | "SECRETAIRE"
  telephone: string
  is_active: boolean
}

interface UserEditModalProps {
  user: Utilisateur | null
  onClose: () => void
  onSubmit: () => void
  isPending: boolean
  form: EditUserFormData
  setForm: React.Dispatch<React.SetStateAction<EditUserFormData>>
  error: string | null
  isSelf: boolean
}

export function UserEditModal({
  user,
  onClose,
  onSubmit,
  isPending,
  form,
  setForm,
  error,
  isSelf,
}: UserEditModalProps) {
  if (!user) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            {user.photo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={user.photo}
                alt={user.username}
                className="size-10 shrink-0 rounded-xl object-cover border border-border shadow-xs"
              />
            ) : (
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/20">
                <Edit3 className="size-5" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-foreground">
                Modifier l&apos;utilisateur @{user.username}
              </h3>
              <p className="text-xs text-muted-foreground">
                Mettez à jour le rôle métier et les informations du profil
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <XCircle className="size-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
          className="mt-5 space-y-4"
        >
          {/* Choix du rôle (non modifiable lors de l'édition) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Rôle métier
              </label>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Lock className="size-3" />
                Fixé à la création
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                disabled={true}
                title={user.role === "MEDECIN" ? "Rôle actuel de l'utilisateur" : "Rôle non modifiable"}
                className={`flex flex-col items-center text-center p-3 rounded-xl border text-xs transition-all ${
                  user.role === "MEDECIN"
                    ? "border-emerald-500 bg-emerald-50/50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 ring-2 ring-emerald-500/20 shadow-xs cursor-default"
                    : "opacity-40 grayscale bg-muted/40 border-dashed border-border/60 text-muted-foreground/60 cursor-not-allowed select-none"
                }`}
              >
                <Stethoscope className={`size-5 mb-1.5 ${user.role === "MEDECIN" ? "text-emerald-600" : "text-muted-foreground"}`} />
                <span className="font-bold">Médecin</span>
              </button>

              <button
                type="button"
                disabled={true}
                title={user.role === "SECRETAIRE" ? "Rôle actuel de l'utilisateur" : "Rôle non modifiable"}
                className={`flex flex-col items-center text-center p-3 rounded-xl border text-xs transition-all ${
                  user.role === "SECRETAIRE"
                    ? "border-amber-500 bg-amber-50/50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 ring-2 ring-amber-500/20 shadow-xs cursor-default"
                    : "opacity-40 grayscale bg-muted/40 border-dashed border-border/60 text-muted-foreground/60 cursor-not-allowed select-none"
                }`}
              >
                <Briefcase className={`size-5 mb-1.5 ${user.role === "SECRETAIRE" ? "text-amber-600" : "text-muted-foreground"}`} />
                <span className="font-bold">Secrétaire</span>
              </button>

              <button
                type="button"
                disabled={true}
                title={user.role === "ADMIN" ? "Rôle actuel de l'utilisateur" : "Rôle non modifiable"}
                className={`flex flex-col items-center text-center p-3 rounded-xl border text-xs transition-all ${
                  user.role === "ADMIN"
                    ? "border-primary bg-primary/10 text-primary-foreground dark:bg-primary/20 dark:text-primary ring-2 ring-primary/20 shadow-xs cursor-default"
                    : "opacity-40 grayscale bg-muted/40 border-dashed border-border/60 text-muted-foreground/60 cursor-not-allowed select-none"
                }`}
              >
                <Shield className={`size-5 mb-1.5 ${user.role === "ADMIN" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="font-bold">Administrateur</span>
              </button>
            </div>
          </div>

          {/* Identifiant & Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Identifiant de connexion *
              </label>
              <input
                type="text"
                required
                id="edit-user-username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Adresse email
              </label>
              <input
                type="email"
                required
                id="edit-user-email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Prénom & Nom */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Prénom</label>
              <input
                type="text"
                id="edit-user-firstname"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Nom</label>
              <input
                type="text"
                id="edit-user-lastname"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Téléphone */}
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Téléphone professionnel
            </label>
            <input
              type="text"
              id="edit-user-telephone"
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          {/* Statut actif */}
          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              id="edit-user-is-active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              disabled={isSelf}
              className="size-4 rounded-md border-border text-primary focus:ring-primary cursor-pointer"
            />
            <label htmlFor="edit-user-is-active" className="text-xs text-foreground cursor-pointer">
              Compte actif
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              id="btn-submit-edit-user"
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
            >
              {isPending ? "Enregistrement…" : "Sauvegarder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

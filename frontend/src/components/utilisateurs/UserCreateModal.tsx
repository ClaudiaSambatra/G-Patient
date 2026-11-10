import { UserPlus, XCircle, Stethoscope, Briefcase, Shield, KeyRound, Check, Copy } from "lucide-react"

interface CreateUserFormData {
  username: string
  first_name: string
  last_name: string
  email: string
  role: "ADMIN" | "MEDECIN" | "SECRETAIRE"
  telephone: string
  password: string
  is_active: boolean
}

interface UserCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: () => void
  isPending: boolean
  form: CreateUserFormData
  setForm: React.Dispatch<React.SetStateAction<CreateUserFormData>>
  error: string | null
  copiedPassword: boolean
  onGeneratePassword: () => void
  onCopyPassword: () => void
}

export function UserCreateModal({
  isOpen,
  onClose,
  onSubmit,
  isPending,
  form,
  setForm,
  error,
  copiedPassword,
  onGeneratePassword,
  onCopyPassword,
}: UserCreateModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/20">
              <UserPlus className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Créer un utilisateur</h3>
              <p className="text-xs text-muted-foreground">
                Définissez les accès et le rôle du nouvel agent hospitalier
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
          {/* Choix du rôle par cartes visuelles */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
              Rôle &amp; Niveau d&apos;accès *
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, role: "MEDECIN" })}
                className={`flex flex-col items-center text-center p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                  form.role === "MEDECIN"
                    ? "border-emerald-500 bg-emerald-50/50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 shadow-xs ring-2 ring-emerald-500/20"
                    : "border-border hover:border-muted-foreground/40 text-muted-foreground"
                }`}
              >
                <Stethoscope className="size-5 mb-1.5 text-emerald-600" />
                <span className="font-bold">Médecin</span>
                <span className="text-[10px] opacity-75 mt-0.5">Consultations, ordonnances</span>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, role: "SECRETAIRE" })}
                className={`flex flex-col items-center text-center p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                  form.role === "SECRETAIRE"
                    ? "border-amber-500 bg-amber-50/50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 shadow-xs ring-2 ring-amber-500/20"
                    : "border-border hover:border-muted-foreground/40 text-muted-foreground"
                }`}
              >
                <Briefcase className="size-5 mb-1.5 text-amber-600" />
                <span className="font-bold">Secrétaire</span>
                <span className="text-[10px] opacity-75 mt-0.5">Patients, rendez-vous</span>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, role: "ADMIN" })}
                className={`flex flex-col items-center text-center p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                  form.role === "ADMIN"
                    ? "border-primary bg-primary/10 text-primary-foreground dark:bg-primary/20 dark:text-primary shadow-xs ring-2 ring-primary/20"
                    : "border-border hover:border-muted-foreground/40 text-muted-foreground"
                }`}
              >
                <Shield className="size-5 mb-1.5 text-primary" />
                <span className="font-bold">Administrateur</span>
                <span className="text-[10px] opacity-75 mt-0.5">Gestion complète &amp; comptes</span>
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
                id="create-user-username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="ex: dr.rakoto"
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Adresse email *
              </label>
              <input
                type="email"
                required
                id="create-user-email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="contact@hopital.mg"
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
                id="create-user-firstname"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                placeholder="Jean"
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Nom</label>
              <input
                type="text"
                id="create-user-lastname"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                placeholder="Rakotomalala"
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
              id="create-user-telephone"
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              placeholder="034 00 000 00"
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          {/* Mot de passe initial avec générateur */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-foreground">
                Mot de passe initial *
              </label>
              <button
                type="button"
                onClick={onGeneratePassword}
                className="text-[11px] font-semibold text-primary hover:text-primary dark:text-accent flex items-center gap-1 cursor-pointer"
              >
                <KeyRound className="size-3" />
                {copiedPassword ? "Copié !" : "Générer un mot de passe fort"}
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                required
                id="create-user-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mot de passe ou généré automatiquement"
                className="h-10 w-full rounded-xl border border-border bg-background px-3 pr-10 text-sm font-mono focus:border-primary focus:outline-none"
              />
              {form.password && (
                <button
                  type="button"
                  onClick={onCopyPassword}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Copier le mot de passe"
                >
                  {copiedPassword ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                </button>
              )}
            </div>
          </div>

          {/* Compte actif */}
          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              id="create-user-is-active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="size-4 rounded-md border-border text-primary focus:ring-primary cursor-pointer"
            />
            <label htmlFor="create-user-is-active" className="text-xs text-foreground cursor-pointer">
              Activer immédiatement le compte
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
              id="btn-submit-create-user"
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
            >
              {isPending ? "Création en cours…" : "Créer le compte"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

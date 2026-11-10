import { ArrowRight, CheckCircle2 } from "lucide-react"

interface ResetPasswordSuccessProps {
  onLoginClick: () => void
}

export function ResetPasswordSuccess({ onLoginClick }: ResetPasswordSuccessProps) {
  return (
    <div className="mt-5 flex flex-col items-center gap-3 text-center animate-in fade-in duration-300">
      <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-xs sm:text-sm text-primary font-medium flex items-center gap-2">
        <CheckCircle2 className="size-4.5 shrink-0 text-primary" />
        <span>Votre mot de passe a été réinitialisé avec succès !</span>
      </div>

      <p className="text-xs text-[var(--text-muted)] max-w-xs">
        Vous pouvez dès à présent vous connecter à votre espace médical avec vos nouveaux identifiants.
      </p>

      <div className="mt-3 w-full max-w-xs">
        <button
          type="button"
          onClick={onLoginClick}
          className="w-full h-10 sm:h-11 rounded-full bg-[var(--primary)] hover:opacity-95 active:scale-[0.99] text-[var(--text-light)] font-bold text-sm tracking-wide shadow-md shadow-[#1A5FFF]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Se connecter</span>
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  )
}

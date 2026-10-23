"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import axios from "axios"
import { ArrowLeft, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2, KeyRound } from "lucide-react"
import { Label } from "@/components/ui/label"
import { AuthIllustration } from "@/components/auth/AuthIllustration"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"

  useEffect(() => {
    const emailParam = searchParams.get("email")
    const codeParam = searchParams.get("code") || searchParams.get("otp") || searchParams.get("token")
    if (emailParam) setEmail(emailParam)
    if (codeParam) setOtp(codeParam)
  }, [searchParams])

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  async function handleResendOtp() {
    setError(null)
    setResendSuccess(null)

    if (!email.trim()) {
      setError("Veuillez d'abord renseigner votre adresse e-mail.")
      return
    }

    setResendLoading(true)
    try {
      await axios.post(`${baseURL}/auth/request-otp/`, { email: email.trim() })
      setResendSuccess(`Un nouveau code a été envoyé à ${email.trim()}.`)
      setCooldown(60)
      setTimeout(() => setResendSuccess(null), 8000)
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          setError("Impossible de contacter le serveur. Veuillez vérifier votre connexion.")
        } else if (err.response.status === 404) {
          setError("Aucun compte n'est associé à cette adresse e-mail.")
        } else {
          setError(
            err.response.data?.error ||
              err.response.data?.detail ||
              "Une erreur est survenue lors du renvoi du code."
          )
        }
      } else {
        setError("Une erreur inattendue est survenue.")
      }
    } finally {
      setResendLoading(false)
    }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.")
      return
    }

    if (newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.")
      return
    }

    setLoading(true)
    try {
      await axios.post(`${baseURL}/auth/reset-password/`, {
        email: email.trim(),
        otp: otp.trim(),
        new_password: newPassword,
      })
      setSuccess(true)
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          setError("Impossible de contacter le serveur. Veuillez vérifier votre connexion.")
        } else {
          setError(err.response.data?.error || err.response.data?.detail || "Une erreur est survenue lors de la réinitialisation.")
        }
      } else {
        setError("Une erreur inattendue est survenue.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full lg:w-1/2 flex flex-col justify-center px-4 sm:px-6 lg:px-8 max-w-md mx-auto">
      {/* Titre */}
      <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-extrabold tracking-tight text-center text-[var(--background-dark)] leading-tight">
        Nouveau <span className="text-[var(--accent)]">mot de passe</span>
      </h1>

      {/* Sous-titre */}
      <p className="mt-1.5 text-xs sm:text-sm text-center text-[var(--text-muted)]">
        {success
          ? "Votre compte a été sécurisé avec succès."
          : "Saisissez le code reçu par e-mail et choisissez votre nouveau mot de passe."}
      </p>

      {/* Message d'erreur */}
      {error && (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-600 animate-in fade-in">
          <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-600" />
          <span className="leading-tight">{error}</span>
        </div>
      )}

      {/* Message de succès lors du renvoi du code */}
      {resendSuccess && (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-50 p-2.5 text-xs text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
          <span className="leading-tight font-medium">{resendSuccess}</span>
        </div>
      )}

      {/* Vue Succès */}
      {success ? (
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
              onClick={() => router.push("/login")}
              className="w-full h-10 sm:h-11 rounded-full bg-[var(--primary)] hover:opacity-95 active:scale-[0.99] text-[var(--text-light)] font-bold text-sm tracking-wide shadow-md shadow-[#1A5FFF]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Se connecter</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Formulaire de saisie */
        <form onSubmit={handleResetSubmit} className="mt-4 sm:mt-5 flex flex-col gap-2.5">
          {/* Champ Email */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="email" className="text-xs font-semibold text-[var(--background-dark)] ml-2">
              Adresse e-mail
            </Label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nom@exemple.com"
              required
              autoComplete="email"
              className="w-full h-10 rounded-full bg-[var(--surface)] border border-[#CBD5E1] px-4 text-sm text-[var(--background-dark)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
            />
          </div>

          {/* Champ Code OTP */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between ml-2 mr-2">
              <Label htmlFor="otp" className="text-xs font-semibold text-[var(--background-dark)]">
                Code de vérification (6 chiffres)
              </Label>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendLoading || cooldown > 0}
                className="text-[11px] text-[var(--accent)] hover:underline font-semibold disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                {resendLoading
                  ? "Envoi en cours…"
                  : cooldown > 0
                  ? `Renvoyer (${cooldown}s)`
                  : "Renvoyer le code ?"}
              </button>
            </div>
            <div className="relative">
              <input
                id="otp"
                name="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                required
                maxLength={32}
                className="w-full h-10 rounded-full bg-[var(--surface)] border border-[#CBD5E1] px-4 text-center font-mono text-base tracking-widest text-[var(--background-dark)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all font-bold"
              />
              <KeyRound className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--text-muted)] pointer-events-none" />
            </div>
          </div>

          {/* Champ Nouveau mot de passe */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="newPassword" className="text-xs font-semibold text-[var(--background-dark)] ml-2">
              Nouveau mot de passe
            </Label>
            <div className="relative">
              <input
                id="newPassword"
                name="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 caractères"
                required
                autoComplete="new-password"
                className="w-full h-10 rounded-full bg-[var(--surface)] border border-[#CBD5E1] pl-4 pr-11 text-sm text-[var(--background-dark)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--background-dark)] transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Champ Confirmation mot de passe */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="confirmPassword" className="text-xs font-semibold text-[var(--background-dark)] ml-2">
              Confirmer le mot de passe
            </Label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retapez le mot de passe"
                required
                autoComplete="new-password"
                className="w-full h-10 rounded-full bg-[var(--surface)] border border-[#CBD5E1] pl-4 pr-11 text-sm text-[var(--background-dark)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--background-dark)] transition-colors cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Bouton de soumission */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 sm:h-11 rounded-full bg-[var(--primary)] hover:opacity-95 active:scale-[0.99] text-[var(--text-light)] font-bold text-sm tracking-wide shadow-md shadow-[#1A5FFF]/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{loading ? "Mise à jour en cours…" : "Changer mon mot de passe"}</span>
            {!loading && <ArrowRight className="size-4" />}
          </button>

          {/* Lien retour connexion */}
          <div className="mt-2 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--background-dark)] transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              Retour à la connexion
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <main className="h-screen w-full bg-white flex items-center justify-center p-3 sm:p-4 lg:p-6 overflow-y-auto lg:overflow-hidden font-sans">
      <div className="w-full max-w-5xl lg:max-h-[92vh] flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-10 xl:gap-14">
        <Suspense fallback={<div className="w-full lg:w-1/2 text-center text-xs text-muted-foreground">Chargement…</div>}>
          <ResetPasswordForm />
        </Suspense>

        {/* Colonne droite illustration */}
        <div className="hidden lg:flex lg:w-1/2 w-full self-stretch items-center justify-center">
          <AuthIllustration />
        </div>
      </div>
    </main>
  )
}

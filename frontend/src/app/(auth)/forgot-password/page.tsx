"use client"

import { useState } from "react"
import Link from "next/link"
import axios from "axios"
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { AuthIllustration } from "@/components/auth/AuthIllustration"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      // Branchement sur l'API Django de réinitialisation existante
      await axios.post(`${baseURL}/auth/request-otp/`, { email })
    } catch (err) {
      // Message de confirmation sécurisé affiché même si l'adresse n'est pas trouvée
      console.warn("Demande de réinitialisation :", err)
    } finally {
      setLoading(false)
      setSubmitted(true)
    }
  }

  return (
    <main className="h-screen w-full bg-white flex items-center justify-center p-3 sm:p-4 lg:p-6 overflow-y-auto lg:overflow-hidden font-sans">
      <div className="w-full max-w-5xl lg:max-h-[92vh] flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-10 xl:gap-14">
        
        {/* Colonne gauche (formulaire centré verticalement) */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center px-4 sm:px-6 lg:px-8 max-w-md mx-auto">
          
          {/* Titre « Mot de passe oublié ? » avec « oublié » en --accent */}
          <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold tracking-tight text-center text-[var(--background-dark)] leading-tight">
            Mot de passe <span className="text-[var(--accent)]">oublié</span> ?
          </h1>

          {/* Texte explicatif */}
          <p className="mt-1.5 text-xs sm:text-sm text-center text-[var(--text-muted)]">
            Entrez votre adresse e-mail, nous vous enverrons un lien de réinitialisation.
          </p>

          {/* Message de confirmation après envoi */}
          {submitted ? (
            <div className="mt-5 flex flex-col items-center gap-3 text-center">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-xs sm:text-sm text-primary font-medium flex items-center gap-2">
                <CheckCircle2 className="size-4.5 shrink-0 text-primary" />
                <span>Si ce compte existe, un e-mail vient d&apos;être envoyé.</span>
              </div>

              <p className="text-xs text-[var(--text-muted)] max-w-xs">
                Vérifiez votre boîte de réception ainsi que votre dossier de courriers indésirables.
              </p>

              <div className="mt-2 flex flex-col gap-2 w-full max-w-xs">
                <Link
                  href={`/reset-password?email=${encodeURIComponent(email)}`}
                  className="w-full h-10 sm:h-11 rounded-full bg-[var(--primary)] hover:opacity-95 active:scale-[0.99] text-[var(--text-light)] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-[#1A5FFF]/20 transition-all"
                >
                  <span>Saisir le code reçu</span>
                  <ArrowRight className="size-4" />
                </Link>

                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--background-dark)] transition-colors mt-1"
                >
                  <ArrowLeft className="size-4" />
                  Retour à la connexion
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 sm:mt-5 flex flex-col gap-3">
              
              {/* Champ e-mail : pleine largeur, rounded-full, bordure fine grise */}
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
                  className="w-full h-10 sm:h-11 rounded-full bg-[var(--surface)] border border-[#CBD5E1] px-4 sm:px-5 text-sm text-[var(--background-dark)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
                />
              </div>

              {/* Bouton « Envoyer le lien » (--primary) */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 sm:h-11 rounded-full bg-[var(--primary)] hover:opacity-95 active:scale-[0.99] text-[var(--text-light)] font-bold text-sm tracking-wide shadow-md shadow-[#1A5FFF]/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{loading ? "Envoi en cours…" : "Envoyer le lien"}</span>
                {!loading && <ArrowRight className="size-4" />}
              </button>

              {/* Lien direct pour ceux qui ont déjà le code */}
              <div className="mt-2 text-center">
                <Link
                  href="/reset-password"
                  className="text-xs text-[var(--accent)] hover:underline font-medium transition-colors"
                >
                  Vous avez déjà un code de vérification ?
                </Link>
              </div>

              {/* Lien « Retour à la connexion » avec flèche gauche (ArrowLeft) */}
              <div className="mt-2 sm:mt-3 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-[var(--text-muted)] hover:text-[var(--background-dark)] transition-colors"
                >
                  <ArrowLeft className="size-4" />
                  Retour à la connexion
                </Link>
              </div>
            </form>
          )}

        </div>

        {/* Colonne droite (masquée sur tablette et mobile : hidden lg:flex) */}
        <div className="hidden lg:flex lg:w-1/2 w-full self-stretch items-center justify-center">
          <AuthIllustration />
        </div>

      </div>
    </main>
  )
}

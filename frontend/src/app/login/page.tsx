"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import axios from "axios"
import { ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { AuthIllustration } from "@/components/auth/AuthIllustration"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.get("view") === "resetPassword") {
        const email = params.get("email") || ""
        const code = params.get("code") || ""
        router.replace(`/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`)
      }
    }
  }, [router])

  const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data } = await axios.post(`${baseURL}/auth/token/`, {
        username,
        password,
      })
      window.localStorage.setItem("access_token", data.access)
      window.localStorage.setItem("refresh_token", data.refresh)

      try {
        const meRes = await axios.get(`${baseURL}/accounts/me/`, {
          headers: { Authorization: `Bearer ${data.access}` },
        })
        if (meRes.data?.role === "ADMIN" || meRes.data?.is_superuser) {
          router.push("/utilisateurs")
          return
        }
      } catch {
        // Ignorer et rediriger vers /patients
      }
      router.push("/patients")
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          setError("Impossible de contacter le serveur. Veuillez vérifier que le backend est en cours d'exécution.")
        } else if (err.response.status === 401) {
          setError("Identifiants incorrects ou compte inactif. Veuillez réessayer.")
        } else {
          setError(err.response.data?.detail || "Une erreur est survenue lors de la connexion.")
        }
      } else {
        setError("Une erreur inattendue est survenue lors de la connexion.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="h-screen w-full bg-white flex items-center justify-center p-3 sm:p-4 lg:p-6 overflow-y-auto lg:overflow-hidden font-sans">
      <div className="w-full max-w-5xl lg:max-h-[92vh] flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-10 xl:gap-14">
        
        {/* Colonne gauche (formulaire centré verticalement) */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center px-4 sm:px-6 lg:px-8 max-w-md mx-auto">
          
          {/* Titre « Bon retour ! » avec « retour » en --accent */}
          <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold tracking-tight text-center text-[var(--background-dark)] leading-tight">
            Bon <span className="text-[var(--accent)]">retour</span> !
          </h1>

          {/* Sous-titre centré, gris : « Connectez-vous pour accéder à la gestion de vos patients. » */}
          <p className="mt-1.5 text-xs sm:text-sm text-center text-[var(--text-muted)]">
            Connectez-vous pour accéder à la gestion de vos patients.
          </p>

          {/* Message d'erreur */}
          {error && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-600" />
              <span className="leading-tight">{error}</span>
            </div>
          )}

          {/* Formulaire de connexion */}
          <form onSubmit={handleLoginSubmit} className="mt-4 sm:mt-5 flex flex-col gap-3">
            
            {/* Champ « Nom d'utilisateur » : pleine largeur, rounded-full, bordure fine grise */}
            <div className="flex flex-col gap-1">
              <Label htmlFor="username" className="text-xs font-semibold text-[var(--background-dark)] ml-2">
                Nom d&apos;utilisateur
              </Label>
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Entrez votre nom d'utilisateur"
                required
                autoComplete="username"
                className="w-full h-10 sm:h-11 rounded-full bg-[var(--surface)] border border-[#CBD5E1] px-4 sm:px-5 text-sm text-[var(--background-dark)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
              />
            </div>

            {/* Champ « Mot de passe » : même style, avec icône œil à droite pour afficher/masquer (aria-label) */}
            <div className="flex flex-col gap-1">
              <Label htmlFor="password" className="text-xs font-semibold text-[var(--background-dark)] ml-2">
                Mot de passe
              </Label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Entrez votre mot de passe"
                  required
                  autoComplete="current-password"
                  className="w-full h-10 sm:h-11 rounded-full bg-[var(--surface)] border border-[#CBD5E1] pl-4 sm:pl-5 pr-11 text-sm text-[var(--background-dark)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--background-dark)] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
                </button>
              </div>

              {/* Lien « Mot de passe oublié ? » aligné à droite sous le champ mot de passe */}
              <div className="flex justify-end mt-0.5">
                <Link
                  href="/forgot-password"
                  className="text-xs text-[var(--accent)] hover:underline font-medium transition-colors"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
            </div>

            {/* Bouton « Se connecter » : pleine largeur, rounded-full, fond --primary, texte blanc, flèche à droite */}
            <button
              type="submit"
              disabled={loading}
              id="btn-login-submit"
              className="w-full h-10 sm:h-11 rounded-full bg-[var(--primary)] hover:opacity-95 active:scale-[0.99] text-[var(--text-light)] font-bold text-sm tracking-wide shadow-md shadow-[#1A5FFF]/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{loading ? "Connexion en cours…" : "Se connecter"}</span>
              {!loading && <ArrowRight className="size-4" />}
            </button>
          </form>

        </div>

        {/* Colonne droite (masquée sur tablette et mobile : hidden lg:flex) */}
        <div className="hidden lg:flex lg:w-1/2 w-full self-stretch items-center justify-center">
          <AuthIllustration />
        </div>

      </div>
    </main>
  )
}
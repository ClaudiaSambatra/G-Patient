"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Activity, Lock, User, ShieldCheck, AlertCircle, Building2, Mail } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  
  // Vues possibles: "login" | "requestOtp" | "resetPassword"
  const [view, setView] = useState<"login" | "requestOtp" | "resetPassword">("login")

  // États du login
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  
  // États OTP
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
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
        // Ignorer
      }
      router.push("/patients")
    } catch (err: any) {
      if (!err.response) {
        setError("Impossible de contacter le serveur. Veuillez vérifier que le backend est en cours d'exécution.")
      } else if (err.response.status === 401) {
        setError("Identifiants incorrects ou compte inactif. Veuillez réessayer.")
      } else {
        setError(err.response.data?.detail || "Une erreur est survenue lors de la connexion.")
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      await axios.post(`${baseURL}/auth/request-otp/`, { email })
      setView("resetPassword")
      setSuccess("Un code OTP a été envoyé par email.")
    } catch (err: any) {
      setError(err.response?.data?.error || "Adresse email introuvable.")
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      await axios.post(`${baseURL}/auth/reset-password/`, {
        email: email,
        otp,
        new_password: newPassword,
      })
      setView("login")
      setSuccess("Mot de passe mis à jour ! Vous pouvez vous connecter.")
      setEmail("")
      setOtp("")
      setNewPassword("")
    } catch (err: any) {
      setError(err.response?.data?.error || "Code OTP invalide.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center p-4 sm:p-8 bg-background">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl">
            <Activity className="size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Gestion de Patients
          </h1>
          <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
            <Building2 className="size-3" /> CHU Antananarivo — Système d&apos;Information Médical
          </p>
        </div>

        <Card className="border-border shadow-xl rounded-2xl backdrop-blur-md bg-card">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg font-semibold">
              {view === "login" && "Connexion à votre espace"}
              {view === "requestOtp" && "Mot de passe oublié"}
              {view === "resetPassword" && "Nouveau mot de passe"}
            </CardTitle>
            <CardDescription className="text-xs">
              {view === "login" && "Saisissez vos identifiants pour accéder à vos dossiers"}
              {view === "requestOtp" && "Saisissez votre email pour recevoir un code"}
              {view === "resetPassword" && "Entrez le code reçu et votre nouveau mot de passe"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-600/10 p-3 text-xs text-emerald-600">
                <ShieldCheck className="size-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {view === "login" && (
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="username" className="text-xs font-medium text-foreground">
                    Nom d&apos;utilisateur ou Email
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="ex: admin ou admin@gmail.com"
                      className="pl-9 h-10 rounded-xl bg-background"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password" className="text-xs font-medium text-foreground">
                    Mot de passe
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9 h-10 rounded-xl bg-background"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  id="btn-login-submit"
                  className="w-full h-10 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-md mt-1"
                >
                  {loading ? "Vérification…" : "Se connecter"}
                </Button>
                
                <div className="text-center mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setView("requestOtp")
                      setError(null)
                      setSuccess(null)
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>

                <div className="mt-2 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                  <ShieldCheck className="size-3.5 text-emerald-600" />
                  <span>Authentification sécurisée par jeton JWT</span>
                </div>
              </form>
            )}

            {view === "requestOtp" && (
              <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-foreground">
                    Numéro de téléemail
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="exemple@email.com"
                      className="pl-9 h-10 rounded-xl bg-background"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md mt-1"
                >
                  {loading ? "Envoi en cours…" : "Recevoir un code par Email"}
                </Button>

                <div className="text-center mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setView("login")
                      setError(null)
                      setSuccess(null)
                    }}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Retour à la connexion
                  </button>
                </div>
              </form>
            )}

            {view === "resetPassword" && (
              <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="otp" className="text-xs font-medium text-foreground">
                    Code reçu par Email
                  </Label>
                  <Input
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    className="h-10 rounded-xl bg-background text-center tracking-widest text-lg"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="newPassword" className="text-xs font-medium text-foreground">
                    Nouveau mot de passe
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9 h-10 rounded-xl bg-background"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md mt-1"
                >
                  {loading ? "Enregistrement…" : "Réinitialiser le mot de passe"}
                </Button>

                <div className="text-center mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setView("login")
                      setError(null)
                      setSuccess(null)
                    }}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Retour à la connexion
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
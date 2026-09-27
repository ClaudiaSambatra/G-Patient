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
import { Activity, Lock, User, ShieldCheck, AlertCircle, Building2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"
      const { data } = await axios.post(`${baseURL}/auth/token/`, {
        username,
        password,
      })
      window.localStorage.setItem("access_token", data.access)
      window.localStorage.setItem("refresh_token", data.refresh)

      // Récupérer le profil pour orienter l'utilisateur selon son rôle
      try {
        const meRes = await axios.get(`${baseURL}/accounts/me/`, {
          headers: { Authorization: `Bearer ${data.access}` },
        })
        if (meRes.data?.role === "ADMIN" || meRes.data?.is_superuser) {
          router.push("/utilisateurs")
          return
        }
      } catch {
        // En cas de souci sur le profil, redirection par défaut
      }
      router.push("/patients")
    } catch {
      setError("Identifiants incorrects ou compte inactif. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center p-4 sm:p-8 bg-background">
      <div className="w-full max-w-md">
        {/* En-tête Brand */}
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
            <CardTitle className="text-lg font-semibold">Connexion à votre espace</CardTitle>
            <CardDescription className="text-xs">
              Saisissez vos identifiants pour accéder à vos dossiers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="username" className="text-xs font-medium text-foreground">
                  Nom d&apos;utilisateur
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ex: dr.rakoto"
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

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                id="btn-login-submit"
                className="w-full h-10 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-md mt-1"
              >
                {loading ? "Vérification…" : "Se connecter"}
              </Button>

              <div className="mt-2 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                <ShieldCheck className="size-3.5 text-emerald-600" />
                <span>Authentification sécurisée par jeton JWT</span>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
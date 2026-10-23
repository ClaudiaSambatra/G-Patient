"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Activity, ShieldCheck, Stethoscope, Users, Building2, ArrowRight } from "lucide-react"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-background">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr bg-primary text-white shadow-md shadow-primary/20">
              <Activity className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
                G-Patient
                <span className="rounded-full bg-primary/10 px-1.5 py-0 text-[9px] font-semibold text-primary dark:bg-primary/20 dark:text-primary-foreground">
                  Pro
                </span>
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Building2 className="size-2.5" /> Centre Médical
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-sm font-medium">
                Espace Personnel
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-sm shadow-primary/20">
                Se connecter <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-24 pb-32">
          {/* Background decorations */}
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(26,95,255,0.12),rgba(255,255,255,0))]"></div>
          <div className="absolute -top-40 -right-40 -z-10 size-[500px] rounded-full bg-primary/10 blur-[100px]"></div>
          <div className="absolute -bottom-40 -left-40 -z-10 size-[500px] rounded-full bg-primary/10 blur-[100px]"></div>

          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-8 backdrop-blur-md">
              <span className="flex size-2 rounded-full bg-primary mr-2 animate-pulse"></span>
              Système d'Information Hospitalier (SIH) de nouvelle génération
            </div>
            
            <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl xl:text-7xl">
              Simplifiez la gestion de vos <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                dossiers médicaux
              </span>
            </h1>
            
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Une plateforme centralisée et sécurisée pour la gestion des patients, 
              la planification des rendez-vous et la coordination du corps médical 
              au sein de l'établissement.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login">
                <Button size="lg" className="h-14 px-8 text-base bg-primary hover:bg-primary/90 text-white w-full sm:w-auto shadow-lg shadow-primary/25 transition-all hover:scale-105">
                  Accéder à l'application
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-white dark:bg-background border-t border-border/40">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Conçu pour l'excellence médicale</h2>
              <p className="mt-4 text-muted-foreground text-lg">Des outils adaptés aux besoins de chaque professionnel de santé.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="rounded-2xl border border-border/80 bg-slate-50 dark:bg-muted/20 p-8 transition-all hover:shadow-md">
                <div className="mb-4 inline-flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground">
                  <Users className="size-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Dossiers centralisés</h3>
                <p className="text-muted-foreground">
                  Accédez à l'historique médical, aux antécédents et aux allergies de vos patients en un clic.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="rounded-2xl border border-border/80 bg-slate-50 dark:bg-muted/20 p-8 transition-all hover:shadow-md">
                <div className="mb-4 inline-flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground">
                  <Stethoscope className="size-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Suivi des consultations</h3>
                <p className="text-muted-foreground">
                  Rédigez vos observations cliniques et diagnostics associés à chaque rendez-vous planifié.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-2xl border border-border/80 bg-slate-50 dark:bg-muted/20 p-8 transition-all hover:shadow-md">
                <div className="mb-4 inline-flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground">
                  <ShieldCheck className="size-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Sécurité & Confidentialité</h3>
                <p className="text-muted-foreground">
                  Gestion fine des droits d'accès. Vos données médicales sont chiffrées et sécurisées.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 bg-white dark:bg-background">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Tous droits réservés.</p>
          <div className="flex gap-4">
            <span className="hover:text-foreground cursor-pointer">Support Technique</span>
            <span className="hover:text-foreground cursor-pointer">Mentions Légales</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

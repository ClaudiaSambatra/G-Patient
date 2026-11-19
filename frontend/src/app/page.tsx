"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShieldCheck, Stethoscope, Users, ArrowRight } from "lucide-react"

const FONCTIONNALITES = [
  {
    icone: Users,
    titre: "Dossiers patients",
    texte: "Historique médical, antécédents et allergies regroupés dans une seule fiche.",
  },
  {
    icone: Stethoscope,
    titre: "Consultations et rendez-vous",
    texte: "Planning des médecins, observations cliniques, ordonnances et demandes d'examens.",
  },
  {
    icone: ShieldCheck,
    titre: "Accès par rôle",
    texte: "Administrateur, médecin et secrétaire n'accèdent qu'aux informations qui les concernent.",
  },
]

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ej-icon.png" alt="EJ Logiciel" className="size-9 rounded-md" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-foreground">Gestion Patients</span>
              <span className="text-[11px] text-muted-foreground">EJ Logiciel</span>
            </div>
          </div>
          <Link href="/login">
            <Button className="gap-2">
              Se connecter <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="bg-[var(--background-dark)] text-white">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="text-sm font-medium text-[#A9ABF0]">Cabinet médical</p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">
                La gestion des patients du cabinet, au même endroit.
              </h1>
              <p className="mt-5 max-w-xl text-base text-[#C9CBE6]">
                Fiches patients, rendez-vous, consultations, ordonnances, examens et factures :
                chaque membre de l&apos;équipe retrouve ce dont il a besoin.
              </p>
              <Link href="/login" className="mt-8 inline-block">
                <Button size="lg" className="h-12 px-6 text-base">
                  Accéder à l&apos;application
                </Button>
              </Link>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/ej-logo.png"
              alt="Logo EJ Logiciel"
              className="mx-auto hidden w-full max-w-[280px] rounded-lg md:block"
            />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
            {FONCTIONNALITES.map(({ icone: Icone, titre, texte }) => (
              <div key={titre} className="bg-card p-6">
                <Icone className="size-5 text-primary" />
                <h2 className="mt-4 text-base font-semibold">{titre}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{texte}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6">
        <p className="mx-auto max-w-6xl px-4 text-sm text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} EJ Logiciel
        </p>
      </footer>
    </div>
  )
}

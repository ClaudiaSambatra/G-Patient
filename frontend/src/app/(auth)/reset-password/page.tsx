"use client"

import { Suspense } from "react"
import { AuthIllustration } from "@/components/auth/AuthIllustration"
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm"

export default function ResetPasswordPage() {
  return (
    <main className="h-screen w-full bg-white overflow-y-auto lg:overflow-hidden font-sans">
      <div className="flex min-h-full w-full flex-col lg:flex-row items-center">
        <Suspense fallback={<div className="w-full lg:w-1/2 text-center text-xs text-muted-foreground">Chargement…</div>}>
          <ResetPasswordForm />
        </Suspense>

        {/* Colonne droite illustration */}
        <div className="relative hidden lg:block lg:w-1/2 self-stretch">
          <AuthIllustration />
        </div>
      </div>
    </main>
  )
}

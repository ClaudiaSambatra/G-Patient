"use client"

import { Suspense } from "react"
import { AuthIllustration } from "@/components/auth/AuthIllustration"
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm"

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

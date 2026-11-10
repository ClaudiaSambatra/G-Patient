"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Flask, Plus } from "@phosphor-icons/react"

interface ExamenHeaderProps {
  canPrescribe: boolean
  onPrescribe: () => void
}

export function ExamenHeader({ canPrescribe, onPrescribe }: ExamenHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
            <Flask size={24} weight="duotone" />
          </span>
          Demandes d&apos;examens médicaux & Laboratoire
        </h1>
        <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2">
          <span>Prescription et suivi des analyses biologiques et examens radiologiques.</span>
          <Badge variant="outline" className="text-[10px] py-0 px-2 font-normal border-cyan-500/30 text-cyan-700 dark:text-cyan-300">
            Sans facturation interne
          </Badge>
        </div>
      </div>
      {canPrescribe && (
        <div className="flex items-center gap-2">
          <Button
            onClick={onPrescribe}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-xs gap-1.5 h-8.5 px-3.5 text-xs sm:text-sm"
          >
            <Plus size={16} weight="bold" />
            Prescrire un examen
          </Button>
        </div>
      )}
    </div>
  )
}

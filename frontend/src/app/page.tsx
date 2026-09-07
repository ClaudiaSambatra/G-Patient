"use client"

import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

interface Patient {
  id: number
  nom: string
  prenom: string
  date_naissance: string
}

interface PatientListResponse {
  count: number
  results: Patient[]
}

export default function Home() {
  // Appel à l'API Django (nécessite d'être authentifié — voir /api/auth/token/).
  const { data, isLoading, isError } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data } = await apiClient.get<PatientListResponse>("/patients/")
      return data
    },
    retry: false,
  })

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Gestion de Patients</h1>
        <p className="text-muted-foreground">
          Squelette du frontend Next.js — Étape 2 du cahier des charges.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connexion à l&apos;API</CardTitle>
          <CardDescription>
            Test de câblage frontend ↔ backend (endpoint /api/patients/)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
          {isError && (
            <p className="text-sm text-destructive">
              Impossible de joindre l&apos;API (normal tant que le backend n&apos;est pas
              lancé, ou si vous n&apos;êtes pas authentifié).
            </p>
          )}
          {data && (
            <p className="text-sm">
              {data.count} patient(s) trouvé(s) via l&apos;API Django.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

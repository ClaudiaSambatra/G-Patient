"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

interface Patient {
  id: number
  nom: string
  prenom: string
  date_naissance: string
  contact: string
}

interface PatientListResponse {
  count: number
  results: Patient[]
}

export default function PatientsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ nom: "", prenom: "", date_naissance: "", contact: "" })

  const { data, isLoading, isError } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data } = await apiClient.get<PatientListResponse>("/patients/")
      return data
    },
    retry: false,
  })

  const createPatient = useMutation({
    mutationFn: async () => apiClient.post("/patients/", form),
    onSuccess: () => {
      setForm({ nom: "", prenom: "", date_naissance: "", contact: "" })
      queryClient.invalidateQueries({ queryKey: ["patients"] })
    },
  })

  function handleLogout() {
    window.localStorage.removeItem("access_token")
    window.localStorage.removeItem("refresh_token")
    router.push("/login")
  }

  if (isError) {
    return (
      <main className="mx-auto max-w-2xl p-8 text-center">
        <p className="mb-4 text-destructive">Session expirée ou non authentifiée.</p>
        <Button onClick={() => router.push("/login")}>Se connecter</Button>
      </main>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Patients</h1>
        <Button variant="outline" onClick={handleLogout}>Se déconnecter</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Nouveau patient</CardTitle></CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => { e.preventDefault(); createPatient.mutate() }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label>Nom</Label>
              <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Prénom</Label>
              <Input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Date de naissance</Label>
              <Input type="date" value={form.date_naissance} onChange={(e) => setForm({ ...form, date_naissance: e.target.value })} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Contact</Label>
              <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} required />
            </div>
            <Button type="submit" disabled={createPatient.isPending} className="col-span-2">
              {createPatient.isPending ? "Création..." : "Créer le dossier"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Liste des patients ({data?.count ?? 0})</CardTitle></CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Nom</th><th>Prénom</th><th>Naissance</th><th>Contact</th>
              </tr>
            </thead>
            <tbody>
              {data?.results.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2">{p.nom}</td>
                  <td>{p.prenom}</td>
                  <td>{p.date_naissance}</td>
                  <td>{p.contact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </main>
  )
}

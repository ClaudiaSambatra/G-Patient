"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { CurrentUser } from "@/components/sidebar"
import {
  Patient,
  Medecin,
  RendezVousListResponse,
  PatientListResponse,
} from "./types"

interface UseRendezVousQueriesProps {
  search: string
  statutFilter: string
  medecinFilter: string
  dateFilterMode: "none" | "single" | "range"
  singleDate: string
  startDate: string
  endDate: string
  currentPage: number
  viewMode: "list" | "calendar"
  calendarView: "day" | "week"
  calendarDate: Date
  formPatient: string
  formDate: string
}

export function useRendezVousQueries({
  search,
  statutFilter,
  medecinFilter,
  dateFilterMode,
  singleDate,
  startDate,
  endDate,
  currentPage,
  viewMode,
  calendarView,
  calendarDate,
  formPatient,
  formDate,
}: UseRendezVousQueriesProps) {
  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: async () => (await apiClient.get<CurrentUser>("/accounts/me/")).data,
  })

  const { data: medecinsData = [] } = useQuery<Medecin[]>({
    queryKey: ["medecins"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: Medecin[] } | Medecin[]>("/medecins/")
      return Array.isArray(data) ? data : data.results || []
    },
  })

  const connectedMedecinProfile = useMemo(() => {
    if (currentUser?.role !== "MEDECIN") return null
    return medecinsData.find((m) => m.id === currentUser.medecin_id || m.email === currentUser.email)
  }, [currentUser, medecinsData])

  const { data: patientsData = [] } = useQuery<Patient[]>({
    queryKey: ["patients_light"],
    queryFn: async () => (await apiClient.get<PatientListResponse>("/patients/")).data.results,
  })

  const todayStr = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  }, [])

  const { data: rdvData, isLoading, refetch: refetchRdv } = useQuery<RendezVousListResponse>({
    queryKey: [
      "rendezvous",
      search,
      statutFilter,
      medecinFilter,
      dateFilterMode,
      singleDate,
      startDate,
      endDate,
      currentPage,
      viewMode,
      calendarDate.toISOString(),
    ],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (statutFilter !== "ALL") params.append("statut", statutFilter)
      if (currentUser?.role !== "MEDECIN" && medecinFilter !== "ALL") {
        params.append("medecin", medecinFilter)
      }
      if (viewMode === "list") {
        params.append("page", currentPage.toString())
        if (dateFilterMode === "single" && singleDate) params.append("date", singleDate)
        else if (dateFilterMode === "range") {
          if (startDate) params.append("date_debut", startDate)
          if (endDate) params.append("date_fin", endDate)
        }
      } else {
        if (calendarView === "day") {
          const y = calendarDate.getFullYear()
          const m = String(calendarDate.getMonth() + 1).padStart(2, "0")
          const d = String(calendarDate.getDate()).padStart(2, "0")
          params.append("date", `${y}-${m}-${d}`)
        } else {
          const curr = new Date(calendarDate)
          const first = curr.getDate() - (curr.getDay() === 0 ? 6 : curr.getDay() - 1)
          const firstDay = new Date(curr.setDate(first))
          const lastDay = new Date(curr.setDate(first + 6))
          const fmt = (dt: Date) =>
            `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
          params.append("date_debut", fmt(firstDay))
          params.append("date_fin", fmt(lastDay))
        }
      }
      return (await apiClient.get<RendezVousListResponse>(`/rendezvous/?${params.toString()}`)).data
    },
  })

  const { data: eligibilityData } = useQuery<{ eligible: boolean; consultation_origine: number | null }>({
    queryKey: ["controle-eligible", formPatient, formDate],
    queryFn: async () => {
      if (!formPatient || !formDate) return { eligible: false, consultation_origine: null }
      return (
        await apiClient.get<{ eligible: boolean; consultation_origine: number | null }>(
          `/rendezvous/controle-eligible/?patient=${formPatient}&date=${formDate}`
        )
      ).data
    },
    enabled: Boolean(formPatient && formDate),
  })

  const isControleEligible = Boolean(eligibilityData?.eligible)

  return {
    currentUser,
    medecinsData,
    connectedMedecinProfile,
    patientsData,
    todayStr,
    rdvData,
    isLoading,
    refetchRdv,
    eligibilityData,
    isControleEligible,
  }
}

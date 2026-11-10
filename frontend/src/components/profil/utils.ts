import axios from "axios"

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data
    if (typeof data === "string") return data
    if (data.detail && typeof data.detail === "string") return data.detail
    if (data.message && typeof data.message === "string") return data.message
    if (data.error && typeof data.error === "string") return data.error
    if (typeof data === "object") {
      const messages: string[] = []
      for (const [key, val] of Object.entries(data)) {
        const valStr = Array.isArray(val) ? val.join(" ") : String(val)
        messages.push(`${key}: ${valStr}`)
      }
      if (messages.length > 0) return messages.join(" | ")
    }
  }
  return fallback
}

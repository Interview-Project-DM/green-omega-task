import { useEffect, useState } from 'react'

interface UserData {
  user_id: string
  clerk_id: string
  email: string
  created_at: string
}

interface UseUserSyncReturn {
  userData: UserData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useUserSync(): UseUserSyncReturn {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUserData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/me')

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized - please sign in again')
        }
        throw new Error(`Failed to fetch user data: ${response.status}`)
      }

      const data = await response.json()
      setUserData(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user data'
      setError(errorMessage)
      console.error('Error fetching user data:', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserData()
  }, [])

  return {
    userData,
    loading,
    error,
    refetch: fetchUserData
  }
}

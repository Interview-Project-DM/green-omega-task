'use client'

import { useUserSync } from '@/hooks/use-user-sync'
import { useEffect } from 'react'

interface GlobalUserSyncProps {
  children: React.ReactNode
}

export function GlobalUserSync({ children }: GlobalUserSyncProps) {
  const { userData, loading, error } = useUserSync()

  // This component runs the user sync in the background
  // It doesn't render anything, just ensures the sync happens
  useEffect(() => {
    if (userData) {
      console.log('Global user sync completed:', {
        userId: userData.user_id,
        clerkId: userData.clerk_id,
        email: userData.email
      })
    }

    if (error) {
      console.warn('Global user sync error:', error)
    }
  }, [userData, error])

  return <>{children}</>
}

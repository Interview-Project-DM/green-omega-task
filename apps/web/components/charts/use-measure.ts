"use client"

import { useEffect, useRef, useState } from "react"

interface Size {
  width: number
  height: number
}

export function useMeasure<T extends HTMLElement>(initialHeight = 0): {
  ref: React.MutableRefObject<T | null>
  width: number
  height: number
} {
  const ref = useRef<T | null>(null)
  const [size, setSize] = useState<Size>({
    width: 0,
    height: initialHeight,
  })

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const element = ref.current
    if (!element) {
      return
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setSize({ width, height })
      }
    })

    observer.observe(element)
    setSize({ width: element.clientWidth, height: element.clientHeight })

    return () => {
      observer.disconnect()
    }
  }, [])

  return { ref, width: size.width, height: size.height }
}

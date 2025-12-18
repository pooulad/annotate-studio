import { useCallback, useRef } from "react"

export function useThrottle<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef(0)
  const lastArgs = useRef<any[]>([])
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  return useCallback(
    ((...args: any[]) => {
      const now = Date.now()
      lastArgs.current = args

      if (now - lastCall.current >= delay) {
        lastCall.current = now
        callback(...args)
      } else if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          lastCall.current = Date.now()
          callback(...lastArgs.current)
          timeoutRef.current = null
        }, delay - (now - lastCall.current))
      }
    }) as T,
    [callback, delay]
  )
}

export function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  return useCallback(
    ((...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    }) as T,
    [callback, delay]
  )
}

export function useRaf<T extends (...args: any[]) => void>(callback: T): T {
  const rafRef = useRef<number | null>(null)
  const argsRef = useRef<any[]>([])

  return useCallback(
    ((...args: any[]) => {
      argsRef.current = args
      if (rafRef.current) return
      
      rafRef.current = requestAnimationFrame(() => {
        callback(...argsRef.current)
        rafRef.current = null
      })
    }) as T,
    [callback]
  )
}

export const rafBatch = (() => {
  let pending: (() => void)[] = []
  let scheduled = false

  return (fn: () => void) => {
    pending.push(fn)
    if (!scheduled) {
      scheduled = true
      requestAnimationFrame(() => {
        const batch = pending
        pending = []
        scheduled = false
        batch.forEach(f => f())
      })
    }
  }
})()


import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    // Check if window exists (for SSR compatibility)
    if (typeof window === 'undefined') return
    
    // Initial check function
    const checkIsMobile = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    
    // Set the initial value
    checkIsMobile()
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIsMobile)
    
    // Clean up
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  return isMobile
}

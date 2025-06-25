"use client"

import { useEffect, useState } from "react"
import MailInterface from "./MailInterface"
import MobileMailInterface from "./MobileMailInterface"

export default function ResponsiveMailInterface() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkScreenSize()
    window.addEventListener("resize", checkScreenSize)

    return () => window.removeEventListener("resize", checkScreenSize)
  }, [])

  return isMobile ? <MobileMailInterface /> : <MailInterface />
}

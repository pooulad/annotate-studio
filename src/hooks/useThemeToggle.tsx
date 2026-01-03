"use client"

import { useTheme } from "@/components/ThemeProvider"

export default function useThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggle = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  return { theme, toggle }
}

import type { ThemeMode } from "@/types/config/theme"
import { atom } from "jotai"
import { DEFAULT_THEME_MODE, themeModeSchema } from "@/types/config/theme"
import { THEME_STORAGE_KEY } from "../constants/config"
import {
  isExtensionContextAlive,
  isExtensionContextInvalidatedError,
} from "../error/extension-context"
import { logger } from "../logger"
import { storageAdapter } from "./storage-adapter"

// Private base atom. Only export this for top-level hydration before ThemeProvider mounts.
export const baseThemeModeAtom = atom<ThemeMode>(DEFAULT_THEME_MODE)

// Public atom with read/write - write always goes through storageAdapter
export const themeModeAtom = atom(
  (get) => get(baseThemeModeAtom),
  async (get, set, newValue: ThemeMode) => {
    const prev = get(baseThemeModeAtom)
    set(baseThemeModeAtom, newValue)
    try {
      await storageAdapter.set(THEME_STORAGE_KEY, newValue, themeModeSchema)
    } catch (error) {
      console.error("Failed to set themeMode to storage:", newValue, error)
      set(baseThemeModeAtom, prev)
    }
  },
)

baseThemeModeAtom.onMount = (setAtom: (newValue: ThemeMode) => void) => {
  let active = true
  let reading = false
  let unwatch: (() => void) | undefined

  const stop = () => {
    if (!active) return
    active = false
    document.removeEventListener("visibilitychange", handleVisibilityChange)
    try {
      unwatch?.()
    } catch (error) {
      if (!isExtensionContextInvalidatedError(error))
        logger.error("Theme listener cleanup failed", error)
    }
  }

  async function refresh() {
    if (!active || reading) return
    if (!isExtensionContextAlive()) {
      stop()
      return
    }
    reading = true
    try {
      const value = await storageAdapter.get<ThemeMode>(
        THEME_STORAGE_KEY,
        DEFAULT_THEME_MODE,
        themeModeSchema,
      )
      if (active && isExtensionContextAlive()) setAtom(value)
    } catch (error) {
      if (isExtensionContextInvalidatedError(error)) stop()
      else logger.error("Failed to read theme from storage", error)
    } finally {
      reading = false
    }
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "visible") void refresh()
  }

  if (!isExtensionContextAlive()) return stop
  try {
    unwatch = storageAdapter.watch<ThemeMode>(THEME_STORAGE_KEY, (value) => {
      if (active) setAtom(value)
    })
  } catch (error) {
    if (isExtensionContextInvalidatedError(error)) {
      stop()
      return stop
    }
    throw error
  }
  document.addEventListener("visibilitychange", handleVisibilityChange)
  void refresh()
  return stop
}

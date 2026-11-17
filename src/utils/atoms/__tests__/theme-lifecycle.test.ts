// @vitest-environment jsdom
import { createStore } from "jotai"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { browser } from "#imports"
import { baseThemeModeAtom } from "../theme"

const { read, watch, unwatch } = vi.hoisted(() => ({
  read: vi.fn<() => Promise<string>>(),
  watch: vi.fn<() => () => void>(),
  unwatch: vi.fn<() => void>(),
}))
vi.mock("../storage-adapter", () => ({
  storageAdapter: { get: read, watch, set: vi.fn<() => Promise<void>>() },
}))
const liveId = browser.runtime.id
const tick = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0))
}
let unsubscribe: (() => void) | undefined
const loseContext = () =>
  Object.defineProperty(browser.runtime, "id", { configurable: true, value: undefined })
beforeEach(() => {
  read.mockReset().mockResolvedValue("dark")
  watch.mockReset().mockReturnValue(unwatch)
  unwatch.mockReset()
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" })
})
afterEach(() => {
  unsubscribe?.()
  unsubscribe = undefined
  Object.defineProperty(browser.runtime, "id", { configurable: true, value: liveId })
})
describe("theme lifecycle after extension reload", () => {
  it("stops reads when an old tab becomes visible after reload", async () => {
    const store = createStore()
    unsubscribe = store.sub(baseThemeModeAtom, () => {})
    await tick()
    expect(store.get(baseThemeModeAtom)).toBe("dark")
    loseContext()
    document.dispatchEvent(new Event("visibilitychange"))
    document.dispatchEvent(new Event("visibilitychange"))
    await tick()
    expect(read).toHaveBeenCalledTimes(1)
    expect(unwatch).toHaveBeenCalledTimes(1)
  })
  it("handles invalidation during an in-flight storage read without an unhandled rejection", async () => {
    read.mockRejectedValueOnce(new Error("Extension context invalidated."))
    unwatch.mockImplementation(() => {
      throw new Error("Extension context invalidated.")
    })
    const store = createStore()
    unsubscribe = store.sub(baseThemeModeAtom, () => {})
    await tick()
    document.dispatchEvent(new Event("visibilitychange"))
    await tick()
    expect(read).toHaveBeenCalledTimes(1)
    expect(unwatch).toHaveBeenCalledTimes(1)
  })
  it("discards a result that arrives after unmount", async () => {
    let resolve!: (value: string) => void
    read.mockImplementationOnce(
      () =>
        new Promise<string>((done) => {
          resolve = done
        }),
    )
    const store = createStore()
    unsubscribe = store.sub(baseThemeModeAtom, () => {})
    const previous = store.get(baseThemeModeAtom)
    unsubscribe()
    unsubscribe = undefined
    resolve(previous === "dark" ? "light" : "dark")
    await tick()
    expect(store.get(baseThemeModeAtom)).toBe(previous)
  })
  it("can retry an ordinary storage failure on the next visibility change", async () => {
    read.mockRejectedValueOnce(new Error("Temporary storage failure"))
    const store = createStore()
    unsubscribe = store.sub(baseThemeModeAtom, () => {})
    await tick()
    document.dispatchEvent(new Event("visibilitychange"))
    await tick()
    expect(read).toHaveBeenCalledTimes(2)
    expect(store.get(baseThemeModeAtom)).toBe("dark")
  })
})

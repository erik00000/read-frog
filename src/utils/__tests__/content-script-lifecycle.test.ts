// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { ContentScriptContext } from "wxt/utils/content-script-context"
import { browser } from "#imports"
import { watchContentScriptContext } from "../content-script-lifecycle"

const liveId = browser.runtime.id
const contexts: ContentScriptContext[] = []
afterEach(() => {
  contexts.splice(0).forEach((ctx) => ctx.abort())
  Object.defineProperty(browser.runtime, "id", { configurable: true, value: liveId })
  vi.useRealTimers()
})
describe("stale content script cleanup", () => {
  it.each(["visibilitychange", "timer"])(
    "unmounts stale UI through %s and clears its timer",
    (trigger) => {
      vi.useFakeTimers()
      const ctx = new ContentScriptContext("selection")
      contexts.push(ctx)
      vi.advanceTimersByTime(0)
      const removeUI = vi.fn<() => void>()
      ctx.onInvalidated(removeUI)
      watchContentScriptContext(ctx)
      expect(removeUI).not.toHaveBeenCalled()
      Object.defineProperty(browser.runtime, "id", { configurable: true, value: undefined })
      if (trigger === "timer") vi.advanceTimersByTime(1500)
      else document.dispatchEvent(new Event("visibilitychange"))
      expect(removeUI).toHaveBeenCalledTimes(1)
      expect(vi.getTimerCount()).toBe(0)
      document.dispatchEvent(new Event("visibilitychange"))
      expect(removeUI).toHaveBeenCalledTimes(1)
    },
  )
})

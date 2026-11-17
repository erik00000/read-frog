import type { ContentScriptContext } from "#imports"

/** Detect reloads even while an old page is idle, then let WXT unmount its UI. */
export function watchContentScriptContext(ctx: ContentScriptContext): void {
  if (ctx.isInvalid) return
  const check = () => {
    // Reading isValid triggers WXT's invalidation callbacks when runtime.id disappears.
    void ctx.isValid
  }
  ctx.addEventListener(document, "visibilitychange", check, { capture: true })
  ctx.addEventListener(window, "focus", check, { capture: true })
  ctx.setInterval(check, 1500)
  check()
}

import "@/utils/zod-config"
import { defineContentScript } from "#imports"
import { getLocalConfig } from "@/utils/config/storage"
import { watchContentScriptContext } from "@/utils/content-script-lifecycle"
import { initI18n } from "@/utils/i18n"
import {
  clearEffectiveSiteControlUrl,
  getEffectiveSiteControlUrl,
  isSiteEnabled,
} from "@/utils/site-control"

declare global {
  interface Window {
    __READ_FROG_HOST_INJECTED__?: boolean
  }
}

export default defineContentScript({
  matches: ["*://*/*", "file:///*"],
  cssInjectionMode: "manual",
  async main(ctx) {
    watchContentScriptContext(ctx)
    if (ctx.isInvalid) return
    // Prevent double injection (manifest-based + programmatic injection)
    if (window.__READ_FROG_HOST_INJECTED__) return
    window.__READ_FROG_HOST_INJECTED__ = true

    const initialConfig = await getLocalConfig()
    const siteControlUrl = getEffectiveSiteControlUrl(window.location.href)

    if (!isSiteEnabled(siteControlUrl, initialConfig)) {
      window.__READ_FROG_HOST_INJECTED__ = false
      clearEffectiveSiteControlUrl()
      return
    }

    await initI18n(initialConfig?.uiLanguage)

    const { bootstrapHostContent } = await import("./runtime")
    if (ctx.isInvalid) return
    await bootstrapHostContent(ctx, initialConfig)
  },
})

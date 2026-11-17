import { ArrowUpRight, Settings2 } from "lucide-react"
import { browser } from "#imports"
import { DoubaoBrand } from "@/components/doubao/brand"
import { openOptionsPage } from "@/utils/navigation"
import { version } from "../../../package.json"
import { DoubaoAccountStatus } from "./components/doubao-account-status"
import { DoubaoServiceSwitcher } from "./components/doubao-service-switcher"
import LanguageOptionsSelector from "./components/language-options-selector"
import TranslateButton from "./components/translate-button"

export default function App() {
  return (
    <div className="bg-background text-foreground">
      <header className="flex items-center justify-between border-b px-5 py-4">
        <DoubaoBrand />
        <button
          type="button"
          aria-label="打开设置"
          title="打开设置"
          className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-emerald-600"
          onClick={() => void openOptionsPage()}
        >
          <Settings2 className="size-5" />
        </button>
      </header>
      <main className="flex flex-col gap-4 p-5">
        <DoubaoAccountStatus />
        <LanguageOptionsSelector />
        <DoubaoServiceSwitcher />
        <TranslateButton className="h-11 w-full rounded-xl bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700" />
      </main>
      <footer className="flex items-center justify-between border-t px-5 py-3 text-xs text-muted-foreground">
        <button
          type="button"
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() =>
            void browser.tabs.create({ url: browser.runtime.getURL("/translation-hub.html") })
          }
        >
          打开翻译中心 <ArrowUpRight className="size-3.5" />
        </button>
        <span>v{version}</span>
      </footer>
    </div>
  )
}

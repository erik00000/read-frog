import { IconSearch } from "@tabler/icons-react"
import { useSetAtom } from "jotai"
import { DoubaoBrand } from "@/components/doubao/brand"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/base-ui/input-group"
import { Kbd } from "@/components/ui/base-ui/kbd"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/base-ui/sidebar"
import { i18n } from "@/utils/i18n"
import { getCommandPaletteShortcutHint } from "@/utils/os"
import { version } from "../../../../package.json"
import { commandPaletteOpenAtom } from "../command-palette/atoms"
import { CollapseToggle } from "./collapse-toggle"
import { FeaturesNav } from "./features-nav"
import { SettingsNav } from "./settings-nav"

export function AppSidebar() {
  const setCommandPaletteOpen = useSetAtom(commandPaletteOpenAtom)
  const commandPaletteShortcutHint = getCommandPaletteShortcutHint()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="transition-all group-data-[state=expanded]:px-5 group-data-[state=expanded]:pt-4">
        <div className="pt-2 pb-5">
          <DoubaoBrand />
        </div>
        <InputGroup onClick={() => setCommandPaletteOpen(true)} className="bg-background">
          <InputGroupInput
            readOnly
            placeholder={i18n.t("options.commandPalette.placeholder")}
            className="cursor-pointer"
          />
          <InputGroupAddon>
            <IconSearch className="size-4 text-muted-foreground group-data-[state=collapsed]:-mx-px" />
          </InputGroupAddon>
          <InputGroupAddon align="inline-end" className="group-data-[state=collapsed]:hidden">
            <Kbd>{commandPaletteShortcutHint}</Kbd>
          </InputGroupAddon>
        </InputGroup>
      </SidebarHeader>
      <SidebarContent className="transition-all group-data-[state=expanded]:px-2">
        <SettingsNav />
        <FeaturesNav />
      </SidebarContent>
      <SidebarFooter className="transition-all group-data-[state=expanded]:px-2">
        <div className="px-3 py-4 text-xs leading-6 text-muted-foreground group-data-[state=collapsed]:hidden">
          <p>豆包翻译 · v{version}</p>
          <a
            href="https://github.com/erik00000/read-frog"
            target="_blank"
            rel="noreferrer"
            className="hover:text-emerald-600"
          >
            使用说明与反馈 ↗
          </a>
        </div>
      </SidebarFooter>
      <CollapseToggle />
    </Sidebar>
  )
}

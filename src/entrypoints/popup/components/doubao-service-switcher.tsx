import { Icon } from "@iconify/react"
import { useAtomValue, useSetAtom } from "jotai"
import { configAtom, writeConfigAtom } from "@/utils/atoms/config"
import {
  DOUBAO_PROVIDER_DESCRIPTIONS,
  DOUBAO_PROVIDER_LABELS,
  DOUBAO_PROVIDER_TYPES,
  getDoubaoProviderId,
} from "@/utils/constants/doubao"
import { buildFeatureProviderPatch } from "@/utils/constants/feature-providers"
import { THIRD_PARTY_PROVIDER_ID } from "@/utils/providers/third-party"
import { cn } from "@/utils/styles/utils"

/**
 * Switch the three translation features together, including a configured third-party API.
 */
export function DoubaoServiceSwitcher() {
  const config = useAtomValue(configAtom)
  const writeConfig = useSetAtom(writeConfigAtom)
  const activeProviderId = config.pageTranslation.providerId

  const services = DOUBAO_PROVIDER_TYPES.map((provider) => ({
    id: getDoubaoProviderId(provider),
    name: DOUBAO_PROVIDER_LABELS[provider],
    description: DOUBAO_PROVIDER_DESCRIPTIONS[provider],
  })).filter((service) =>
    config.providersConfig.some((item) => item.id === service.id && item.enabled),
  )
  const thirdParty = config.providersConfig.find(
    (item) => item.id === THIRD_PARTY_PROVIDER_ID && item.enabled,
  )
  const availableServices = thirdParty
    ? [
        ...services,
        { id: thirdParty.id, name: thirdParty.name, description: "使用自己的 API Key 翻译" },
      ]
    : services

  const selectService = (providerId: string) => {
    if (providerId === activeProviderId) return
    void writeConfig(
      buildFeatureProviderPatch({
        pageTranslation: providerId,
        selectionTranslation: providerId,
        inputTranslation: providerId,
      }),
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="px-1 text-[13px] font-medium">翻译服务</span>
      <div className="flex flex-col gap-1">
        {availableServices.map((service) => {
          const active = service.id === activeProviderId
          return (
            <button
              key={service.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                selectService(service.id)
              }}
              className={cn(
                "flex w-full cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                active
                  ? "border-accent-blue bg-accent-blue/8"
                  : "border-transparent hover:bg-muted",
              )}
            >
              <Icon
                icon={active ? "tabler:circle-check-filled" : "tabler:circle"}
                className={cn("mt-0.5 size-4 shrink-0", active && "text-accent-blue")}
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[13px] font-medium">{service.name}</span>
                <span className="text-[12px] leading-4 text-muted-foreground">
                  {service.description}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

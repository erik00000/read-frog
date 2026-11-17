import type { Config } from "@/types/config/config"
import type { DoubaoAuthRecord } from "@/utils/doubao-auth"
import { Icon } from "@iconify/react"
import { useAtomValue, useSetAtom } from "jotai"
import { useEffect, useState } from "react"
import { Link } from "react-router"
import { Badge } from "@/components/ui/base-ui/badge"
import { Button } from "@/components/ui/base-ui/button"
import { Switch } from "@/components/ui/base-ui/switch"
import { configAtom, configFieldsAtomMap, writeConfigAtom } from "@/utils/atoms/config"
import { patchProviderConfigAtom } from "@/utils/atoms/entity-config"
import {
  DOUBAO_PROVIDER_DESCRIPTIONS,
  DOUBAO_PROVIDER_LABELS,
  DOUBAO_PROVIDER_TYPES,
  getDoubaoProviderId,
} from "@/utils/constants/doubao"
import { buildFeatureProviderPatch } from "@/utils/constants/feature-providers"
import { DEFAULT_PROVIDER_CONFIG_LIST } from "@/utils/constants/providers"
import { getDoubaoAuth } from "@/utils/doubao-auth"
import { cn } from "@/utils/styles/utils"

/**
 * 「翻译服务」页 —— 只有豆包三个服务，共用同一个豆包登录态。
 *
 * 刻意不索引 `PROVIDER_ITEMS[id]` 取 logo / sponsor：provider 注册由另一条线负责，
 * 本页按 `DOUBAO_PROVIDER_TYPES` 契约渲染，注册还没落地也编译得过。
 *
 * 这里**不出现** model / reasoning / providerOptions / providerSpecificSettings /
 * baseURL / apiKey —— 引擎由服务本身决定，这些字段在本产品里没有意义。
 */

const FEATURE_ROWS = [
  { key: "pageTranslation", label: "页面翻译" },
  { key: "selectionTranslation", label: "划词翻译" },
  { key: "inputTranslation", label: "输入翻译" },
] as const

function getFeatureProviderIds(config: Config): Record<string, string> {
  return {
    pageTranslation: config.pageTranslation.providerId,
    selectionTranslation: config.selectionToolbar.features.translate.providerId,
    inputTranslation: config.inputTranslation.providerId,
  }
}

function getLoginView(record: DoubaoAuthRecord | null) {
  if (!record) {
    return {
      label: "未登录",
      className: "bg-muted text-muted-foreground",
      hint: "还没有采集到豆包登录态，翻译请求会被服务端判为未登录。",
    }
  }
  if (record.status === "valid") {
    return {
      label: "已登录",
      className: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
      hint: "豆包登录检查已通过；翻译是否可用仍取决于接口状态及账号额度。",
    }
  }
  if (record.status === "expired") {
    return {
      label: "登录已过期",
      className: "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
      hint: "豆包返回 710012001，需要重新登录后再次获取 Cookie。",
    }
  }
  return {
    label: "未验证",
    className: "bg-muted text-muted-foreground",
    hint: "登录态已保存但还没验证过，建议去豆包账号页跑一次鉴权探针。",
  }
}

export function DoubaoServiceList() {
  const config = useAtomValue(configAtom)
  const providersConfig = useAtomValue(configFieldsAtomMap.providersConfig)
  const setProvidersConfig = useSetAtom(configFieldsAtomMap.providersConfig)
  const writeConfig = useSetAtom(writeConfigAtom)
  const patchProviderConfig = useSetAtom(patchProviderConfigAtom)
  const [auth, setAuth] = useState<DoubaoAuthRecord | null>(null)

  useEffect(() => {
    let active = true
    void getDoubaoAuth().then((next) => {
      if (active) setAuth(next)
    })
    return () => {
      active = false
    }
  }, [])

  const login = getLoginView(auth)
  const featureProviderIds = getFeatureProviderIds(config)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex items-center gap-2 text-sm font-medium">
            豆包登录态
            <Badge variant="secondary" className={cn("font-normal", login.className)}>
              {login.label}
            </Badge>
          </span>
          <span className="text-[13px] text-muted-foreground">{login.hint}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<Link to="/doubao-account" />}
          className="shrink-0"
        >
          <Icon icon="tabler:user-circle" className="size-4" />
          去豆包账号
        </Button>
      </div>

      <div className="doubao-services-grid">
        {DOUBAO_PROVIDER_TYPES.map((provider) => {
          const id = getDoubaoProviderId(provider)
          const entry = providersConfig.find((item) => item.id === id) ?? null
          // provider 注册还没落地时（或老配置里没有这条记录），拿默认配置当模板补一条。
          const template = entry
            ? null
            : (DEFAULT_PROVIDER_CONFIG_LIST.find((item) => item.id === id) ?? null)
          const enabled = entry?.enabled ?? template?.enabled ?? true
          const canToggle = entry !== null || template !== null
          const assignedFeatures = FEATURE_ROWS.filter(({ key }) => featureProviderIds[key] === id)
          const isDefault = assignedFeatures.length === FEATURE_ROWS.length

          return (
            <div
              key={provider}
              data-provider-id={id}
              className={cn(
                "flex flex-col gap-5 rounded-2xl border bg-background p-5 transition-colors",
                isDefault && "border-emerald-600/60 bg-emerald-500/5",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {DOUBAO_PROVIDER_LABELS[provider].replace("豆包翻译 · ", "")}
                    {isDefault && (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/15 font-normal text-emerald-700 dark:text-emerald-300"
                      >
                        当前默认
                      </Badge>
                    )}
                    {!enabled && (
                      <Badge variant="secondary" className="font-normal">
                        已停用
                      </Badge>
                    )}
                  </span>
                  <span className="text-[13px] leading-[18px] text-muted-foreground">
                    {DOUBAO_PROVIDER_DESCRIPTIONS[provider]}
                  </span>
                </div>
                <Switch
                  aria-label={`${DOUBAO_PROVIDER_LABELS[provider].replace("豆包翻译 · ", "")} 启用`}
                  checked={enabled}
                  disabled={!canToggle}
                  onCheckedChange={(checked) => {
                    if (template) {
                      // 配置里还没有这条 provider 记录：按默认配置补一条。
                      void setProvidersConfig([
                        ...providersConfig.filter((item) => item.id !== id),
                        { ...template, enabled: checked },
                      ])
                      return
                    }
                    void patchProviderConfig({ id, changes: { enabled: checked } })
                  }}
                />
              </div>

              <div className="mt-auto flex flex-col items-start gap-3 border-t pt-4">
                <span className="text-[13px] text-muted-foreground">
                  {assignedFeatures.length === 0
                    ? "未分配给任何功能"
                    : `已用于 ${assignedFeatures.map((row) => row.label).join(" / ")}`}
                </span>
                {!isDefault && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!enabled}
                    onClick={() => {
                      void writeConfig(
                        buildFeatureProviderPatch({
                          pageTranslation: id,
                          selectionTranslation: id,
                          inputTranslation: id,
                        }),
                      )
                    }}
                  >
                    设为默认
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-[13px] text-muted-foreground">
        这三个豆包服务共用同一份登录 Cookie，只是翻译引擎不同。 如需使用自己的 API
        Key，请配置下方的第三方 API 翻译。
      </p>
    </div>
  )
}

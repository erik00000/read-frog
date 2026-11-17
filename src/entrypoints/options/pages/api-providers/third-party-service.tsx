import { useAtomValue, useSetAtom } from "jotai"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/base-ui/badge"
import { Button } from "@/components/ui/base-ui/button"
import { Input } from "@/components/ui/base-ui/input"
import { isLLMProviderConfig } from "@/types/config/provider"
import { configAtom, writeConfigAtom } from "@/utils/atoms/config"
import { buildFeatureProviderPatch } from "@/utils/constants/feature-providers"
import { executeTranslate } from "@/utils/host/translate/execute-translate"
import { getTranslatePrompt } from "@/utils/prompts/translate"
import {
  buildThirdPartyProvider,
  fetchThirdPartyModels,
  getPreferredTerraModel,
  THIRD_PARTY_PROVIDER_ID,
} from "@/utils/providers/third-party"

export function ThirdPartyService() {
  const config = useAtomValue(configAtom)
  const writeConfig = useSetAtom(writeConfigAtom)
  const existing = config.providersConfig.find((item) => item.id === THIRD_PARTY_PROVIDER_ID)
  const savedModel =
    existing && isLLMProviderConfig(existing) ? (existing.model.customModel ?? "") : ""
  const savedBaseURL = existing && "baseURL" in existing ? (existing.baseURL ?? "") : ""
  const savedKey = existing && "apiKey" in existing ? (existing.apiKey ?? "") : ""
  const [name, setName] = useState(existing?.name ?? "第三方 API 翻译")
  const [baseURL, setBaseURL] = useState(savedBaseURL)
  const [apiKey, setApiKey] = useState(savedKey)
  const [model, setModel] = useState(savedModel)
  const [showKey, setShowKey] = useState(false)
  const [busy, setBusy] = useState(false)
  const [modelList, setModelList] = useState<{
    baseURL: string
    apiKey: string
    ids: string[]
  } | null>(null)
  const availableModels =
    modelList?.baseURL === baseURL && modelList.apiKey === apiKey ? modelList.ids : []
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null)
  const isDefault = [
    config.pageTranslation.providerId,
    config.selectionToolbar.features.translate.providerId,
    config.inputTranslation.providerId,
  ].every((id) => id === THIRD_PARTY_PROVIDER_ID)

  // Synchronize with configuration saved by another extension page or storage hydration.
  /* oxlint-disable react/set-state-in-effect */
  useEffect(() => {
    setName(existing?.name ?? "第三方 API 翻译")
    setBaseURL(savedBaseURL)
    setApiKey(savedKey)
    setModel(savedModel)
  }, [existing?.name, savedBaseURL, savedKey, savedModel])
  /* oxlint-enable react/set-state-in-effect */

  async function loadModels() {
    setBusy(true)
    setFeedback(null)
    setModelList(null)
    try {
      const ids = await fetchThirdPartyModels(baseURL, apiKey)
      setModelList({ baseURL, apiKey, ids })
      const preferred = getPreferredTerraModel(ids)
      if (!ids.includes(model) && preferred) setModel(preferred)
      setFeedback({
        error: false,
        text: `已获取 ${ids.length} 个模型。${preferred ? `优先推荐 ${preferred}，请保存后测试翻译。` : "请从列表选择用于翻译的模型。"}`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setFeedback({
        error: true,
        text: apiKey.trim() ? message.split(apiKey.trim()).join("[API Key]") : message,
      })
    } finally {
      setBusy(false)
    }
  }

  async function save(action: "save" | "default" | "test") {
    setBusy(true)
    setFeedback(null)
    try {
      const provider = buildThirdPartyProvider({ name, baseURL, apiKey, model })
      await writeConfig((current) => ({
        providersConfig: [
          ...current.providersConfig.filter((item) => item.id !== provider.id),
          provider,
        ],
        ...(action === "default"
          ? buildFeatureProviderPatch({
              pageTranslation: provider.id,
              selectionTranslation: provider.id,
              inputTranslation: provider.id,
            })
          : {}),
      }))
      if (action === "test") {
        const translated = await executeTranslate(
          "Hello, world!",
          { ...config.language, sourceCode: "eng", targetCode: "cmn" },
          provider,
          getTranslatePrompt,
          { signal: AbortSignal.timeout(30_000) },
        )
        if (!translated.trim()) throw new Error("接口没有返回译文，请检查模型和接口格式。")
        setFeedback({ error: false, text: `测试成功：${translated}` })
      } else {
        setFeedback({
          error: false,
          text:
            action === "default"
              ? "已保存，页面翻译、划词翻译和输入翻译已切换到第三方 API。"
              : "已保存，可在翻译中心选择此服务，或将它设为默认。",
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const safeMessage = apiKey.trim() ? message.split(apiKey.trim()).join("[API Key]") : message
      setFeedback({ error: true, text: safeMessage })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      className="flex flex-col gap-4 rounded-2xl border bg-background p-6"
      aria-label="第三方 API 翻译"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold">第三方 API 翻译</h2>
        {isDefault && <Badge variant="secondary">当前默认</Badge>}
      </div>
      <p className="text-[13px] text-muted-foreground">
        使用服务商提供的 API Key 和模型，无需登录豆包。支持 OpenAI 兼容的 /chat/completions 接口。
      </p>
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          服务名称
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          模型 ID
          <Input
            value={model}
            placeholder="服务商提供的模型名称"
            onChange={(event) => setModel(event.target.value)}
          />
        </label>
        <div className="flex flex-col gap-2 text-sm sm:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="third-party-model-list">可用模型</label>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void loadModels()}
            >
              获取模型
            </Button>
          </div>
          <select
            id="third-party-model-list"
            className="h-8 rounded-md border bg-background px-2 text-sm"
            disabled={busy || !availableModels.length}
            value={availableModels.includes(model) ? model : ""}
            onChange={(event) => setModel(event.target.value)}
          >
            <option value="">
              {availableModels.length ? "请选择翻译模型" : "填写地址和 API Key 后点击获取模型"}
            </option>
            {availableModels.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            优先推荐列表中的 6.1 Terra；未提供时推荐其他
            Terra。模型列表不含价格，费用以服务商计费为准，也可手动填写上方模型 ID。
          </span>
        </div>
        <div className="flex flex-col gap-2 text-sm sm:col-span-2">
          <label htmlFor="third-party-base-url">接口地址（Base URL）</label>
          <Input
            id="third-party-base-url"
            aria-describedby="third-party-base-url-hint"
            value={baseURL}
            placeholder="https://api.example.com/v1"
            spellCheck={false}
            onChange={(event) => setBaseURL(event.target.value)}
          />
          <span id="third-party-base-url-hint" className="text-xs text-muted-foreground">
            通常以 /v1 结尾；仅填写域名时自动补 /v1，也可粘贴完整的 /chat/completions 地址。
          </span>
        </div>
        <div className="flex flex-col gap-2 text-sm sm:col-span-2">
          <label htmlFor="third-party-api-key">API Key</label>
          <div className="flex gap-2">
            <Input
              id="third-party-api-key"
              value={apiKey}
              type={showKey ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              placeholder="填写服务商的 API Key"
              onChange={(event) => setApiKey(event.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowKey(!showKey)}
              aria-pressed={showKey}
            >
              {showKey ? "隐藏" : "显示"}
            </Button>
          </div>
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => void save("default")}>
          保存并设为默认
        </Button>
        <Button disabled={busy} variant="outline" onClick={() => void save("save")}>
          保存
        </Button>
        <Button disabled={busy} variant="outline" onClick={() => void save("test")}>
          {busy ? "处理中…" : "保存并测试翻译"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        测试会发送一句示例文本并消耗少量 API
        额度。密钥保存在扩展配置中，翻译文本会发送至你填写的服务商接口。
      </p>
      {feedback && (
        <p
          role={feedback.error ? "alert" : "status"}
          className={`text-sm break-words ${feedback.error ? "text-destructive" : "text-emerald-600"}`}
        >
          {feedback.text}
        </p>
      )}
    </section>
  )
}

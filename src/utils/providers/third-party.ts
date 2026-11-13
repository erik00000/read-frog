import type { LLMProviderConfig } from "@/types/config/provider"

export const THIRD_PARTY_PROVIDER_ID = "third-party-api-translation"

export interface ThirdPartyFields {
  name: string
  baseURL: string
  apiKey: string
  model: string
}

export function normalizeThirdPartyBaseURL(baseURL: string): string {
  let url: URL
  try {
    url = new URL(baseURL.trim())
  } catch {
    throw new Error("请填写完整的接口地址，例如 https://api.example.com/v1")
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("接口地址只支持 HTTP / HTTPS，请勿包含用户名、密码、查询参数或 # 片段。")
  }
  const normalized = url.href.replace(/\/+$/, "").replace(/\/(?:chat\/completions|models)$/, "")
  return new URL(normalized).pathname === "/" ? `${normalized}/v1` : normalized
}

function validateAPIKey(value: string): string {
  const apiKey = value.trim()
  if (!apiKey || /[\r\n]/.test(apiKey)) throw new Error("请填写有效的 API Key。")
  return apiKey
}

export async function fetchThirdPartyModels(baseURL: string, apiKey: string): Promise<string[]> {
  const response = await fetch(`${normalizeThirdPartyBaseURL(baseURL)}/models`, {
    headers: { Authorization: `Bearer ${validateAPIKey(apiKey)}`, Accept: "application/json" },
    credentials: "omit",
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok)
    throw new Error(
      `获取模型失败：HTTP ${response.status}。请检查接口地址、API Key 及模型访问权限。`,
    )
  const payload: unknown = await response.json().catch(() => null)
  const rows = payload && typeof payload === "object" && "data" in payload ? payload.data : null
  if (!Array.isArray(rows)) throw new Error("模型接口未返回有效的 data 列表，可手动填写模型 ID。")
  const ids = [
    ...new Set(
      rows.flatMap((row: unknown) => {
        if (!row || typeof row !== "object" || !("id" in row) || typeof row.id !== "string")
          return []
        const id = row.id.trim()
        return id ? [id] : []
      }),
    ),
  ].sort((a, b) => a.localeCompare(b))
  if (!ids.length) throw new Error("接口返回的模型列表为空，可手动填写模型 ID。")
  return ids
}

export function getPreferredTerraModel(ids: string[]): string | undefined {
  // A user preference, not a claim about the provider's pricing.
  return ["gpt-6.1-terra", "gpt-6-terra", "gpt-5.6-terra"]
    .map((preferred) => ids.find((id) => id.toLowerCase() === preferred))
    .find((id) => id !== undefined)
}

export function buildThirdPartyProvider(
  fields: ThirdPartyFields,
): Extract<LLMProviderConfig, { provider: "openai-compatible" }> {
  const baseURL = normalizeThirdPartyBaseURL(fields.baseURL)
  const apiKey = validateAPIKey(fields.apiKey)
  const model = fields.model.trim()
  if (!model) throw new Error("请填写服务商提供的模型 ID。")
  return {
    id: THIRD_PARTY_PROVIDER_ID,
    provider: "openai-compatible",
    name: fields.name.trim() || "第三方 API 翻译",
    enabled: true,
    baseURL,
    apiKey,
    model: { model: "use-custom-model", isCustomModel: true, customModel: model },
  }
}

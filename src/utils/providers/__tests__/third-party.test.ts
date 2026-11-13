import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { generateText } from "ai"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  buildThirdPartyProvider,
  fetchThirdPartyModels,
  getPreferredTerraModel,
  normalizeThirdPartyBaseURL,
} from "../third-party"

const fields = {
  name: "备用翻译",
  baseURL: "https://translator.example/v1/chat/completions/",
  apiKey: "test-key",
  model: "test-translation-model",
}

afterEach(() => vi.unstubAllGlobals())

describe("third-party translation", () => {
  it("loads and deduplicates actual model IDs with a bearer key and normalizes a root URL", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            { id: "gpt-6.1-sol" },
            { id: "gpt-6.1-terra" },
            { id: "gpt-6.1-terra" },
            { id: 9 },
            {},
          ],
        }),
      ),
    )
    vi.stubGlobal("fetch", fetchMock)
    const ids = await fetchThirdPartyModels("https://translator.example/", "test-key")
    expect(ids).toEqual(["gpt-6.1-sol", "gpt-6.1-terra"])
    expect(fetchMock).toHaveBeenCalledWith(
      "https://translator.example/v1/models",
      expect.objectContaining({
        credentials: "omit",
        headers: expect.objectContaining({ Authorization: "Bearer test-key" }),
      }),
    )
    expect(getPreferredTerraModel(ids)).toBe("gpt-6.1-terra")
    expect(getPreferredTerraModel(["gpt-6.1-sol"])).toBeUndefined()
    expect(
      normalizeThirdPartyBaseURL("https://translator.example/custom/v1/chat/completions/"),
    ).toBe("https://translator.example/custom/v1")
  })

  it("reports access errors and malformed or empty model lists", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("denied", { status: 401 }))
      .mockResolvedValueOnce(new Response("<html>homepage</html>"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] })))
    vi.stubGlobal("fetch", fetchMock)
    await expect(fetchThirdPartyModels(fields.baseURL, fields.apiKey)).rejects.toThrow("HTTP 401")
    await expect(fetchThirdPartyModels(fields.baseURL, fields.apiKey)).rejects.toThrow("data 列表")
    await expect(fetchThirdPartyModels(fields.baseURL, fields.apiKey)).rejects.toThrow(
      "模型列表为空",
    )
  })

  it("accepts a complete endpoint without doubling /chat/completions", async () => {
    const config = buildThirdPartyProvider(fields)
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            id: "chat-test",
            object: "chat.completion",
            created: 1,
            model: fields.model,
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: "你好，世界！" },
                finish_reason: "stop",
              },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
          { headers: { "content-type": "application/json" } },
        ),
    )
    vi.stubGlobal("fetch", fetchMock)
    const provider = createOpenAICompatible({
      name: "test",
      baseURL: config.baseURL,
      apiKey: config.apiKey,
    })
    const result = await generateText({
      model: provider.languageModel(fields.model),
      prompt: "Translate Hello, world! into Chinese",
      maxRetries: 0,
    })
    expect(result.text).toBe("你好，世界！")
    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("https://translator.example/v1/chat/completions")
    expect(new Headers(options.headers).get("authorization")).toBe("Bearer test-key")
    expect(JSON.parse(options.body as string)).toMatchObject({ model: fields.model })
  })

  it.each([
    "file:///secret",
    "https://user:pass@translator.example/v1",
    "https://translator.example/v1?key=secret",
  ])("rejects invalid API address %s", (baseURL) => {
    expect(() => buildThirdPartyProvider({ ...fields, baseURL })).toThrow("接口地址")
  })

  it("requires a model and a usable API key", () => {
    expect(() => buildThirdPartyProvider({ ...fields, model: " " })).toThrow("模型 ID")
    expect(() => buildThirdPartyProvider({ ...fields, apiKey: " " })).toThrow("API Key")
    expect(() => buildThirdPartyProvider({ ...fields, apiKey: "a\nb" })).toThrow("API Key")
  })
})

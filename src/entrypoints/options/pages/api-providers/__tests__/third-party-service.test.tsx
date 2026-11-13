// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { Provider, createStore } from "jotai"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { storage } from "#imports"
import { configAtom } from "@/utils/atoms/config"
import { CONFIG_STORAGE_KEY, DEFAULT_CONFIG } from "@/utils/constants/config"
import { THIRD_PARTY_PROVIDER_ID } from "@/utils/providers/third-party"
import { ThirdPartyService } from "../third-party-service"

const { executeTranslate } = vi.hoisted(() => ({
  executeTranslate: vi.fn<(...args: unknown[]) => Promise<string>>(),
}))
vi.mock("@/utils/host/translate/execute-translate", () => ({ executeTranslate }))
vi.mock("@/utils/prompts/translate", () => ({ getTranslatePrompt: vi.fn<() => void>() }))

beforeEach(async () => {
  await storage.clear("local")
  vi.clearAllMocks()
})
afterEach(cleanup)
afterEach(() => vi.unstubAllGlobals())

function setup() {
  const store = createStore()
  store.set(configAtom, structuredClone(DEFAULT_CONFIG))
  const view = render(
    <Provider store={store}>
      <ThirdPartyService />
    </Provider>,
  )
  fireEvent.change(screen.getByLabelText("模型 ID"), { target: { value: "test-model" } })
  fireEvent.change(screen.getByLabelText("接口地址（Base URL）"), {
    target: { value: "https://translator.example/v1/chat/completions" },
  })
  fireEvent.change(screen.getByLabelText("API Key"), { target: { value: "secret-test-key" } })
  return { store, ...view }
}

describe("ThirdPartyService", () => {
  it("recommends a returned Terra model, keeps a valid user choice and clears stale options", async () => {
    setup()
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockImplementation(
        async () =>
          new Response(
            JSON.stringify({
              data: [{ id: "gpt-6.1-terra" }, { id: "gpt-6.1-sol" }],
            }),
          ),
      ),
    )
    fireEvent.click(screen.getByRole("button", { name: "获取模型" }))
    await screen.findByRole("status")
    expect(screen.getByLabelText("模型 ID")).toHaveValue("gpt-6.1-terra")
    fireEvent.change(screen.getByLabelText("可用模型"), { target: { value: "gpt-6.1-sol" } })
    fireEvent.click(screen.getByRole("button", { name: "获取模型" }))
    await screen.findByRole("status")
    expect(screen.getByLabelText("模型 ID")).toHaveValue("gpt-6.1-sol")
    fireEvent.change(screen.getByLabelText("API Key"), { target: { value: "another-key" } })
    expect(screen.getByLabelText("可用模型")).toBeDisabled()
  })

  it("persists a usable provider and assigns all three translation features atomically", async () => {
    const { store, unmount } = setup()
    fireEvent.click(screen.getByRole("button", { name: "保存并设为默认" }))
    await screen.findByRole("status")
    const config = store.get(configAtom)
    expect(config.pageTranslation.providerId).toBe(THIRD_PARTY_PROVIDER_ID)
    expect(config.selectionToolbar.features.translate.providerId).toBe(THIRD_PARTY_PROVIDER_ID)
    expect(config.inputTranslation.providerId).toBe(THIRD_PARTY_PROVIDER_ID)
    expect(config.providersConfig.find((p) => p.id === THIRD_PARTY_PROVIDER_ID)).toMatchObject({
      provider: "openai-compatible",
      baseURL: "https://translator.example/v1",
      apiKey: "secret-test-key",
      model: { customModel: "test-model", isCustomModel: true },
    })
    expect(config.providersConfig.length).toBe(DEFAULT_CONFIG.providersConfig.length + 1)
    const persisted = await storage.getItem(`local:${CONFIG_STORAGE_KEY}`)
    expect(persisted).toMatchObject({ pageTranslation: { providerId: THIRD_PARTY_PROVIDER_ID } })
    unmount()
    render(
      <Provider store={store}>
        <ThirdPartyService />
      </Provider>,
    )
    expect(screen.getByLabelText("API Key")).toHaveValue("secret-test-key")
    expect(screen.getByLabelText("API Key")).toHaveAttribute("type", "password")
  })

  it("saves before testing the translation and rejects an empty translation", async () => {
    const { store } = setup()
    executeTranslate.mockImplementation(async () => {
      expect(await storage.getItem(`local:${CONFIG_STORAGE_KEY}`)).toMatchObject({
        providersConfig: expect.arrayContaining([
          expect.objectContaining({ id: THIRD_PARTY_PROVIDER_ID }),
        ]),
      })
      return ""
    })
    fireEvent.click(screen.getByRole("button", { name: "保存并测试翻译" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("没有返回译文")
    expect(store.get(configAtom).pageTranslation.providerId).toBe(
      DEFAULT_CONFIG.pageTranslation.providerId,
    )
  })

  it("shows successful test output and redacts a key reflected by an API error", async () => {
    setup()
    executeTranslate.mockResolvedValueOnce("你好，世界！")
    fireEvent.click(screen.getByRole("button", { name: "保存并测试翻译" }))
    expect(await screen.findByRole("status")).toHaveTextContent("测试成功：你好，世界！")
    executeTranslate.mockRejectedValueOnce(new Error("Invalid key secret-test-key"))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "保存并测试翻译" })).toBeEnabled(),
    )
    fireEvent.click(screen.getByRole("button", { name: "保存并测试翻译" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid key [API Key]")
    expect(screen.getByRole("alert")).not.toHaveTextContent("secret-test-key")
  })
})

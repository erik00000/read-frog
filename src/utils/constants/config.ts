import type { Config } from "@/types/config/config"
import type { FloatingButtonSide } from "@/types/config/floating-button"
import type { SelectionToolbarCustomAction } from "@/types/config/selection-toolbar"
import type { PageTranslateRange } from "@/types/config/translate"
import { BUILT_IN_AI_PROVIDER_ID } from "@/utils/providers/provider-registry"
import { BUILT_IN_DICTIONARY_ACTION_ID } from "./custom-action"
import { CUSTOM_ACTION_TEMPLATES } from "./custom-action-templates"
import { DOUBAO_DEFAULT_PROVIDER_TYPE, getDoubaoProviderId } from "./doubao"
import { DEFAULT_GLOSSARY_CONFIG } from "./glossary"
import {
  DEFAULT_SUBTITLE_TRANSLATE_PROMPTS_CONFIG,
  DEFAULT_TRANSLATE_PROMPTS_CONFIG,
} from "./prompt"
import { buildDefaultProviderConfigList, DEFAULT_PROVIDER_CONFIG_LIST } from "./providers"
import { DEFAULT_SELECTION_OVERLAY_OPACITY } from "./selection"
import { DEFAULT_SIDE_CONTENT_WIDTH } from "./side"
import {
  DEFAULT_BACKGROUND_OPACITY,
  DEFAULT_DISPLAY_MODE,
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SCALE,
  DEFAULT_FONT_WEIGHT,
  DEFAULT_SUBTITLE_COLOR,
  DEFAULT_SUBTITLE_POSITION,
  DEFAULT_SUBTITLES_TOGGLE_SHORTCUT_KEY,
  DEFAULT_TRANSLATION_POSITION,
} from "./subtitles"
import {
  DEFAULT_AUTO_TRANSLATE_SHORTCUT_KEY,
  DEFAULT_BATCH_CONFIG,
  DEFAULT_MIN_CHARACTERS_PER_NODE,
  DEFAULT_MIN_WORDS_PER_NODE,
  DEFAULT_PRELOAD_MARGIN,
  DEFAULT_PRELOAD_THRESHOLD,
  DEFAULT_REQUEST_CAPACITY,
  DEFAULT_REQUEST_RATE,
  DEFAULT_SELECTION_TRANSLATION_SHORTCUT_KEY,
  DEFAULT_TRANSLATION_MODE_SHORTCUT_KEY,
} from "./translate"
import { DEFAULT_TRANSLATION_HUB_SHORTCUT_KEY } from "./translation-hub"
import { TRANSLATION_NODE_STYLE_ON_INSTALLED } from "./translation-node-style"
import { DEFAULT_TTS_CONFIG } from "./tts"

export const CONFIG_STORAGE_KEY = "config"
export const LAST_SYNCED_CONFIG_STORAGE_KEY = "lastSyncedConfig"
export const GOOGLE_DRIVE_TOKEN_STORAGE_KEY = "__googleDriveToken"

export const THEME_STORAGE_KEY = "theme"
export const DEFAULT_DETECTED_CODE = "eng" as const
export const CONFIG_SCHEMA_VERSION = 101

export const DEFAULT_FLOATING_BUTTON_POSITION = 0.66
export const DEFAULT_FLOATING_BUTTON_SIDE: FloatingButtonSide = "right"

/**
 * 二次开发：翻译服务只剩豆包三个（火山 / 豆包 AI / 微软），新装一律默认到豆包 AI。
 * 所有「翻译类功能」的默认 providerId 都指向它，配置实例 id 由豆包契约统一生成。
 */
export const DEFAULT_TRANSLATE_PROVIDER_ID = getDoubaoProviderId(DOUBAO_DEFAULT_PROVIDER_TYPE)

/**
 * Build the code-owned Dictionary action definition in the current UI locale.
 * Only enabled/provider/Notebase state is persisted; callers merge those mutable
 * fields onto this definition at read time.
 */
export function createDefaultDictionaryAction(): SelectionToolbarCustomAction | null {
  const template = CUSTOM_ACTION_TEMPLATES.find((t) => t.id === "dictionary")
  if (!template) return null

  const action = template.createAction(BUILT_IN_AI_PROVIDER_ID)
  return {
    ...action,
    id: BUILT_IN_DICTIONARY_ACTION_ID,
    outputSchema: action.outputSchema.map((field) => ({
      ...field,
      id: field.id.startsWith("dictionary-")
        ? `default-${field.id}`
        : `default-dictionary-${field.id}`,
    })),
  }
}

export const DEFAULT_CONFIG: Config = {
  language: {
    sourceCode: "auto",
    targetCode: "cmn",
    level: "intermediate",
  },
  providersConfig: DEFAULT_PROVIDER_CONFIG_LIST,
  pageTranslation: {
    providerId: DEFAULT_TRANSLATE_PROVIDER_ID,
    mode: "bilingual",
    modeShortcut: DEFAULT_TRANSLATION_MODE_SHORTCUT_KEY,
    node: {
      enabled: false,
      hotkey: "control",
      forceRetranslation: false,
    },
    page: {
      range: "all",
      autoTranslatePatterns: ["*.news.ycombinator.com"],
      neverAutoTranslatePatterns: [],
      autoTranslateLanguages: [],
      shortcut: DEFAULT_AUTO_TRANSLATE_SHORTCUT_KEY,
      preload: {
        margin: DEFAULT_PRELOAD_MARGIN,
        threshold: DEFAULT_PRELOAD_THRESHOLD,
      },
      minCharactersPerNode: DEFAULT_MIN_CHARACTERS_PER_NODE,
      minWordsPerNode: DEFAULT_MIN_WORDS_PER_NODE,
      enableTargetLanguageSkip: true,
      skipLanguages: [],
    },
    enableAIContentAware: false,
    customPromptsConfig: DEFAULT_TRANSLATE_PROMPTS_CONFIG,
    requestQueueConfig: {
      capacity: DEFAULT_REQUEST_CAPACITY,
      rate: DEFAULT_REQUEST_RATE,
    },
    batchQueueConfig: {
      maxCharactersPerBatch: DEFAULT_BATCH_CONFIG.maxCharactersPerBatch,
      maxItemsPerBatch: DEFAULT_BATCH_CONFIG.maxItemsPerBatch,
    },
    translationNodeStyle: {
      preset: TRANSLATION_NODE_STYLE_ON_INSTALLED,
      isCustom: false,
      customCSS: null,
    },
  },
  languageDetection: {
    mode: "basic",
  },
  tts: DEFAULT_TTS_CONFIG,
  floatingButton: {
    enabled: true,
    position: DEFAULT_FLOATING_BUTTON_POSITION,
    side: DEFAULT_FLOATING_BUTTON_SIDE,
    disabledFloatingButtonPatterns: [],
    clickAction: "translate",
    locked: false,
  },
  selectionToolbar: {
    enabled: true,
    disabledSelectionToolbarPatterns: [],
    opacity: DEFAULT_SELECTION_OVERLAY_OPACITY,
    features: {
      translate: {
        enabled: true,
        providerId: DEFAULT_TRANSLATE_PROVIDER_ID,
        shortcut: DEFAULT_SELECTION_TRANSLATION_SHORTCUT_KEY,
      },
      speak: {
        enabled: true,
      },
    },
    builtInActions: {
      dictionary: {
        // 二次开发：词典动作依赖 LLM 模型配置，已随「删掉模型配置」一并默认关闭。
        enabled: false,
        providerId: BUILT_IN_AI_PROVIDER_ID,
      },
    },
    customActions: [],
    noteSuggestion: {
      // 二次开发：笔记建议同样依赖 LLM，默认关闭。
      enabled: false,
      actionId: BUILT_IN_DICTIONARY_ACTION_ID,
      // 指向内置 AI 而不是 `openai-default`：新装配置里已经没有任何 LLM provider，
      // 而 configSchema 的 superRefine 会按 capability 校验这个 id（不看 enabled），
      // 留着 `openai-default` 会让整份默认配置 schema 非法、写盘直接失败。
      // 内置 AI 在 SYSTEM_PROVIDER_DEFS 里声明了 noteSuggestion 能力，是唯一合法值。
      providerId: BUILT_IN_AI_PROVIDER_ID,
    },
  },
  sideContent: {
    width: DEFAULT_SIDE_CONTENT_WIDTH,
  },
  betaExperience: {
    enabled: false,
  },
  contextMenu: {
    enabled: true,
  },
  inputTranslation: {
    enabled: true,
    providerId: DEFAULT_TRANSLATE_PROVIDER_ID,
    fromLang: "targetCode",
    toLang: "sourceCode",
    enableCycle: false,
    timeThreshold: 300,
  },
  videoSubtitles: {
    // 二次开发：视频字幕依赖 LLM 模型配置与字幕队列，已从设置界面裁撤，默认关闭。
    enabled: false,
    autoStart: false,
    toggleShortcut: DEFAULT_SUBTITLES_TOGGLE_SHORTCUT_KEY,
    providerId: DEFAULT_TRANSLATE_PROVIDER_ID,
    style: {
      displayMode: DEFAULT_DISPLAY_MODE,
      translationPosition: DEFAULT_TRANSLATION_POSITION,
      main: {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontScale: DEFAULT_FONT_SCALE,
        color: DEFAULT_SUBTITLE_COLOR,
        fontWeight: DEFAULT_FONT_WEIGHT,
      },
      translation: {
        fontFamily: DEFAULT_FONT_FAMILY,
        fontScale: DEFAULT_FONT_SCALE,
        color: DEFAULT_SUBTITLE_COLOR,
        fontWeight: DEFAULT_FONT_WEIGHT,
      },
      container: {
        backgroundOpacity: DEFAULT_BACKGROUND_OPACITY,
      },
      customCSS: null,
    },
    aiSegmentation: false,
    requestQueueConfig: {
      capacity: DEFAULT_REQUEST_CAPACITY,
      rate: DEFAULT_REQUEST_RATE,
    },
    batchQueueConfig: {
      maxCharactersPerBatch: DEFAULT_BATCH_CONFIG.maxCharactersPerBatch,
      maxItemsPerBatch: DEFAULT_BATCH_CONFIG.maxItemsPerBatch,
    },
    customPromptsConfig: DEFAULT_SUBTITLE_TRANSLATE_PROMPTS_CONFIG,
    position: DEFAULT_SUBTITLE_POSITION,
  },
  siteControl: {
    mode: "blacklist",
    blacklistPatterns: [],
    whitelistPatterns: [],
  },
  siteRules: {
    userRules: [],
    disabledBuiltInRules: [],
  },
  uiLanguage: "auto",
  translationHub: {
    shortcut: DEFAULT_TRANSLATION_HUB_SHORTCUT_KEY,
  },
  // 二次开发：术语表依赖 LLM 提示词，已从设置界面裁撤，默认关闭。
  glossary: { ...DEFAULT_GLOSSARY_CONFIG, enabled: false },
}

/**
 * 二次开发：新装配置只带豆包三个翻译服务，翻译类功能一律默认豆包 AI（见
 * `DEFAULT_TRANSLATE_PROVIDER_ID`），不再有「先微软、探测到 Google 可达再切过去」
 * 的那套外部探测 —— 现在没有 Google 服务可选，`selectFreshTranslateProviders`
 * 也就只剩一个空实现。
 */
export function buildFreshDefaultConfig(): Config {
  return {
    ...DEFAULT_CONFIG,
    providersConfig: buildDefaultProviderConfigList(),
    selectionToolbar: {
      ...DEFAULT_CONFIG.selectionToolbar,
      builtInActions: {
        dictionary: {
          enabled: false,
          providerId: BUILT_IN_AI_PROVIDER_ID,
        },
      },
      customActions: [],
    },
  }
}

export const PAGE_TRANSLATE_RANGE_ITEMS: Record<PageTranslateRange, { label: string }> = {
  main: { label: "Main" },
  all: { label: "All" },
}

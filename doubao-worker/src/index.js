const textEncoder = new TextEncoder();

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, GET, OPTIONS",
  "access-control-allow-headers":
    "authorization, content-type, x-api-key, x-doubao-target-lang",
};

const MODEL_TO_SERVICE = {
  "doubao-ai": "1",
  "volcengine": "0",
  "microsoft": "3",
};

const DEFAULT_MODEL = "doubao-ai";

function fail(message, code, status = 400) {
  throw [message, code, status];
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseIntStrict(value, fieldName, fallback) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    fail(`${fieldName} must be an integer.`, "invalid_request", 400);
  }
  return value;
}

function parseJson(raw, isUpstream = false) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {}
  if (!isPlainObject(parsed)) {
    fail(
      "Invalid JSON object.",
      isUpstream ? "upstream_stream_error" : "invalid_request",
      isUpstream ? 502 : 400
    );
  }
  return parsed;
}

async function readBodyLimited(response, maxBytes, isUpstream = false) {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const decoder = new TextDecoder();
  let result = "";
  let totalBytes = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return result + decoder.decode();

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        fail(
          "Body is too large.",
          isUpstream ? "upstream_stream_error" : "request_too_large",
          isUpstream ? 502 : 413
        );
      }
      result += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function extractRawCookie(request) {
  const bearer = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (bearer) return bearer;

  const apiKey = request.headers.get("x-api-key");
  if (apiKey) return apiKey;

  return null;
}

function normalizeCookie(raw) {
  if (typeof raw !== "string" || !raw.trim()) {
    fail("Missing Doubao cookie.", "missing_credential", 400);
  }

  const cookie = raw.replace(/^Cookie:\s*/i, "").trim();

  if (/[\r\n]/.test(cookie)) {
    fail("Invalid cookie format.", "invalid_request", 400);
  }

  const hasRequiredFields = ["sessionid", "sid_tt", "uid_tt"].every((name) =>
    new RegExp(`(?:^|;\\s*)${name}=[^;\\s]+`).test(cookie)
  );

  if (!hasRequiredFields) {
    fail(
      "Cookie is missing required fields (sessionid, sid_tt, uid_tt).",
      "invalid_credential",
      400
    );
  }

  return cookie;
}

const LANGUAGE_ALIASES = {
  "traditional chinese": "zh-Hant",
  "simplified chinese": "zh",
  chinese: "zh",
  繁体中文: "zh-Hant",
  繁體中文: "zh-Hant",
  简体中文: "zh",
  中文: "zh",
  english: "en",
  英文: "en",
  英语: "en",
  japanese: "ja",
  日文: "ja",
  日语: "ja",
  korean: "ko",
  韩文: "ko",
  韩语: "ko",
  french: "fr",
  german: "de",
  spanish: "es",
  portuguese: "pt",
  russian: "ru",
  arabic: "ar",
  italian: "it",
  indonesian: "id",
  malay: "ms",
  thai: "th",
  vietnamese: "vi",
  filipino: "fil",
  tagalog: "fil",
  uzbek: "uz",
  "zh-cn": "zh",
  "zh-hans": "zh",
  "zh-tw": "zh-Hant",
  "zh-hk": "zh-Hant",
};

const SUPPORTED_LANGUAGES = [
  "zh", "zh-Hant", "en", "ja", "ko", "fr", "de", "es", "es-ES",
  "pt", "ru", "ar", "it", "id", "ms", "th", "vi", "fil", "uz",
];

function normalizeTargetLanguage(rawLang) {
  if (typeof rawLang !== "string") {
    fail("Target language must be a string.", "unsupported_target_language");
  }

  const normalized =
    LANGUAGE_ALIASES[rawLang.trim().toLowerCase()] ?? rawLang;
  const matched = SUPPORTED_LANGUAGES.find(
    (lang) => lang.toLowerCase() === normalized.toLowerCase()
  );

  if (!matched) {
    fail(
      "Unsupported target language. Use target_lang with a language code.",
      "unsupported_target_language"
    );
  }
  return matched;
}

const CONSTANTS = {
  MAX_INPUT_CHARS: 20000,
  MAX_LINE_CHARS: 10000,
  LINES_PER_BATCH: 50,
  CHARS_PER_BATCH: 10000,
  MAX_BATCHES: 2,
};

const TRANSLATE_PREFIX_PATTERNS = [
  /^(?:please\s+)?translate[^\n:：]{1,160}[:：][ \t]*(?:\r\n|\r|\n)*/i,
  /^(?:请)?翻译(?:成|为)[^\n:：]{1,80}[:：][ \t]*(?:\r\n|\r|\n)*/,
];

const TARGET_LANG_PATTERN =
  /(?:\btranslate\b[^\n:：]{0,160}?\b(?:to|into)\s+|翻译(?:成|为)|(?:target|output)\s+language\s*[:：]\s*)([^\n:：.!]+)(?=[:：.!]|$)/i;

const UNSUPPORTED_WRAPPER_PATTERNS = [
  /^\s*<(?:yaml|text)\b/i,
  /<\/?(?:html|a|p|div|span|code|pre|h[1-6]|strong|em|br|ul|li|table)\b/i,
];

function resolveModel(rawModel) {
  if (rawModel === undefined || rawModel === null) {
    return DEFAULT_MODEL;
  }
  if (typeof rawModel !== "string" || !(rawModel in MODEL_TO_SERVICE)) {
    fail("Model not found.", "model_not_found", 404);
  }
  return rawModel;
}

function parseRequest(requestBody, request, env) {
  if (
    !Array.isArray(requestBody.messages) ||
    !requestBody.messages.every(isPlainObject)
  ) {
    fail("A messages array is required.", "invalid_request");
  }

  const messages = requestBody.messages;
  const lastUserMessage = messages.findLast((m) => m.role === "user");

  if (typeof lastUserMessage?.content !== "string") {
    fail("A plain-text user message is required.", "unsupported_input");
  }

  const content = lastUserMessage.content;

  const prefixMatch =
    content.match(TRANSLATE_PREFIX_PATTERNS[0]) ??
    content.match(TRANSLATE_PREFIX_PATTERNS[1]);

  const hintSources = messages
    .filter((m) => m.role === "system" || m.role === "developer")
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .concat(prefixMatch?.[0] ?? "");

  const headerTarget = request.headers.get("x-doubao-target-lang");
  const explicitTarget = requestBody.target_lang ?? headerTarget;

  let target;
  if (explicitTarget !== null) {
    target = normalizeTargetLanguage(explicitTarget);
  } else {
    const inferred = hintSources
      .map((text) => text.match(TARGET_LANG_PATTERN)?.[1])
      .filter((lang) => lang !== undefined)
      .map(normalizeTargetLanguage);

    if (new Set(inferred).size > 1) {
      fail("Conflicting target languages.", "invalid_request");
    }

    target =
      inferred[0] ??
      normalizeTargetLanguage(env.DOUBAO_DEFAULT_TARGET_LANG ?? "zh");
  }

  const text = prefixMatch ? content.slice(prefixMatch[0].length) : content;

  if (!text.trim()) {
    fail("Translation input is empty.", "empty_translation_input");
  }
  if (text.length > CONSTANTS.MAX_INPUT_CHARS) {
    fail("Text exceeds 20,000 characters.", "request_too_large", 413);
  }
  if (UNSUPPORTED_WRAPPER_PATTERNS.some((re) => re.test(text))) {
    fail(
      "Use a plain-text template; HTML and YAML wrappers are unsupported.",
      "unsupported_input"
    );
  }

  const parts = text.split(/((?:\r\n|\r|\n)+)/);
  const segments = [];

  for (let i = 0; i < parts.length; i += 2) {
    const line = parts[i] ?? "";
    const separator = parts[i + 1] ?? "";

    if (!line.trim() || /^[ \t]*%%[ \t]*$/.test(line)) {
      segments.push({ text: "", separator: line + separator });
    } else {
      if (line.length > CONSTANTS.MAX_LINE_CHARS) {
        fail("One line exceeds 10,000 characters.", "request_too_large", 413);
      }
      segments.push({ text: line, separator });
    }
  }

  const textsToTranslate = segments.filter((s) => s.text).map((s) => s.text);
  if (!textsToTranslate.length) {
    fail("Translation input is empty.", "empty_translation_input");
  }

  const batches = [];
  let currentBatch = [];
  let currentBatchChars = 0;

  for (const lineText of textsToTranslate) {
    const wouldOverflow =
      currentBatch.length === CONSTANTS.LINES_PER_BATCH ||
      currentBatchChars + lineText.length > CONSTANTS.CHARS_PER_BATCH;

    if (wouldOverflow) {
      batches.push(currentBatch);
      currentBatch = [];
      currentBatchChars = 0;
    }

    currentBatch.push(lineText);
    currentBatchChars += lineText.length;
  }
  batches.push(currentBatch);

  if (batches.length > CONSTANTS.MAX_BATCHES) {
    fail(
      "Text exceeds two batches (50 lines / 10,000 characters each, 100 segments total).",
      "request_too_large",
      413
    );
  }

  const model = resolveModel(requestBody.model);
  const translateService = MODEL_TO_SERVICE[model];
  const scene = parseIntStrict(requestBody.scene, "scene", 2);
  const frontendSource = parseIntStrict(
    requestBody.frontend_source,
    "frontend_source",
    1
  );

  return {
    target,
    segments,
    batches,
    model,
    translateService,
    scene,
    frontendSource,
  };
}

function checkUpstreamCode(payload) {
  if (payload.code === undefined || payload.code === 0) return;

  if (payload.code === 710012001) {
    fail("Doubao login has expired.", "upstream_auth_error", 502);
  }
  if (payload.code === 710012003 || payload.code === 710012004) {
    fail("Doubao request was rejected.", "upstream_request_rejected", 502);
  }
  if (payload.code === 710012005) {
    fail("Doubao rate limit reached.", "upstream_rate_limit", 429);
  }
  fail(
    `Doubao translation failed (code ${payload.code}).`,
    "upstream_stream_error",
    502
  );
}

async function callDoubao(options, signal) {
  const {
    lines,
    targetLang,
    cookie,
    translateService,
    scene,
    frontendSource,
  } = options;

  let response;
  try {
    response = await fetch(
      "https://www.doubao.com/samantha/plugin/stream_article_translate",
      {
        method: "POST",
        redirect: "manual",
        signal,
        headers: {
          "content-type": "application/json",
          accept: "*/*",
          cookie,
        },
        body: JSON.stringify({
          raw_text: lines,
          target_lang: targetLang,
          translate_service: translateService,
          scene,
          frontend_source: frontendSource,
        }),
      }
    );

    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      if (response.status === 429) {
        fail("Doubao rate limit reached.", "upstream_rate_limit", 429);
      }
      if (response.status === 401 || response.status === 403) {
        fail("Doubao access refused.", "upstream_auth_error", 502);
      }
      fail("Doubao request failed.", "upstream_http_error", 502);
    }

    const contentType = response.headers.get("content-type") ?? "";
    const rawBody = (await readBodyLimited(response, 512 * 1024, true))
      .replace(/\r\n|\r/g, "\n")
      .trimStart();

    if (!rawBody) {
      fail("Upstream returned an empty response.", "upstream_empty_response", 502);
    }

    const isJson =
      contentType.includes("application/json") ||
      (contentType === "" && rawBody.startsWith("{"));

    if (isJson) {
      checkUpstreamCode(parseJson(rawBody, true));
      fail(
        "Upstream returned no translations.",
        "upstream_incomplete_result",
        502
      );
    }

    const translations = new Map();
    let gotDoneEvent = false;

    for (const block of rawBody.split("\n\n")) {
      let eventName = "message";
      const dataLines = [];

      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).replace(/^ /, ""));
        }
      }

      if (!["json", "message", "err", "done"].includes(eventName)) continue;

      if (eventName === "done") {
        if (dataLines.length) {
          const rawDone = dataLines.join("\n");
          let payload = null;
          try {
            payload = JSON.parse(rawDone);
          } catch {}
          if (isPlainObject(payload)) {
            checkUpstreamCode(payload);
          }
        }
        gotDoneEvent = true;
        continue;
      }

      if (eventName === "err") {
        const rawErr = dataLines.join("\n");
        let reason = rawErr;
        try {
          const parsed = JSON.parse(rawErr);
          if (isPlainObject(parsed) && typeof parsed.msg === "string") {
            reason = parsed.msg;
          }
        } catch {}
        fail(
          `Upstream stream reported an error: ${reason || "unknown"}`,
          "upstream_stream_error",
          502
        );
      }

      if (!dataLines.length) continue;

      const payload = parseJson(dataLines.join("\n"), true);
      checkUpstreamCode(payload);

      const items =
        isPlainObject(payload.data) && Array.isArray(payload.data.items)
          ? payload.data.items
          : [];

      for (const item of items) {
        const validIndex =
          isPlainObject(item) &&
          typeof item.index === "number" &&
          Number.isInteger(item.index) &&
          item.index >= 0 &&
          item.index < lines.length;

        if (!validIndex || typeof item.res !== "string" || !item.res.trim()) {
          fail("Invalid upstream translation item.", "upstream_stream_error", 502);
        }

        if (!translations.has(item.index)) {
          translations.set(item.index, item.res);
        }
      }
    }

    if (!gotDoneEvent || translations.size !== lines.length) {
      fail(
        "Upstream translation is incomplete.",
        "upstream_incomplete_result",
        502
      );
    }

    return lines.map((_, i) => translations.get(i));
  } catch (err) {
    if (Array.isArray(err)) throw err;
    if (signal.aborted) {
      fail("Doubao request timed out.", "upstream_timeout", 504);
    }
    fail("Doubao connection failed.", "upstream_network_error", 502);
  }
}

async function handleRequest(request, env, requestId) {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/") {
    return jsonResponse({ status: "ok" });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (request.method === "GET" && url.pathname === "/v1/models") {
    const created = Math.floor(Date.now() / 1000);
    return jsonResponse({
      object: "list",
      data: Object.keys(MODEL_TO_SERVICE).map((id) => ({
        id,
        object: "model",
        created,
        owned_by: "doubao",
      })),
    });
  }

  if (url.pathname !== "/v1/chat/completions") {
    fail("Route not found.", "not_found", 404);
  }

  if (request.method !== "POST") {
    fail("POST is required.", "method_not_allowed", 405);
  }

  const rawCookie = extractRawCookie(request);
  if (!rawCookie) {
    fail(
      "Missing Doubao cookie. Provide it via Authorization: Bearer or x-api-key.",
      "missing_credential",
      400
    );
  }
  const cookie = normalizeCookie(rawCookie);

  const requestBody = parseJson(await readBodyLimited(request, 64 * 1024));

  if (requestBody.stream !== undefined && requestBody.stream !== false) {
    fail("Streaming is not supported.", "unsupported_feature");
  }
  if (["tools", "functions", "reasoning"].some((k) => requestBody[k] !== undefined)) {
    fail("Only plain-text translation is supported.", "unsupported_feature");
  }

  const {
    target,
    segments,
    batches,
    model,
    translateService,
    scene,
    frontendSource,
  } = parseRequest(requestBody, request, env);

  const totalTimeout = AbortSignal.timeout(90_000);
  const translations = [];
  let outputBytes = 0;

  for (const batch of batches) {
    const batchSignal = AbortSignal.any([
      totalTimeout,
      request.signal,
      AbortSignal.timeout(45_000),
    ]);

    const batchTranslations = await callDoubao(
      {
        lines: batch,
        targetLang: target,
        cookie,
        translateService,
        scene,
        frontendSource,
      },
      batchSignal
    );

    for (const text of batchTranslations) {
      outputBytes += textEncoder.encode(text).byteLength;
      if (outputBytes > 256 * 1024) {
        fail("Translation output is too large.", "upstream_stream_error", 502);
      }
      translations.push(text);
    }
  }

  let translationIndex = 0;
  const fullText = segments
    .map(
      (seg) => (seg.text ? translations[translationIndex++] : "") + seg.separator
    )
    .join("");

  return jsonResponse({
    id: `chatcmpl_${requestId.replaceAll("-", "")}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: fullText },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  });
}

export default {
  async fetch(request, env) {
    const requestId = crypto.randomUUID();
    let response;

    try {
      response = await handleRequest(request, env, requestId);
    } catch (err) {
      const [message, code, status] = Array.isArray(err)
        ? err
        : ["Worker failed.", "internal_error", 500];

      const errorType =
        status === 401
          ? "authentication_error"
          : status < 500
          ? "invalid_request_error"
          : "api_error";

      response = jsonResponse(
        { error: { type: errorType, message, code, param: null } },
        status
      );
    }

    response.headers.set("x-request-id", requestId);
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      response.headers.set(key, value);
    }

    return response;
  },
};
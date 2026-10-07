# 豆包翻译 Worker

把豆包的**文章翻译**接口包装成一个 **OpenAI 兼容**的 API，让 Cherry Studio、
Chatbox、One API 等只认 OpenAI 协议的客户端也能用上豆包翻译。

对应的浏览器扩展实现见仓库根目录（read-frog 的豆包改版）。

> ⚠️ 依赖豆包**非公开**的内部接口，可能随时变更或失效。请使用自己的合法账号，
> 并自行承担使用风险。

## 原理

```
OpenAI 客户端 ──/v1/chat/completions──▶ Worker ──Cookie 鉴权──▶ www.doubao.com
                                                                 /samantha/plugin/
                                                                 stream_article_translate
```

Worker 把 OpenAI 格式的 `messages` 提取成纯文本，按行切分后分批调用豆包的
SSE 流式翻译接口，再把结果按行拼回、以 OpenAI 响应格式返回。

## 部署

需要 Cloudflare 账号。

```bash
cd doubao-worker
npm install
npx wrangler login
npx wrangler deploy
```

部署完会得到一个地址，形如 `https://doubao-translate.<你的子域>.workers.dev`。

### 可选：设置默认目标语言

改 `wrangler.toml` 里的 `[vars] DOUBAO_DEFAULT_TARGET_LANG`，默认 `zh`。

## 使用

在客户端里填：

| 字段 | 值 |
|---|---|
| Base URL | `https://<你的worker地址>/v1` |
| API Key | **豆包网页版的完整 Cookie 串**（见下） |
| Model | `doubao-ai`（或 `volcengine` / `microsoft`） |

三个模型对应豆包的三个翻译引擎：

| model | translate_service | 说明 |
|---|---|---|
| `doubao-ai`（默认） | `"1"` | 豆包大模型，长文/专业文档质量最好 |
| `volcengine` | `"0"` | 火山引擎机器翻译，最快 |
| `microsoft` | `"3"` | 微软翻译 |

### 指定目标语言

三种方式，优先级从高到低：

1. 请求体里的 `target_lang`（如 `"en"`）
2. 请求头 `x-doubao-target-lang`
3. `system` / `developer` 消息或译文开头的提示语里包含 `翻译成英文:` / `translate to English:`

都没给就用 `DOUBAO_DEFAULT_TARGET_LANG`。

支持的语种见 `src/index.js` 里的 `SUPPORTED_LANGUAGES`：
`zh` `zh-Hant` `en` `ja` `ko` `fr` `de` `es` `es-ES` `pt` `ru` `ar` `it` `id` `ms` `th` `vi` `fil` `uz`

## 怎么拿到豆包 Cookie

Cookie 是 httpOnly 的，页面 JS 拿不到，得从浏览器里取：

1. Chrome 登录 <https://www.doubao.com/chat/>
2. `F12` → **Network（网络）** 标签 → 刷新页面
3. 点任意 `doubao.com` 的请求 → **Request Headers** → 复制整行 `Cookie:` 的值
   （或：**Application** → **Cookies** → `https://www.doubao.com` → 逐条复制）
4. 至少要有这三条，否则服务端会判未登录：
   **`sessionid`**、**`sid_tt`**、**`uid_tt`**

把这一整串粘到客户端的 API Key 里即可。

> 更省事的办法是用本仓库的浏览器扩展：扩展的「豆包账号」页可以一键采集并校验
> 登录态，还能看是哪些 Cookie 命中了。

## 请求示例

```bash
curl https://<你的worker地址>/v1/chat/completions \
  -H "Authorization: Bearer sessionid=xxx; sid_tt=yyy; uid_tt=zzz" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "doubao-ai",
    "target_lang": "zh",
    "messages": [{"role": "user", "content": "Hello world\nThis is a test."}]
  }'
```

响应是标准的 OpenAI Chat Completion 结构，译文在
`choices[0].message.content` 里，**与输入行数一一对应**。

## 限制

- **只做翻译**。不是通用大模型；请求里带 `stream` / `tools` / `functions` /
  `reasoning` 会被直接拒绝。
- **不支持流式返回**（`stream: true` 会报错）。
- **单次上限**：2 万字符输入；分批后最多 2 批（每批 ≤ 50 行且 ≤ 1 万字符）。
- **不支持 HTML / YAML 片段**：这是纯文本端点，没有保留标记的模式。
- **Cookie 会过期**，届时报 `710012001`，重新抓一次即可。

## 错误码

错误以 OpenAI 的 error 结构返回，同时保留豆包原始 `code`：

| code | 含义 | 处理 |
|---|---|---|
| `710012001` | 登录已过期 | 重新抓 Cookie |
| `710010202` | 系统错误（最常见是参数不合法） | 检查请求体 |
| `710012003` / `710012004` | 请求被拒绝 | 检查内容 |
| `710012005` | 触发限流 | 降低频率 |
| `upstream_*` | 上游网络/协议异常 | 重试 |

## 安全提示

- Cookie 等价于你的豆包登录态，**不要**提交进仓库、不要贴进公开渠道。
- 本 Worker 不存储任何 Cookie；它只在单次请求内透传给豆包。
- 但**你填 Cookie 的那个客户端**会保存它，请自行评估。

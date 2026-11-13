<div align="center">
  <img src="./public/icon/128.png" alt="logo" width="96" />
  <h1>read-frog · 豆包改版</h1>
  <p>
    基于 <a href="https://github.com/mengxi-ream/read-frog">read-frog</a> 的翻译改版<br/>
    支持豆包账号翻译，以及使用自己 API Key 的第三方翻译
  </p>
  <p>
    <a href="https://github.com/erik00000/read-frog/releases"><img alt="Release" src="https://img.shields.io/github/v/release/erik00000/read-frog?label=download&color=blue" /></a>
    <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-GPL--3.0-blue" /></a>
  </p>
</div>

---

> ⚠️ **这是二次开发版，不是官方 read-frog。**
>
> 原版项目请见 [mengxi-ream/read-frog](https://github.com/mengxi-ream/read-frog)
> —— 它功能完整，支持 20+ AI 服务商、视频字幕翻译、语音朗读、自定义 AI 动作、
> 单词卡等。**本仓库精简了产品入口，提供豆包翻译和第三方 API 翻译。**
>
> 想要原版去上游；想要「用豆包账号或自己的 API Key 翻译」用这个。

---

## 这是什么

read-frog 原本是一个 AI 语言学习 / 沉浸式翻译扩展。这个改版提供两种翻译方式：

- **豆包翻译**：调用豆包文章翻译接口，用浏览器里的豆包登录 Cookie 鉴权，无需 API Key。可用性取决于豆包接口和账号状态。
- **第三方 API 翻译**：填写兼容 OpenAI Chat Completions 的接口地址、API Key 和模型，按服务商规则计费，无需登录豆包。

```
扩展 ──credentials: include──▶ www.doubao.com
                               /samantha/plugin/stream_article_translate
```

## 快速开始

> 目前只支持 **Chrome / Edge**（Manifest V3 + service worker）。
> Firefox 需要自行重新构建（见下方「从源码构建」）。

1. 到 [Releases](https://github.com/erik00000/read-frog/releases) 下载
   `read-frog-doubao-chrome-mv3-1.47.4.7z`，解压到任意目录
2. Chrome 打开 `chrome://extensions/`（Edge 是 `edge://extensions/`）
3. 打开右上角 **开发者模式**
4. 点 **加载已解压的扩展程序**，选择解压出来的 `chrome-mv3` 目录

## 使用第三方 API 翻译

1. 打开扩展设置 → **翻译服务 → 第三方 API 翻译**。
2. 填写服务商提供的 **接口地址（Base URL）** 和 **API Key**。
   - 地址通常以 `/v1` 结尾；只填域名时自动补 `/v1`。
   - 也可粘贴完整的 `/chat/completions` 地址，扩展会转换为 Base URL。
3. 点击 **获取模型**，从接口返回的列表中选择真实的模型 ID，也支持手动填写。
   - 模型列表通过 `GET <Base URL>/models` 获取。
   - 优先推荐列表中的 `gpt-6.1-terra`，其次是 `gpt-6-terra`、`gpt-5.6-terra`；保留已有的有效选择。
   - Terra 推荐仅表示使用偏好，模型列表通常不含价格，费用和速度以服务商为准。
   - 供应商名称不是模型 ID，不要把供应商名称填入模型栏。
4. 点击 **保存并测试翻译**，确认出现测试译文。测试会消耗少量 API 额度。
5. 点击 **保存并设为默认**，页面翻译、划词翻译和输入翻译将使用这个服务。

扩展弹窗可以切换翻译服务，翻译中心可以选择已保存的第三方服务。
更新已加载的扩展后，请在扩展管理页点击重新加载，再刷新需要翻译的网页。

API Key 默认隐藏，保存在扩展配置中；配置导出或同步可能包含密钥，请勿分享完整配置。
翻译文本会发送到你填写的服务商接口。

## 使用豆包翻译

1. **在同一个浏览器里**登录 <https://www.doubao.com/chat/>
2. 点扩展图标 → **豆包账号** → 点 **获取 Cookie**
   - 看到「**已登录（鉴权有效）**」就成功了；下面会列出命中的必需 Cookie
3. 打开任意网页：
   - 点扩展图标里的翻译开关 → **整页双语翻译**
   - 选中文字 → **划词翻译**
   - 悬停在段落上 → **悬停翻译**

> Cookie 是 httpOnly 的，页面 JS 拿不到，所以必须由扩展在浏览器层读取。
> 采集到的 Cookie 只存在本地扩展存储里，不会上传到任何服务器。

### Cookie 过期了怎么办

豆包返回 `710012001` 就说明登录态失效了。回到「豆包账号」页点一次
**获取 Cookie** 即可，不用重装扩展。

### 想要手动导入 Cookie

「豆包账号」页底部可以粘贴 Cookie（支持 `Cookie:` 整行、`Set-Cookie`、
Cookie-Editor 导出的 JSON 数组）。必需字段是
**`sessionid`、`sid_tt`、`uid_tt`** 三条。

> ⚠️ 「同时写入浏览器 Cookie」开关默认关闭。打开它会**覆盖本浏览器同名的豆包
> Cookie**，包括你当前的登录态。除非确实需要，别开。

## 三个翻译引擎

三个服务共用同一份豆包登录态，区别只是底层引擎：

| 服务                | `translate_service` | 特点                               |
| ------------------- | ------------------- | ---------------------------------- |
| 火山引擎            | `"0"`               | 机器翻译，速度最快，适合日常网页   |
| **豆包 AI**（默认） | `"1"`               | 豆包大模型驱动，论文与专业文档更准 |
| 微软                | `"3"`               | 微软翻译                           |

在扩展的「翻译服务」页或弹窗里切换。这三个豆包服务无需填写模型、API Key 或接口地址；
使用自己的 API Key 时，请配置同页的「第三方 API 翻译」。

## 与上游 read-frog 的差异

| 项                                                               | 上游                         | 本改版                                              |
| ---------------------------------------------------------------- | ---------------------------- | --------------------------------------------------- |
| 翻译服务                                                         | 20+ AI 服务商 + 免费通道     | 三个豆包引擎 + 第三方 Chat Completions API          |
| 配置项                                                           | 模型 / Base URL / API Key 等 | 豆包免填；第三方支持模型获取、选择和连接测试        |
| 豆包账号                                                         | 无                           | 新增「豆包账号」页（采集 / 探针 / 脱敏展示 / 导入） |
| 视频字幕、TTS、自定义 AI 动作、单词卡、术语库、Google Drive 同步 | 有                           | **入口已移除**                                      |
| 「仅译文」页面模式                                               | 全部服务可用                 | **豆包不可用**（见下）                              |

### 为什么「仅译文」模式用不了

豆包这个端点是**纯文本**的，没有保留 HTML 标记的模式。「仅译文」模式会用
`innerHTML` 回填 provider 输出，硬套会把页面标记弄坏，所以被主动禁用 ——
这是**故意的，不是 bug**。想用「仅译文」请换 DeepL 等支持标记的 provider。

## 目录导览

```
├── doubao-worker/                          Cloudflare Worker（OpenAI 兼容网关）
├── NOTICE.md                               GPL 修改声明
├── src/
│   ├── utils/constants/doubao.ts           接口契约：错误码、语言码、场景号、引擎
│   ├── types/doubao.ts                     消息层的场景号运行时校验
│   ├── utils/doubao-auth/                  Cookie 采集 / 鉴权探针 / 导入
│   ├── utils/host/translate/api/doubao/    翻译客户端
│   │   ├── client.ts                       请求构造、响应分流、按 index 回填
│   │   ├── sse.ts                          增量 SSE 解析（扛任意字节切分）
│   │   ├── batching.ts                     分批（≤ 1 万字符且 ≤ 50 段）
│   │   ├── scene.ts                        功能 → 数字场景号
│   │   └── errors.ts                       错误码 → 人话
│   ├── entrypoints/options/pages/doubao-account/   「豆包账号」设置页
│   └── entrypoints/popup/components/       popup 的账号状态卡 / 服务切换器
└── scripts/verify/                         契约对抗测试 + 真实 HTTP mock
```

## 用 Cloudflare Worker（OpenAI 兼容）

`doubao-worker/` 把**同一个**豆包接口包装成 OpenAI 兼容的
`/v1/chat/completions`，可以喂给 Cherry Studio、Chatbox、One API 等客户端：

```bash
cd doubao-worker
npm install
npx wrangler login
npx wrangler deploy
```

然后客户端填 `Base URL = https://<你的worker地址>/v1`、
`API Key = 豆包完整 Cookie 串`、`Model = doubao-ai`。

详见 [`doubao-worker/README.md`](./doubao-worker/README.md)。

## 从源码构建

需要 Node.js 与 pnpm（版本以 `package.json` 的 `packageManager` / `devEngines`
字段为准）。

```bash
pnpm install --frozen-lockfile

pnpm build          # Chrome → .output/chrome-mv3
pnpm zip            # Chrome 打包 → .output/*.zip
pnpm zip:firefox    # Firefox（MV3）
pnpm test           # 单元测试
```

跑豆包的**契约对抗测试**（用真实本机 HTTP mock，不依赖浏览器与网络）：

```bash
pnpm exec vitest run --config scripts/verify/vitest.verify.config.ts
```

> 仓库自带 husky 钩子（pre-commit / pre-push）。在 Git Bash 等只能看到
> `pnpm.cmd` 的环境里钩子会报 `pnpm: command not found`，此时用
> `git commit --no-verify` / `git push --no-verify` 跳过，或先把 pnpm 加进 PATH。

## 排错

| 现象                     | 原因                                   | 处理                                                |
| ------------------------ | -------------------------------------- | --------------------------------------------------- |
| `710012001 登录已过期`   | Cookie 失效                            | 「豆包账号」页重新点「获取 Cookie」                 |
| `710010202 系统错误`     | 参数不合法（最常见是场景号传成字符串） | 扩展已本地拦截并退回默认场景                        |
| `710020202 插件错误`     | 单次段数超过 100，或用了同步端点       | 保持每批 ≤ 50 段                                    |
| `710020702`              | `target_lang` 不是受支持的语言码       | 见 `SUPPORTED_LANGUAGES`                            |
| 翻译不出来但也不报错     | 忽略了 SSE 的 `event:err` 帧           | 已修复；自行改代码时别只认 `event:json`             |
| 某几段没被翻译           | 单段超过 1 万字符被服务端静默截断      | 保持单段 ≤ 1 万字符                                 |
| 「仅译文」模式选不了     | 豆包是纯文本端点                       | 见上文，属预期行为                                  |
| 点了翻译没反应           | 扩展未加载 / 未登录豆包                | 检查 `chrome://extensions` 与豆包账号状态           |
| 第三方返回模型不受支持   | 模型 ID 错误或当前 Key 无访问权限      | 点击「获取模型」，选择该接口实际返回的模型并测试    |
| 获取模型失败             | 地址、密钥、权限或模型列表接口不兼容   | 核对 Base URL 和 Key；不支持模型列表时可手填模型 ID |
| 第三方返回 `401` / `403` | Key 无效或权限不足                     | 检查服务商账号、Key 和分组权限                      |
| 第三方返回 `429`         | 限流或额度不足                         | 检查服务商额度及请求限制                            |

## 已知限制

- 依赖豆包**非公开**的内部接口，上游随时可能变更导致失效。
- 单批 ≤ 50 段且 ≤ 1 万字符；单段超过 1 万字符会被服务端静默截断。
- 只有 Chrome / Edge 构建产物，Firefox 需自行构建。
- 登录态会过期，需要偶尔重新采集。
- 第三方 API 需要兼容 Chat Completions；能列出模型不代表模型支持该协议，需用测试翻译确认。
- 当前目标语言选择列表仍沿用豆包支持范围。

## 许可与致谢

本仓库是 [read-frog](https://github.com/mengxi-ream/read-frog) 的修改版，
遵循上游的 **GNU GPL v3.0**（见 [`LICENSE`](./LICENSE)）发布。

- 上游仓库：<https://github.com/mengxi-ream/read-frog>
- 修改内容与日期：见 [`NOTICE.md`](./NOTICE.md)

按 GPL 要求，**分发本仓库的编译产物时，其对应的完整源代码即为本仓库全部内容。**

感谢 read-frog 作者 [@mengxi-ream](https://github.com/mengxi-ream) 及所有贡献者。

## 免责声明

本项目与字节跳动 / 豆包官方**无任何关联**。豆包翻译依赖未公开的内部接口，
请使用你自己合法的豆包账号，并自行承担使用风险。

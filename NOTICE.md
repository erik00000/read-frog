# 修改声明 / Modification Notice

本仓库是 [read-frog](https://github.com/mengxi-ream/read-frog) 的**修改版**，
遵循上游的 **GNU GPL v3.0**（见 `LICENSE`）发布。

This repository is a **modified version** of
[read-frog](https://github.com/mengxi-ream/read-frog), distributed under the
same **GNU GPL v3.0** license as upstream. See `LICENSE`.

- **上游 / Upstream**: https://github.com/mengxi-ream/read-frog
- **修改日期 / Modification date**: 2026-10-07
- **修改者 / Modified by**: 本仓库作者

## 修改内容 / What was changed

新增**豆包（Doubao）原生翻译**，并把产品裁剪为只提供三个豆包翻译服务：

1. 新增豆包翻译客户端：`src/utils/host/translate/api/doubao/`
   - 调用 `POST https://www.doubao.com/samantha/plugin/stream_article_translate`
   - 用豆包网页版登录 Cookie 鉴权，SSE 流式解析，按 `items[].index` 回填
   - 分批策略：单批 ≤ 10,000 字符且 ≤ 50 段
2. 新增豆包接口契约与常量：`src/utils/constants/doubao.ts`、`src/types/doubao.ts`
3. 新增「豆包账号」设置页：`src/entrypoints/options/pages/doubao-account/`
   （采集 / 探针校验 / 脱敏展示 / 清除 / 手动导入）
4. 新增 popup 组件：账号状态卡、三服务切换器
5. 精简翻译服务为三个 provider：`doubao-huoshan` / `doubao-llm` / `doubao-microsoft`
   （对应 `translate_service` = `"0"` / `"1"` / `"3"`）
6. 为存量配置提供一次性迁移：`src/utils/config/default-translate-provider.ts`
7. 新增契约对抗测试与 mock：`scripts/verify/`

完整的对应源代码即本仓库全部内容。

## 免责声明 / Disclaimer

豆包翻译依赖**非公开**的内部接口，可能随时变更或失效。请使用自己合法的豆包账号，
并自行承担使用风险。本项目与字节跳动 / 豆包官方无任何关联。

The Doubao translation provider relies on an **undocumented internal endpoint**
that may change or break at any time. Use your own account and at your own risk.
This project is not affiliated with ByteDance or Doubao.

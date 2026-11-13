import { PageLayout } from "../../components/page-layout"
import { DoubaoServiceList } from "./doubao-services"
import { ThirdPartyService } from "./third-party-service"

/**
 * 「翻译服务」页。页面文案按二次开发需求硬编码中文，不进 locales。
 */
export function ApiProvidersPage() {
  return (
    <PageLayout
      title="翻译服务"
      description="可使用豆包登录态翻译，或配置自己的第三方 API。第三方 API 支持 OpenAI 兼容的 Chat Completions 接口。"
      innerClassName="flex flex-col gap-10"
    >
      <ThirdPartyService />
      <DoubaoServiceList />
    </PageLayout>
  )
}

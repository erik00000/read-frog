import { PageLayout } from "../../components/page-layout"
import { DoubaoServiceList } from "./doubao-services"
import { ThirdPartyService } from "./third-party-service"

/**
 * 「翻译服务」页。页面文案按二次开发需求硬编码中文，不进 locales。
 */
export function ApiProvidersPage() {
  return (
    <PageLayout
      title="选择你的翻译方式"
      description="日常阅读用豆包，专业需求接入自己的模型。选好服务，就可以开始翻译了。"
      innerClassName="flex flex-col gap-10"
    >
      <section aria-label="豆包翻译服务" className="space-y-5">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold tracking-widest text-emerald-700 dark:text-emerald-400">
            01 / 豆包翻译
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <DoubaoServiceList />
      </section>
      <section aria-label="自定义翻译服务" className="space-y-5">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold tracking-widest text-muted-foreground">
            02 / 自定义模型
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <ThirdPartyService />
      </section>
    </PageLayout>
  )
}

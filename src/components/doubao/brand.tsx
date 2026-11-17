import { Languages } from "lucide-react"

export function DoubaoBrand() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm group-data-[state=collapsed]:size-8">
        <Languages className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 group-data-[state=collapsed]:hidden">
        <div className="text-base font-semibold tracking-tight">豆包翻译</div>
        <div className="mt-0.5 text-[11px] tracking-wide text-muted-foreground">
          让阅读，跨越语言
        </div>
      </div>
    </div>
  )
}

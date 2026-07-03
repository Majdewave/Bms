export default function ChatPanelSkeleton() {
  return (
    <div className="h-full min-h-0 flex flex-col" aria-label="Loading chat panel">
      <div className="shrink-0 px-4 py-3 border-b border-indigo-100 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-t-2xl">
        <div className="h-4 w-28 bg-white/30 rounded animate-pulse" />
        <div className="h-3 w-20 bg-white/20 rounded mt-2 animate-pulse" />
      </div>

      <div className="flex-1 p-3 space-y-2 overflow-hidden">
        <div className="h-14 rounded-xl bg-slate-100 animate-pulse" />
        <div className="h-14 rounded-xl bg-slate-100 animate-pulse" />
        <div className="h-14 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    </div>
  )
}
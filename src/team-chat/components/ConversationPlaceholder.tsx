export default function ConversationPlaceholder() {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="border-t border-slate-200 mb-4" />
        <h4 className="text-base font-semibold text-slate-900">Conversation</h4>
        <p className="text-sm text-slate-600 mt-2">Chat functionality will appear here.</p>
        <p className="text-sm text-slate-500 mt-1">Select Back to return to Online Users.</p>
        <div className="border-t border-slate-200 mt-4" />
      </div>
    </div>
  )
}
import { MessageCircle } from 'lucide-react'

export default function ChatEmptyState() {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="max-w-xs text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
          <MessageCircle className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-900">Team Chat</h4>
        <p className="text-sm text-slate-600 mt-2">אין אנשי צוות מחוברים כרגע.</p>
        <p className="text-xs text-slate-500 mt-1">ברגע שאיש צוות יתחבר, הוא יופיע כאן אוטומטית.</p>
      </div>
    </div>
  )
}
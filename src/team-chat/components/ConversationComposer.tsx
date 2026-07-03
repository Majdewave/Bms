import { useState } from 'react'
import { toast } from 'react-toastify'
import { useTranslation } from 'react-i18next'

interface ConversationComposerProps {
  onSend: (text: string) => Promise<void>
}

const MAX_MESSAGE_LENGTH = 1000

export default function ConversationComposer({ onSend }: ConversationComposerProps) {
  const { i18n } = useTranslation()
  const [value, setValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const isRTL = i18n.dir() === 'rtl'

  const handleSend = async () => {
    if (isSending) return

    const trimmedText = value.trim()
    if (!trimmedText) {
      return
    }

    setIsSending(true)

    try {
      await onSend(trimmedText.slice(0, MAX_MESSAGE_LENGTH))
      setValue('')
    } catch {
      toast.error('לא ניתן לשלוח כרגע. בדוק את החיבור ונסה שוב.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="border-t border-slate-200 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-white sticky bottom-0 z-10">
      <div className={`flex items-end gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onFocus={(event) => {
            window.setTimeout(() => {
              event.currentTarget.scrollIntoView({ block: 'nearest' })
            }, 60)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void handleSend()
            }
          }}
          dir={isRTL ? 'rtl' : 'ltr'}
          className="flex-1 min-h-[44px] max-h-32 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
          placeholder="Write a message"
          maxLength={MAX_MESSAGE_LENGTH}
          aria-label="Message input"
        />

        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={isSending || value.trim().length === 0}
          className="h-11 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          שלח
        </button>
      </div>
    </div>
  )
}

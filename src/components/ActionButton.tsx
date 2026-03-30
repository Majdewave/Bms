import { Check, X, UserCheck, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type Props = {
  type: 'arrived' | 'start' | 'complete' | 'cancel' | 'noshow'
  onClick: () => void
}

export default function ActionButton({ type, onClick }: Props) {
  const { t } = useTranslation()

  const config = {
    arrived: {
      label: t('appointments.actions.arrived'),
      icon: <UserCheck size={16} />,
      className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
    },
    start: {
      label: t('appointments.actions.start'),
      icon: <Play size={16} />,
      className: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
    },
    complete: {
      label: t('appointments.actions.complete'),
      icon: <Check size={16} />,
      className: 'bg-green-100 text-green-700 hover:bg-green-200',
    },
    cancel: {
      label: t('appointments.actions.cancel'),
      icon: <X size={16} />,
      className: 'bg-red-100 text-red-700 hover:bg-red-200',
    },
    noshow: {
      label: t('appointments.actions.noshow'),
      icon: <X size={16} />,
      className: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
    },
  }

  const item = config[type]

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${item.className}`}
    >
      {item.icon}
      {item.label}
    </button>
  )
}

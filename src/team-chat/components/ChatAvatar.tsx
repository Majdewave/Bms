interface ChatAvatarProps {
  fullName: string
  imageUrl?: string
}

const getInitial = (name: string) => {
  const trimmed = name.trim()
  return trimmed ? trimmed[0].toUpperCase() : '?'
}

export default function ChatAvatar({ fullName, imageUrl }: ChatAvatarProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={fullName}
        className="w-9 h-9 rounded-full object-cover"
      />
    )
  }

  return (
    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold flex items-center justify-center">
      {getInitial(fullName)}
    </div>
  )
}
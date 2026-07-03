import React from 'react'

interface TeamChatErrorBoundaryProps {
  children: React.ReactNode
}

interface TeamChatErrorBoundaryState {
  hasError: boolean
}

export default class TeamChatErrorBoundary extends React.Component<TeamChatErrorBoundaryProps, TeamChatErrorBoundaryState> {
  constructor(props: TeamChatErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    if (import.meta.env.DEV) {
      console.error('[TeamChat] UI error boundary captured an error', error)
    }
  }

  render() {
    if (this.state.hasError) {
      return null
    }

    return this.props.children
  }
}
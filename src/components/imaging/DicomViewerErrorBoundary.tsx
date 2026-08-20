import React from 'react'

interface DicomViewerErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface DicomViewerErrorBoundaryState {
  hasError: boolean
}

export default class DicomViewerErrorBoundary extends React.Component<
  DicomViewerErrorBoundaryProps,
  DicomViewerErrorBoundaryState
> {
  constructor(props: DicomViewerErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('[DicomViewer] Runtime error captured by boundary', error)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null
    }

    return this.props.children
  }
}

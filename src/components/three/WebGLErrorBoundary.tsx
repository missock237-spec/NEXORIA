'use client'

// NEXORIA — Garde-fou WebGL : dégradation gracieuse si le GPU/contexte échoue
import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  label?: string
}

interface State {
  error: string | null
}

export class WebGLErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    const msg =
      error instanceof Error
        ? `${error.message}`
        : String(error)
    return { error: msg }
  }

  componentDidCatch(error: unknown) {
    console.error('[NEXORIA][3D]', error)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#16121f] p-6 text-center">
          <div className="text-3xl">⚠</div>
          <div className="text-sm font-bold uppercase tracking-[0.2em] text-[#e8d8b0]">
            Rendu 3D indisponible
          </div>
          <div className="max-w-md text-xs leading-relaxed text-[#8a80a0]">
            Votre appareil ou navigateur n’a pas pu initialiser le rendu 3D
            {this.props.label ? ` (${this.props.label})` : ''}. Le jeu nécessite WebGL.
            Essayez un autre navigateur, ou activez l’accélération matérielle.
          </div>
          <div className="max-w-md break-words rounded-sm border border-[#8c3a2e55] bg-[#0c0a14] px-3 py-2 font-mono text-[10px] text-[#e89880]">
            {this.state.error.slice(0, 300)}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="min-h-[42px] rounded-sm border border-[#b8985c66] px-5 text-xs font-bold uppercase tracking-widest text-[#d4b878]"
          >
            Réessayer
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

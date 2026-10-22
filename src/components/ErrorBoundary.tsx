import { Component, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { err?: Error }> {
  state: { err?: Error } = {}

  static getDerivedStateFromError(err: Error) {
    return { err }
  }

  render() {
    if (!this.state.err) return this.props.children
    return (
      <div className="state err" style={{ minHeight: '100vh' }}>
        <b>Algo correu mal.</b>
        <span>{this.state.err.message}</span>
        <button type="button" className="btn" onClick={() => location.reload()}>Recarregar</button>
      </div>
    )
  }
}

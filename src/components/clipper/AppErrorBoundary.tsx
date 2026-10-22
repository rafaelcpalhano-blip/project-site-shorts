import { Component } from 'react'
import type { ReactNode } from 'react'
import { FatalPage } from './ClipperFailure'
export class AppErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state = {failed:false}
  static getDerivedStateFromError() { return {failed:true} }
  render() { return this.state.failed ? <FatalPage /> : this.props.children }
}

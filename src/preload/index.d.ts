import type { KeeguApi } from './index'

declare global {
  interface Window {
    keegu: KeeguApi
  }
}

export {}

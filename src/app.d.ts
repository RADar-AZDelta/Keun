// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types

import type { UserSession } from '@radar-azdelta-int/radar-firebase-utils'

declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface Platform {}
    interface Locals {
      userSession: UserSession | undefined
    }
  }

  namespace svelteHTML {
    interface HTMLAttributes<T> {
      'on:outClick'?: (event: CustomEvent) => void
    }
  }
}

export {}

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types

export interface UserSession {
  uid?: string;
  name?: string;
  email?: string;
  roles?: [string];
  token?: string;
  exp?: string
}


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

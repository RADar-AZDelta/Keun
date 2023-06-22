// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types

export interface UserSession {
	uid?: string;
	name?: sytring;
	email?: string;
	roles?: [string];
	token?: string;
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

  namespace svelte.JSX {
    interface HTMLAttributes {
      onoutClick: (e: CustomEvent) => void
    }
  }
}

export {}

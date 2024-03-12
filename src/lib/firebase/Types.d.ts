import type { GoogleAuthProvider, OAuthProvider } from "firebase/auth"

export interface IRole {
    roles?: string[]
  }
  
  export interface UserSession {
    uid?: string
    name?: string
    email?: string
    roles?: string[]
    token?: string
    exp?: string
  }
  
  export interface IAuthProviders {
    google: GoogleAuthProvider
    microsoft: OAuthProvider
    [key: string]: AuthProvider
  }
  
  export interface IMessage {
    result: string
    title: string
    message: string | object
  }
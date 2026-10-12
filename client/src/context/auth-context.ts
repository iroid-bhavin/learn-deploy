import { createContext } from 'react'
import type { User } from '../api'
import type { LoginInput, SignupInput } from '../validation/auth.schema'

export interface AuthContextValue {
  user: User | null
  checking: boolean
  login: (data: LoginInput) => Promise<void>
  signup: (data: SignupInput) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

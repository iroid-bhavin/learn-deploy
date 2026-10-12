import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, hasToken, setToken } from '../api'
import type { User } from '../api'
import type { LoginInput, SignupInput } from '../validation/auth.schema'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(hasToken())

  useEffect(() => {
    if (!hasToken()) return
    api
      .me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setChecking(false))
  }, [])

  const login = useCallback(async ({ email, password }: LoginInput) => {
    const result = await api.login(email, password)
    setToken(result.token)
    setUser(result.user)
  }, [])

  const signup = useCallback(async (data: SignupInput) => {
    const result = await api.signup(data)
    setToken(result.token)
    setUser(result.user)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, checking, login, signup, logout }),
    [user, checking, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

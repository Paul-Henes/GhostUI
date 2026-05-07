// 👤 JANNIK: useAuth Hook
// Convenient hook for consuming auth context

import { useAuthContext } from '../context/AuthContext'

export function useAuth() {
  const { user, token, isAuthenticated, isLoading, login, signup, logout } = useAuthContext()

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    signup,
    logout,
  }
}

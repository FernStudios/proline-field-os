import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store'
import { clearAccountIdCache } from '../lib/db'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const { loadFromSupabase, loadTemplateFromSupabase, syncToSupabase, setUserId } = useStore()

  // Bootstrap account + cache account_id for a logged-in user
  const handleLogin = async (supabaseUser) => {
    if (!supabaseUser) return
    await setUserId(
      supabaseUser.id,
      supabaseUser.email || '',
      supabaseUser.user_metadata?.full_name || ''
    )
    await loadFromSupabase(supabaseUser.id)
    await loadTemplateFromSupabase(supabaseUser.id)
  }

  useEffect(() => {
    if (!supabase) { setLoading(false); return }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) handleLogin(session.user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)

      if (event === 'SIGNED_IN' && session?.user) {
        handleLogin(session.user)
      }

      if (event === 'SIGNED_UP' && session?.user) {
        const store = useStore.getState?.()
        if (store?.updateSubscription) {
          store.updateSubscription({
            plan: 'trial',
            trialStartDate: new Date().toISOString(),
            renewalDate: new Date(Date.now() + 14 * 86400000).toISOString(),
          })
        }
        // Bootstrap account for new signup
        setUserId(
          session.user.id,
          session.user.email || '',
          session.user.user_metadata?.full_name || ''
        ).then(() => {
          setTimeout(() => syncToSupabase(session.user.id), 800)
        })
      }

      if (event === 'SIGNED_OUT') {
        clearAccountIdCache()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name, plan: 'beta_free', planActivatedAt: new Date().toISOString() } }
    })
    return { error }
  }

  const signOut = async () => {
    if (user) await syncToSupabase(user.id)
    clearAccountIdCache()
    await supabase?.auth.signOut()
    setUser(null)
  }

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  }

  // Auto-sync to Supabase every 2 minutes
  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => syncToSupabase(user.id), 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

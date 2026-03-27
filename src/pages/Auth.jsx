import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Button, FormGroup, Input } from '../components/ui'
import { useStore } from '../store'

export default function AuthPage() {
  const [mode, setMode] = useState('login') // login | register | reset
  const [form, setForm] = useState({ name: '', email: '', password: '', invite: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const { signIn, signUp, resetPassword } = useAuth()
  const loadDemoData = useStore((s) => s.loadDemoData)
  const navigate = useNavigate()

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (mode === 'login') {
      const { error } = await signIn(form.email, form.password)
      if (error) { setError(error.message); setLoading(false); return }
      navigate('/dashboard')
    } else if (mode === 'register') {
      if (!form.name || !form.email || !form.password || !form.invite) {
        setError('All fields are required including the invite code.')
        setLoading(false); return
      }
      const { error } = await signUp(form.email, form.password, form.name, form.invite)
      if (error) { setError(error.message); setLoading(false); return }
      navigate('/dashboard')
    } else {
      const { error } = await resetPassword(form.email)
      if (error) { setError(error.message); setLoading(false); return }
      setResetSent(true)
    }
    setLoading(false)
  }

  const demoMode = () => { loadDemoData(); navigate('/dashboard') }

  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="font-display font-bold text-white text-2xl tracking-tight">
            Proline <span className="text-brand">Field OS</span>
          </div>
          <p className="text-white/50 text-sm mt-1">Contractor Job Management</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-6 shadow-xl">
          {resetSent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">📧</div>
              <p className="font-semibold text-navy">Check your email</p>
              <p className="text-sm text-gray-500 mt-1">Password reset link sent to {form.email}</p>
              <Button variant="link" className="mt-4" onClick={() => { setMode('login'); setResetSent(false) }}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="font-display font-bold text-navy text-lg">
                {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Reset password'}
              </h2>

              {mode === 'register' && (
                <FormGroup label="Full name">
                  <Input type="text" placeholder="John Turner" value={form.name} onChange={set('name')} required />
                </FormGroup>
              )}

              <FormGroup label="Email">
                <Input type="email" placeholder="you@company.com" value={form.email} onChange={set('email')} required />
              </FormGroup>

              {mode !== 'reset' && (
                <FormGroup label="Password">
                  <Input type="password" placeholder="Min 6 characters" value={form.password} onChange={set('password')} required minLength={6} />
                </FormGroup>
              )}

              {mode === 'register' && (
                <FormGroup label="Beta invite code">
                  <Input
                    type="text"
                    placeholder="PROLINEBETA2026"
                    value={form.invite}
                    onChange={(e) => setForm(f => ({ ...f, invite: e.target.value.toUpperCase() }))}
                    required
                  />
                </FormGroup>
              )}

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <Button variant="primary" className="w-full" type="submit" disabled={loading}>
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset link'}
              </Button>

              <div className="flex items-center justify-between text-sm">
                {mode === 'login' ? (
                  <>
                    <button type="button" onClick={() => setMode('register')} className="text-brand font-medium">
                      Create account
                    </button>
                    <button type="button" onClick={() => setMode('reset')} className="text-gray-400">
                      Forgot password?
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setMode('login')} className="text-brand font-medium">
                    Back to sign in
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Demo mode */}
        <div className="text-center mt-4">
          <button onClick={demoMode} className="text-white/40 text-xs hover:text-white/60 transition-colors">
            Try demo mode
          </button>
        </div>
      </div>
    </div>
  )
}

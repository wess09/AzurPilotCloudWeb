import { useState } from 'react'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { Surface } from '@cloudflare/kumo/components/surface'
import { Text } from '@cloudflare/kumo/components/text'
import { Banner } from '@cloudflare/kumo/components/banner'
import { api, ApiError, getToken, setToken } from '../api'
import { Logo } from '../ui'

export function Login({ onLogin, errorMessage }: { onLogin: () => void; errorMessage?: string | null }) {
  const [token, setLocalToken] = useState(getToken())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const connect = async () => {
    setBusy(true)
    setError(null)
    setToken(token.trim())
    try {
      await api.probe()
      onLogin()
    } catch (e) {
      const err = e as ApiError
      setError(err.status === 403 ? '管理接口未启用' : err.status === 401 ? '管理凭据无效' : err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="admin-login">
      <Surface className="admin-login-card">
        <div className="admin-brand"><Logo size={36} /><Text as="h1" variant="heading" size="lg">AzurPilot 管理后台</Text></div>
        <form className="admin-form" onSubmit={event => { event.preventDefault(); void connect() }}>
          <Input label="管理凭据" type="password" name="admin-token" autoComplete="current-password" value={token} onChange={event => setLocalToken(event.target.value)} autoFocus required />
          {(error || errorMessage) && <Banner variant="error">{error || errorMessage}</Banner>}
          <Button type="submit" variant="primary" loading={busy} disabled={!token.trim()}>登录</Button>
        </form>
      </Surface>
    </main>
  )
}

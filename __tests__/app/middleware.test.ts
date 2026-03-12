import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'
import { getPrivateOwnerLoginPath } from '@/lib/authConfig'
import { AUTH_COOKIE_NAME, getAuthToken } from '@/lib/apiSecurity'

describe('middleware auth gate', () => {
  it('redirects unauthenticated page requests back to the locked root', () => {
    const response = middleware(new NextRequest('http://localhost/vault'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost/')
    expect(response.headers.get('x-frame-options')).toBe('DENY')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('returns 401 for unauthenticated API requests outside the auth allowlist', () => {
    const response = middleware(new NextRequest('http://localhost/api/capsules'))

    expect(response.status).toBe(401)
  })

  it('allows the public deploy smoke route without authentication', () => {
    const response = middleware(new NextRequest('http://localhost/api/deploy/smoke'))

    expect(response.status).toBe(200)
    expect(response.headers.get('permissions-policy')).toBe('camera=(), microphone=(), geolocation=()')
  })

  it('redirects authenticated private-route requests back to the workspace root', () => {
    const token = getAuthToken({
      sub: 'egor-n1',
      role: 'owner',
      factors: ['password', 'access_code'],
    })
    const response = middleware(
      new NextRequest(`http://localhost${getPrivateOwnerLoginPath()}`, {
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${token}`,
        },
      }),
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost/')
  })

  it('redirects unauthenticated requests for the wrong architect-gate path back to root', () => {
    const response = middleware(new NextRequest('http://localhost/architect-gate/not-the-route'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost/')
  })
})

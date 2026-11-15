// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./sessionManager', () => ({
  updateLastActivity: vi.fn(),
  isSessionExpired: vi.fn(() => false),
}))
vi.mock('./auth', () => ({ logout: vi.fn() }))
vi.mock('react-toastify', () => ({
  toast: { isActive: vi.fn(), error: vi.fn() },
}))
vi.mock('@/lib/apiBaseUrl', () => ({
  getApiBaseUrl: () => 'https://api.test',
}))

import { ApiError, get } from './apiClient'
import { getInterpretationRequest } from './imagingInterpretations'

describe('getInterpretationRequest', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let consoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('does not log an expected 404 and still rejects with the ApiError for the caller', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ title: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/problem+json' },
      })
    )

    const error = await getInterpretationRequest('order-1').catch((caught) => caught)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/api/imaging/orders/order-1/interpretation-request',
      expect.objectContaining({ method: 'GET' })
    )
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404 })
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('continues logging 404s from unrelated endpoints', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ title: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/problem+json' },
      })
    )

    await expect(get('/api/unrelated')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
    })

    expect(consoleError).toHaveBeenNthCalledWith(1, '[API Error] Status: 404')
    expect(consoleError).toHaveBeenNthCalledWith(
      2,
      '[API Error] Response:',
      JSON.stringify({ title: 'Not Found' })
    )
  })

  it('continues logging server errors from the interpretation-request endpoint', async () => {
    fetchMock.mockResolvedValue(
      new Response('Internal Server Error', { status: 500 })
    )

    await expect(getInterpretationRequest('order-1')).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
    })

    expect(consoleError).toHaveBeenNthCalledWith(1, '[API Error] Status: 500')
    expect(consoleError).toHaveBeenNthCalledWith(
      2,
      '[API Error] Response:',
      'Internal Server Error'
    )
  })
})

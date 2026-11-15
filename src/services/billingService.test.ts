import { describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('./axios', () => ({ default: api }))

import { changePlan, createBillingPortal, PlanType } from './billingService'

describe('changePlan', () => {
  it('posts the numeric plan and monthly cycle to the existing endpoint', async () => {
    api.post.mockResolvedValue({ data: { type: 'downgrade', effectiveImmediately: false } })

    await changePlan(PlanType.Basic, 'Monthly')

    expect(api.post).toHaveBeenCalledWith('/billing/change-plan', { newPlan: 1, newCycle: 0 })
  })
})

describe('createBillingPortal', () => {
  it('uses the authenticated tenant portal endpoint without accepting a customer ID', async () => {
    api.post.mockResolvedValue({ data: { url: 'https://billing.stripe.test/session' } })

    await expect(createBillingPortal()).resolves.toEqual({
      url: 'https://billing.stripe.test/session',
    })

    expect(api.post).toHaveBeenCalledWith('/billing/portal')
  })
})

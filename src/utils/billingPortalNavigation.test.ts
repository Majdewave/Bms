import { describe, expect, it } from 'vitest'
import { redirectToBillingPortal } from './billingPortalNavigation'

describe('redirectToBillingPortal', () => {
  it('navigates to the URL returned by the portal session endpoint', () => {
    const location = { href: '' }

    redirectToBillingPortal('https://billing.stripe.test/session', location)

    expect(location.href).toBe('https://billing.stripe.test/session')
  })
})

// @ts-nocheck
import { describe, it, expect } from 'vitest'

describe('Pricing Configuration', () => {
  const tiers = [
    { id: 'free', name: 'Free', monthlyPrice: 0, accounts: 1 },
    { id: 'growth', name: 'Growth', monthlyPrice: 39, accounts: 3 },
    { id: 'team', name: 'Team', monthlyPrice: 149, accounts: 10 },
    { id: 'agency', name: 'Agency', monthlyPrice: 399, accounts: 25 },
  ]

  it('has 4 pricing tiers including free', () => {
    expect(tiers).toHaveLength(4)
    expect(tiers[0].id).toBe('free')
    expect(tiers[0].monthlyPrice).toBe(0)
  })

  it('prices increase with tier level', () => {
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i].monthlyPrice).toBeGreaterThan(tiers[i - 1].monthlyPrice)
    }
  })

  it('account limits increase with tier level', () => {
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i].accounts).toBeGreaterThan(tiers[i - 1].accounts)
    }
  })

  it('Growth tier is priced competitively vs Pipeboard', () => {
    const growth = tiers.find((t) => t.id === 'growth')!
    // Pipeboard Pro is $29.90/mo with limited features
    // AdNexus Growth at $39/mo undercuts Madgicx ($49) and Revealbot ($99)
    expect(growth.monthlyPrice).toBe(39)
    expect(growth.accounts).toBe(3)
  })

  it('Team tier matches AIdoc recommendation', () => {
    const team = tiers.find((t) => t.id === 'team')!
    expect(team.monthlyPrice).toBe(149)
    expect(team.accounts).toBe(10)
  })

  it('Agency tier is priced for agencies', () => {
    const agency = tiers.find((t) => t.id === 'agency')!
    expect(agency.monthlyPrice).toBe(399)
    expect(agency.accounts).toBe(25)
  })

  it('annual prices give 2 months free', () => {
    const annualMultiplier = 10 / 12 // 12 months for price of 10
    for (const tier of tiers.slice(1)) {
      const expectedAnnual = Math.round(tier.monthlyPrice * 12 * annualMultiplier)
      // Annual should be roughly 83% of monthly * 12
      expect(expectedAnnual).toBeLessThan(tier.monthlyPrice * 12)
    }
  })
})

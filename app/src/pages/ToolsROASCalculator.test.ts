import { describe, it, expect } from 'vitest'

describe('ROAS Calculator', () => {
  function calculateROAS(revenue: number, spend: number): number {
    if (spend === 0) return 0
    return revenue / spend
  }

  function calculateCPA(spend: number, conversions: number): number {
    if (conversions === 0) return 0
    return spend / conversions
  }

  function calculateCPC(spend: number, clicks: number): number {
    if (clicks === 0) return 0
    return spend / clicks
  }

  function calculateCTR(clicks: number, impressions: number): number {
    if (impressions === 0) return 0
    return (clicks / impressions) * 100
  }

  function calculateCVR(conversions: number, clicks: number): number {
    if (clicks === 0) return 0
    return (conversions / clicks) * 100
  }

  describe('ROAS', () => {
    it('calculates ROAS correctly', () => {
      expect(calculateROAS(400, 100)).toBe(4) // 4:1 ROAS
    })

    it('returns 0 for zero spend', () => {
      expect(calculateROAS(1000, 0)).toBe(0)
    })

    it('handles ROAS below 1 (losing money)', () => {
      expect(calculateROAS(50, 100)).toBe(0.5)
    })
  })

  describe('CPA', () => {
    it('calculates cost per acquisition', () => {
      expect(calculateCPA(100, 10)).toBe(10)
    })

    it('returns 0 for zero conversions', () => {
      expect(calculateCPA(100, 0)).toBe(0)
    })
  })

  describe('CPC', () => {
    it('calculates cost per click', () => {
      expect(calculateCPC(100, 500)).toBe(0.2)
    })
  })

  describe('CTR', () => {
    it('calculates click-through rate as percentage', () => {
      expect(calculateCTR(50, 1000)).toBe(5) // 5%
    })
  })

  describe('CVR', () => {
    it('calculates conversion rate as percentage', () => {
      expect(calculateCVR(10, 500)).toBe(2) // 2%
    })
  })

  describe('Benchmarks', () => {
    it('good ROAS is 4:1 or higher', () => {
      expect(calculateROAS(400, 100)).toBeGreaterThanOrEqual(4)
    })

    it('typical CTR for Meta ads is 0.9-1.5%', () => {
      const ctr = calculateCTR(12, 1000) // 1.2%
      expect(ctr).toBeGreaterThanOrEqual(0.9)
      expect(ctr).toBeLessThanOrEqual(1.5)
    })

    it('typical CVR for e-commerce is 2-3%', () => {
      const cvr = calculateCVR(25, 1000) // 2.5%
      expect(cvr).toBeGreaterThanOrEqual(2)
      expect(cvr).toBeLessThanOrEqual(3)
    })
  })
})

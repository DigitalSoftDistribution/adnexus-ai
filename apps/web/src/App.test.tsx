import { describe, it, expect } from 'vitest'

describe('App Entry Point', () => {
  it('verifies route definitions exist in App.tsx source', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const appSource = fs.readFileSync(
      path.resolve(__dirname, 'App.tsx'),
      'utf-8'
    )

    // Verify existing routes
    const existingRoutes = [
      '/pricing',
      '/compare/pipeboard',
      '/compare/birch',
      '/compare/smartly',
      '/compare/adkit',
      '/tools/roas-calculator',
    ]

    for (const route of existingRoutes) {
      expect(appSource, `Route ${route} should exist`).toContain(route)
    }
  })

  it('has ProtectedRoute wrapper on authenticated routes', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const appSource = fs.readFileSync(
      path.resolve(__dirname, 'App.tsx'),
      'utf-8'
    )

    expect(appSource).toContain('ProtectedRoute')
    expect(appSource).toContain('PageTransition')
  })

  it('has main layout and navigation structure', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const appSource = fs.readFileSync(
      path.resolve(__dirname, 'App.tsx'),
      'utf-8'
    )

    expect(appSource).toContain('Layout')
    expect(appSource).toContain('Route')
    expect(appSource).toContain('Routes')
  })
})

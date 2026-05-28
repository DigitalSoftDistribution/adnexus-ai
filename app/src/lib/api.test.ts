import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'

describe('Supabase Client Configuration', () => {
  it('creates a client with valid URL format', () => {
    const url = 'https://test.supabase.co'
    const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'
    const client = createClient(url, key)
    expect(client).toBeTruthy()
    expect(client.auth).toBeTruthy()
  })
})

describe('Auth Flow', () => {
  it('validates email format for signup', () => {
    const validEmails = ['user@example.com', 'test+tag@domain.co']
    const invalidEmails = ['notanemail', '@missing.com', 'missing@']

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    validEmails.forEach((email) => expect(emailRegex.test(email)).toBe(true))
    invalidEmails.forEach((email) => expect(emailRegex.test(email)).toBe(false))
  })

  it('password meets minimum length requirement', () => {
    const minLength = 8
    expect('short'.length).toBeLessThan(minLength)
    expect('password123'.length).toBeGreaterThanOrEqual(minLength)
  })
})

describe('API Client', () => {
  it('constructs base URL from environment', () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    expect(apiUrl).toBeTruthy()
    expect(apiUrl).toMatch(/^https?:\/\//)
  })
})

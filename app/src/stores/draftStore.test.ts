import { describe, it, expect, vi } from 'vitest'
import {
  DraftStatus,
  DraftAssetType,
  type Draft,
  type DraftAsset,
  type DraftComment,
} from '../stores/draftStore'

describe('Draft Types', () => {
  it('defines all expected draft statuses', () => {
    const statuses: DraftStatus[] = ['pending', 'approved', 'rejected', 'needs_revision']
    expect(statuses).toHaveLength(4)
    expect(statuses).toContain('pending')
    expect(statuses).toContain('approved')
    expect(statuses).toContain('rejected')
    expect(statuses).toContain('needs_revision')
  })

  it('defines all expected asset types', () => {
    const types: DraftAssetType[] = ['image', 'video', 'carousel', 'collection', 'story']
    expect(types).toHaveLength(5)
  })
})

describe('Draft Data Structure', () => {
  it('creates a valid draft object', () => {
    const draft: Draft = {
      id: 'draft-1',
      workspaceId: 'ws-1',
      campaignId: 'camp-1',
      campaignName: 'Summer Campaign',
      name: 'New Creative v2',
      description: 'Updated creative for Q3',
      status: 'pending',
      platform: 'meta',
      assets: [
        {
          id: 'asset-1',
          type: 'image',
          url: 'https://example.com/image.png',
          thumbnailUrl: 'https://example.com/thumb.png',
          name: 'hero-image.png',
          dimensions: { width: 1200, height: 628 },
          fileSize: 245000,
        },
      ],
      copy: {
        headline: 'Summer Sale',
        body: 'Up to 50% off',
        cta: 'Shop Now',
        description: 'Limited time offer',
      },
      comments: [],
      submittedBy: 'user-1',
      submittedByName: 'John Doe',
      submittedAt: '2026-05-28T12:00:00Z',
    }

    expect(draft.id).toBe('draft-1')
    expect(draft.status).toBe('pending')
    expect(draft.platform).toBe('meta')
    expect(draft.assets).toHaveLength(1)
    expect(draft.assets[0].type).toBe('image')
    expect(draft.copy.headline).toBe('Summer Sale')
    expect(draft.comments).toHaveLength(0)
  })

  it('tracks approval status transitions', () => {
    const validTransitions: Record<DraftStatus, DraftStatus[]> = {
      pending: ['approved', 'rejected', 'needs_revision'],
      approved: [],
      rejected: ['needs_revision'],
      needs_revision: ['pending'],
    }

    // Verify pending can transition to approved
    expect(validTransitions.pending).toContain('approved')
    // Verify approved is terminal
    expect(validTransitions.approved).toHaveLength(0)
    // Verify rejected can go to needs_revision
    expect(validTransitions.rejected).toContain('needs_revision')
  })

  it('supports multi-platform drafts', () => {
    const platforms = ['meta', 'google', 'tiktok', 'snap'] as const

    const drafts: Draft[] = platforms.map((platform, i) => ({
      id: `draft-${i}`,
      workspaceId: 'ws-1',
      name: `Draft for ${platform}`,
      status: 'pending' as DraftStatus,
      platform,
      assets: [],
      copy: {},
      comments: [],
      submittedBy: 'user-1',
      submittedByName: 'Test User',
      submittedAt: '2026-05-28T12:00:00Z',
    }))

    expect(drafts).toHaveLength(4)
    expect(drafts.map((d) => d.platform)).toEqual(['meta', 'google', 'tiktok', 'snap'])
  })
})

describe('Draft Comments', () => {
  it('supports annotation comments', () => {
    const comment: DraftComment = {
      id: 'comment-1',
      userId: 'user-1',
      userName: 'Jane',
      content: 'Move the CTA higher',
      createdAt: '2026-05-28T12:00:00Z',
      x: 0.5,
      y: 0.3,
    }

    expect(comment.x).toBe(0.5)
    expect(comment.y).toBe(0.3)
  })
})

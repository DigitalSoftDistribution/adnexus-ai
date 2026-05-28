import { Router, Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// ─── Types ───────────────────────────────────────────────────────

interface UploadRecord {
  id: string;
  name: string;
  storage_path: string;
  url: string;
  type: 'image' | 'video';
  size: number;
  mime_type: string;
  thumbnail_url?: string;
  user_id?: string;
  campaign_id?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

interface AuthenticatedRequest extends Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>> {
  user?: import('../types').JWTPayload;
  file?: Express.Multer.File;
}

interface ListResponse {
  data: UploadRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Configuration ───────────────────────────────────────────────

const BUCKET_NAME = 'creative-assets';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ACCEPTED_MIMES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
};

// ─── Multer (memory storage) ─────────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10, // max 10 files per batch
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (ACCEPTED_MIMES[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Accepted: ${Object.keys(ACCEPTED_MIMES).join(', ')}`));
    }
  },
});

// ─── Supabase Client Factory ─────────────────────────────────────

function createSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable');
  }
  return createClient(url, serviceKey);
}

// ─── Helper Functions ────────────────────────────────────────────

function getFileType(mimeType: string): 'image' | 'video' {
  return mimeType.startsWith('image/') ? 'image' : 'video';
}

function generateStoragePath(file: Express.Multer.File, userId?: string): string {
  const timestamp = Date.now();
  const random = uuidv4().slice(0, 8);
  const ext = ACCEPTED_MIMES[file.mimetype] || path.extname(file.originalname);
  const base = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const folder = userId ? `users/${userId}` : 'public';
  return `${folder}/${timestamp}-${random}-${base}${ext}`;
}

function generatePublicUrl(supabase: SupabaseClient, storagePath: string): string {
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
  return data?.publicUrl || '';
}

// ─── Middleware ──────────────────────────────────────────────────

function authMiddleware(req: AuthenticatedRequest, res: Response, next: Function) {
  // Attach user if auth token is present; allow anonymous uploads too
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    // Token verification would go here in production
    // For now, decode the user from context or use a placeholder
    // req.user = decodedUser;
  }
  next();
}

// ─── Ensure Bucket Exists ────────────────────────────────────────

async function ensureBucket(supabase: SupabaseClient): Promise<void> {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === BUCKET_NAME);
    if (!exists) {
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
        allowedMimeTypes: Object.keys(ACCEPTED_MIMES),
      });
    }
  } catch (err) {
    console.warn('[upload] Bucket check/creation warning:', (err as Error).message);
  }
}

// ─── Router ──────────────────────────────────────────────────────

const router = Router();

/**
 * POST /upload
 * Upload a file to Supabase Storage and record metadata in the uploads table.
 *
 * Headers:
 *   Authorization: Bearer <token> (optional)
 * Body (multipart/form-data):
 *   file: <binary>
 *   campaign_id?: <string>
 *   thumbnail?: <string> (base64 thumbnail for images)
 */
router.post(
  '/upload',
  authMiddleware,
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supabase = createSupabaseClient();
      await ensureBucket(supabase);

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided' });
      }

      const file = req.file;
      const userId = req.user?.sub;
      const campaignId = req.body?.campaign_id;
      const thumbnailBase64 = req.body?.thumbnail;

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return res.status(413).json({
          success: false,
          message: `File too large. Maximum allowed: 50MB`,
        });
      }

      // Generate storage path
      const storagePath = generateStoragePath(file, userId);

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        console.error('[upload] Supabase upload error:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload file to storage',
          error: uploadError.message,
        });
      }

      // Get public URL
      const publicUrl = generatePublicUrl(supabase, storagePath);

      // If thumbnail provided and image, upload thumbnail too
      let thumbnailUrl = thumbnailBase64;
      if (thumbnailBase64 && getFileType(file.mimetype) === 'image') {
        const thumbPath = storagePath.replace(/\.\w+$/, '_thumb.jpg');
        const thumbBuffer = Buffer.from(thumbnailBase64.split(',')[1], 'base64');
        await supabase.storage.from(BUCKET_NAME).upload(thumbPath, thumbBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });
        thumbnailUrl = generatePublicUrl(supabase, thumbPath);
      }

      // Insert metadata record
      const uploadRecord: UploadRecord = {
        id: uuidv4(),
        name: file.originalname,
        storage_path: storagePath,
        url: publicUrl,
        type: getFileType(file.mimetype),
        size: file.size,
        mime_type: file.mimetype,
        thumbnail_url: thumbnailUrl,
        user_id: userId,
        campaign_id: campaignId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          originalName: file.originalname,
          encoding: file.encoding,
        },
      };

      const { error: dbError } = await supabase
        .from('uploads')
        .insert(uploadRecord);

      if (dbError) {
        // Rollback: delete from storage
        await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
        console.error('[upload] Database insert error:', dbError);
        return res.status(500).json({
          success: false,
          message: 'File uploaded but failed to save metadata',
          error: dbError.message,
        });
      }

      return res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          id: uploadRecord.id,
          name: uploadRecord.name,
          url: publicUrl,
          type: uploadRecord.type,
          size: uploadRecord.size,
          thumbnail_url: thumbnailUrl,
          created_at: uploadRecord.created_at,
        },
      });
    } catch (err: any) {
      console.error('[upload] Unexpected error:', err);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during upload',
        error: err.message,
      });
    }
  }
);

/**
 * GET /uploads
 * List all uploads with optional filtering, sorting, and pagination.
 *
 * Query params:
 *   search?: string — filter by name
 *   type?: 'image' | 'video' — filter by type
 *   dateFrom?: ISO date
 *   dateTo?: ISO date
 *   sortBy?: 'newest' | 'oldest' | 'name' | 'size'
 *   page?: number (default: 1)
 *   limit?: number (default: 20, max: 100)
 */
router.get('/uploads', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = createSupabaseClient();

    const {
      search,
      type,
      dateFrom,
      dateTo,
      sortBy = 'newest',
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const offset = (pageNum - 1) * limitNum;

    // Build query
    let query = supabase.from('uploads').select('*', { count: 'exact' });

    // User filter
    if (req.user?.sub) {
      query = query.eq('user_id', req.user.sub);
    }

    // Name search
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Type filter
    if (type && ['image', 'video'].includes(type as string)) {
      query = query.eq('type', type);
    }

    // Date range
    if (dateFrom) {
      query = query.gte('created_at', dateFrom as string);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo as string);
    }

    // Sorting
    switch (sortBy) {
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'name':
        query = query.order('name', { ascending: true });
        break;
      case 'size':
        query = query.order('size', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Pagination
    query = query.range(offset, offset + limitNum - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[uploads] Query error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch uploads',
        error: error.message,
      });
    }

    const total = count || 0;

    const response: ListResponse = {
      data: (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        name: row.name as string,
        url: row.url as string,
        type: (row.type as UploadRecord['type']) ?? 'image',
        size: row.size as number,
        created_at: row.created_at as string,
        thumbnail_url: row.thumbnail_url as string | undefined,
        metadata: row.metadata as Record<string, unknown> | undefined,
      }) as UploadRecord),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };

    return res.status(200).json(response);
  } catch (err: any) {
    console.error('[uploads] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
    });
  }
});

/**
 * GET /uploads/:id
 * Get a single upload by ID.
 */
router.get('/uploads/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = createSupabaseClient();
    const { id } = req.params;

    const { data, error } = await supabase
      .from('uploads')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message: 'Upload not found',
      });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
    });
  }
});

/**
 * DELETE /uploads/:id
 * Delete an upload by ID — removes from storage and database.
 */
router.delete('/uploads/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = createSupabaseClient();
    const { id } = req.params;

    // Fetch the upload record
    const { data: upload, error: fetchError } = await supabase
      .from('uploads')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !upload) {
      return res.status(404).json({
        success: false,
        message: 'Upload not found',
      });
    }

    // Authorization check
    if (upload.user_id && upload.user_id !== req.user?.sub) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this upload',
      });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([upload.storage_path]);

    if (storageError) {
      console.warn('[uploads] Storage delete warning:', storageError.message);
      // Continue even if storage delete fails — may already be gone
    }

    // Also delete thumbnail if exists
    if (upload.thumbnail_url) {
      const thumbPath = upload.storage_path.replace(/\.\w+$/, '_thumb.jpg');
      await supabase.storage.from(BUCKET_NAME).remove([thumbPath]);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('uploads')
      .delete()
      .eq('id', id);

    if (dbError) {
      console.error('[uploads] Database delete error:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete upload record',
        error: dbError.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Upload deleted successfully',
      data: { id },
    });
  } catch (err: any) {
    console.error('[uploads] Delete error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
    });
  }
});

/**
 * PATCH /uploads/:id
 * Update upload metadata.
 */
router.patch('/uploads/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = createSupabaseClient();
    const { id } = req.params;
    const { name, campaign_id, metadata } = req.body;

    // Fetch to verify ownership
    const { data: existing } = await supabase
      .from('uploads')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Upload not found' });
    }
    if (existing.user_id && existing.user_id !== req.user?.sub) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const updates: Partial<UploadRecord> = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) updates.name = name;
    if (campaign_id !== undefined) updates.campaign_id = campaign_id;
    if (metadata !== undefined) updates.metadata = metadata;

    const { data, error } = await supabase
      .from('uploads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update upload',
        error: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Upload updated',
      data,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
    });
  }
});

// ─── Error Handler ───────────────────────────────────────────────

router.use((err: any, _req: Request, res: Response, _next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  console.error('[upload] Error:', err);
  return res.status(500).json({
    success: false,
    message: err?.message || 'Unexpected error',
  });
});

// ─── Supabase Table Setup Helper ─────────────────────────────────

/**
 * SQL to create the uploads table:
 *
 * CREATE TABLE IF NOT EXISTS uploads (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   name TEXT NOT NULL,
 *   storage_path TEXT NOT NULL UNIQUE,
 *   url TEXT NOT NULL,
 *   type TEXT NOT NULL CHECK (type IN ('image', 'video')),
 *   size BIGINT NOT NULL,
 *   mime_type TEXT NOT NULL,
 *   thumbnail_url TEXT,
 *   user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
 *   campaign_id UUID,
 *   metadata JSONB DEFAULT '{}',
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now()
 * );
 *
 * -- Indexes
 * CREATE INDEX idx_uploads_user_id ON uploads(user_id);
 * CREATE INDEX idx_uploads_type ON uploads(type);
 * CREATE INDEX idx_uploads_created_at ON uploads(created_at DESC);
 * CREATE INDEX idx_uploads_campaign ON uploads(campaign_id);
 * CREATE INDEX idx_uploads_name ON uploads USING gin(name gin_trgm_ops);
 */

export default router;

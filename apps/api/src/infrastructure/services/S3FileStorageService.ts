import type { IFileStorageService, FileUploadResult } from '../../application/ports/IFileStorageService';
import { logger } from '../../lib/logger';

export class S3FileStorageService implements IFileStorageService {
  async upload(bucket: string, key: string, data: Buffer, contentType: string): Promise<FileUploadResult> {
    try {
      const { supabase } = await import('../../lib/supabase');
      const { data: uploadData, error } = await supabase.storage
        .from(bucket)
        .upload(key, data, { contentType, upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(key);

      return {
        key,
        url: urlData.publicUrl,
        size: data.length,
        contentType,
      };
    } catch (error) {
      logger.error({ error }, `File upload failed for ${bucket}/${key}`);
      throw error;
    }
  }

  async download(bucket: string, key: string): Promise<Buffer | null> {
    try {
      const { supabase } = await import('../../lib/supabase');
      const { data, error } = await supabase.storage.from(bucket).download(key);
      if (error) throw error;
      if (!data) return null;
      return Buffer.from(await data.arrayBuffer());
    } catch (error) {
      logger.error({ error }, `File download failed for ${bucket}/${key}`);
      return null;
    }
  }

  async delete(bucket: string, key: string): Promise<boolean> {
    try {
      const { supabase } = await import('../../lib/supabase');
      const { error } = await supabase.storage.from(bucket).remove([key]);
      if (error) throw error;
      return true;
    } catch (error) {
      logger.error({ error }, `File delete failed for ${bucket}/${key}`);
      return false;
    }
  }

  async getSignedUrl(bucket: string, key: string, expiresIn = 3600): Promise<string> {
    try {
      const { supabase } = await import('../../lib/supabase');
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(key, expiresIn);
      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      logger.error({ error }, `Signed URL failed for ${bucket}/${key}`);
      throw error;
    }
  }

  async exists(bucket: string, key: string): Promise<boolean> {
    try {
      const { supabase } = await import('../../lib/supabase');
      const { data, error } = await supabase.storage.from(bucket).list('', {
        search: key,
        limit: 1,
      });
      if (error) throw error;
      return data.length > 0;
    } catch (error) {
      return false;
    }
  }
}

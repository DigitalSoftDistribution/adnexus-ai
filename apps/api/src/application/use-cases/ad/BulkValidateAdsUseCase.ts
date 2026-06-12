import type { CreativeType } from '../../../domain/entities/Ad';
import { Result, ok, err, ForbiddenError, ValidationError } from '../../../domain/value-objects/Result';

export interface BulkAdSpec {
  adsetId: string;
  name: string;
  headline?: string | null;
  body?: string | null;
  callToAction?: string | null;
  landingPageUrl?: string | null;
  creativeType?: CreativeType | null;
  creativeUrl?: string | null;
  placements?: string[];
}

export interface BulkAdValidationIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface BulkAdValidationRow {
  index: number;
  valid: boolean;
  warnings: BulkAdValidationIssue[];
  errors: BulkAdValidationIssue[];
}

export interface BulkValidateAdsResult {
  results: BulkAdValidationRow[];
  summary: {
    total: number;
    valid: number;
    warningCount: number;
    errorCount: number;
  };
}

export interface BulkValidateAdsInput {
  workspaceId: string;
  userRole: string;
  specs: BulkAdSpec[];
}

const META_HEADLINE_MAX = 40;
const META_PRIMARY_TEXT_MAX = 125;

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateSpec(spec: BulkAdSpec, index: number, seenNames: Map<string, number>): BulkAdValidationRow {
  const warnings: BulkAdValidationIssue[] = [];
  const errors: BulkAdValidationIssue[] = [];

  if (!spec.adsetId?.trim()) {
    errors.push({ code: 'MISSING_ADSET', message: 'adsetId is required', severity: 'error' });
  }

  if (!spec.name?.trim()) {
    errors.push({ code: 'MISSING_NAME', message: 'name is required', severity: 'error' });
  } else {
    const normalized = spec.name.trim().toLowerCase();
    const duplicateIndex = seenNames.get(normalized);
    if (duplicateIndex !== undefined) {
      warnings.push({
        code: 'DUPLICATE_NAME',
        message: `Duplicate ad name also used at row ${duplicateIndex}`,
        severity: 'warning',
      });
    } else {
      seenNames.set(normalized, index);
    }
  }

  if (spec.headline && spec.headline.length > META_HEADLINE_MAX) {
    warnings.push({
      code: 'HEADLINE_LENGTH',
      message: `Headline exceeds Meta limit of ${META_HEADLINE_MAX} characters`,
      severity: 'warning',
    });
  }

  if (spec.body && spec.body.length > META_PRIMARY_TEXT_MAX) {
    warnings.push({
      code: 'BODY_LENGTH',
      message: `Primary text exceeds Meta limit of ${META_PRIMARY_TEXT_MAX} characters`,
      severity: 'warning',
    });
  }

  const creativeType = spec.creativeType ?? null;
  if ((creativeType === 'image' || creativeType === 'video') && !spec.creativeUrl?.trim()) {
    warnings.push({
      code: 'MISSING_CREATIVE',
      message: `${creativeType} ads require creativeUrl`,
      severity: 'warning',
    });
  }

  if (spec.landingPageUrl && !isValidHttpUrl(spec.landingPageUrl)) {
    errors.push({
      code: 'INVALID_LANDING_URL',
      message: 'landingPageUrl must be a valid http(s) URL',
      severity: 'error',
    });
  }

  if (spec.placements?.length) {
    const unsupported = spec.placements.filter((p) => !['feed', 'story', 'reels', 'search'].includes(p));
    if (unsupported.length > 0) {
      warnings.push({
        code: 'UNSUPPORTED_PLACEMENT',
        message: `Unsupported placements: ${unsupported.join(', ')}`,
        severity: 'warning',
      });
    }
  }

  return {
    index,
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

export class BulkValidateAdsUseCase {
  async execute(input: BulkValidateAdsInput): Promise<Result<BulkValidateAdsResult>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions to validate bulk ad specs'));
    }

    if (!Array.isArray(input.specs)) {
      return err(new ValidationError('specs must be an array'));
    }

    if (input.specs.length === 0) {
      return err(new ValidationError('specs must contain at least one ad spec'));
    }

    if (input.specs.length > 100) {
      return err(new ValidationError('specs cannot exceed 100 rows per request'));
    }

    const seenNames = new Map<string, number>();
    const results = input.specs.map((spec, index) => validateSpec(spec, index, seenNames));

    const warningCount = results.reduce((sum, row) => sum + row.warnings.length, 0);
    const errorCount = results.reduce((sum, row) => sum + row.errors.length, 0);

    return ok({
      results,
      summary: {
        total: results.length,
        valid: results.filter((row) => row.valid).length,
        warningCount,
        errorCount,
      },
    });
  }
}

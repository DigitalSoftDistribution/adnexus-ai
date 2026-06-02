import axios from 'axios';
import { config } from '../config';
import { getModuleLogger } from '../lib/logger';
import { ragService } from './rag-service';
import {
  renderCompetitorAdCard,
  contentHash,
  type CompetitorAdCardInput,
} from './rag-cards';

/**
 * Competitor ad ingestion + monitoring.
 *
 * Pulls competitor ad creatives / landing pages via Firecrawl (anti-bot scrape),
 * normalises them into competitor-ad cards, and embeds them into the
 * `adnexus_competitor_ads` Qdrant collection for similarity search and gap
 * analysis against the workspace's own creatives.
 *
 * Firecrawl is optional: when FIRECRAWL_API_KEY is unset, callers can still
 * ingest pre-fetched ads via `ingestCompetitorAds`.
 */

const log = getModuleLogger('competitor-ads');

export interface ScrapedCompetitorAd {
  sourceId: string;
  headline?: string;
  body?: string;
  callToAction?: string;
  landingUrl?: string;
  platform?: string;
  firstSeen?: string;
}

interface FirecrawlScrapeResponse {
  success?: boolean;
  data?: {
    markdown?: string;
    metadata?: { title?: string; description?: string; sourceURL?: string };
  };
}

/**
 * Scrape a competitor landing/ad page via Firecrawl and return a single
 * normalised ad record. For ad-library pages, callers typically pass multiple
 * URLs and merge results.
 */
export async function scrapeCompetitorPage(
  url: string,
): Promise<ScrapedCompetitorAd | null> {
  if (!config.firecrawl.apiKey) {
    log.warn('FIRECRAWL_API_KEY unset — cannot scrape');
    return null;
  }

  try {
    const res = await axios.post<FirecrawlScrapeResponse>(
      `${config.firecrawl.baseUrl}/v1/scrape`,
      { url, formats: ['markdown'], onlyMainContent: true },
      {
        headers: {
          Authorization: `Bearer ${config.firecrawl.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    );

    const data = res.data?.data;
    if (!data) return null;

    const markdown = (data.markdown ?? '').slice(0, 4000);
    return {
      sourceId: contentHash(url).slice(0, 16),
      headline: data.metadata?.title,
      body: data.metadata?.description ?? markdown.slice(0, 500),
      landingUrl: data.metadata?.sourceURL ?? url,
    };
  } catch (err) {
    log.error({ url, msg: (err as Error).message }, 'firecrawl scrape failed');
    return null;
  }
}

/**
 * Ingest a set of (already normalised) competitor ads for a workspace into the
 * RAG store. Returns the number of ads embedded.
 */
export async function ingestCompetitorAds(
  workspaceId: string,
  competitorDomain: string,
  ads: ScrapedCompetitorAd[],
): Promise<number> {
  if (!(await ragService.isReady())) {
    log.warn({ workspaceId }, 'rag not ready — skipping competitor ingest');
    return 0;
  }
  if (ads.length === 0) return 0;

  const cards = ads.map((ad) => {
    const input: CompetitorAdCardInput = {
      sourceId: ad.sourceId,
      competitorDomain,
      platform: ad.platform,
      headline: ad.headline,
      body: ad.body,
      callToAction: ad.callToAction,
      landingUrl: ad.landingUrl,
      firstSeen: ad.firstSeen,
    };
    return renderCompetitorAdCard(workspaceId, input);
  });

  const indexed = await ragService.indexCards(cards);
  log.info({ workspaceId, competitorDomain, indexed }, 'competitor ads ingested');
  return indexed;
}

/**
 * Convenience: scrape a list of competitor URLs and ingest them in one call.
 */
export async function scrapeAndIngest(
  workspaceId: string,
  competitorDomain: string,
  urls: string[],
): Promise<number> {
  const scraped: ScrapedCompetitorAd[] = [];
  for (const url of urls) {
    const ad = await scrapeCompetitorPage(url);
    if (ad) {
      ad.platform = ad.platform ?? 'web';
      scraped.push(ad);
    }
  }
  return ingestCompetitorAds(workspaceId, competitorDomain, scraped);
}

/**
 * Find the workspace's own creatives that are most similar to a competitor's
 * ad copy — useful for "are we already running something like this?" analysis.
 */
export async function findSimilarOwnCreatives(
  workspaceId: string,
  competitorAdText: string,
  limit = 5,
) {
  return ragService.search({
    workspaceId,
    collection: 'creatives',
    query: competitorAdText,
    limit,
  });
}

export const competitorAds = {
  scrapeCompetitorPage,
  ingestCompetitorAds,
  scrapeAndIngest,
  findSimilarOwnCreatives,
};

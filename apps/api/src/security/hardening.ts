/**
 * AdNexus AI — Security Hardening Middleware
 * Production-grade security configuration including Helmet, CORS,
 * brute-force protection, SQL injection detection, and API versioning.
 */

import { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors, { CorsOptions } from "cors";
import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import slowDown from "express-slow-down";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";
import { getModuleLogger } from "../lib/logger";

const logger = getModuleLogger("security-hardening");

// ── Constants ──────────────────────────────────────────────

const MAX_REQUEST_BODY_SIZE = "10mb";
const API_VERSION_CURRENT = "v1";
const API_VERSIONS_SUPPORTED = ["v1"];

const CORS_WHITELIST = [
  "https://app.adnexus.io",
  "https://admin.adnexus.io",
  "https://studio.adnexus.io",
  "https://adnexus.io",
  "https://www.adnexus.io",
  // Staging environments
  "https://staging.adnexus.io",
  "https://staging-app.adnexus.io",
  // Development (only in non-production)
  ...(process.env.NODE_ENV !== "production" ? ["http://localhost:3000", "http://localhost:5173"] : []),
];

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 1000; // requests per window
const RATE_LIMIT_AUTH_MAX = 20; // stricter for auth endpoints

const BRUTE_FORCE_MAX_ATTEMPTS = 5;
const BRUTE_FORCE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const BRUTE_FORCE_BLOCK_DURATION_MS = 60 * 60 * 1000; // 1 hour lockout

// ── In-memory brute force store (use Redis in production) ──

interface BruteForceEntry {
  attempts: number;
  firstAttempt: number;
  blockedUntil: number | null;
}

const bruteForceStore = new Map<string, BruteForceEntry>();

// ── SQL Injection Detection ────────────────────────────────

/**
 * Common SQL injection patterns to detect and block.
 */
const SQL_INJECTION_PATTERNS: RegExp[] = [
  // UNION-based
  /(%27)|(')|(--)|(%23)|(#)/i,
  // UNION SELECT
  /((%3D)|(=))[^\n]*((%27)|(')|(--)|(%3B)|(;))/i,
  // Common SQL keywords in suspicious contexts
  /\w*((%27)|('))((%6F)|o|(%4F))((%72)|r|(%52))/i,
  // EXEC(ute)
  /((%27)|('))union/i,
  /exec(\s|\+)+(s|x)p\w+/i,
  /UNION\s+SELECT/i,
  /INSERT\s+INTO/i,
  /DELETE\s+FROM/i,
  /DROP\s+TABLE/i,
  /ALTER\s+TABLE/i,
  /;/i,
  /--/i,
  /\/\*/i,
  /xp_cmdshell/i,
  /benchmark\s*\(/i,
  /sleep\s*\(/i,
  /waitfor\s+delay/i,
  /into\s+outfile/i,
  /load_file\s*\(/i,
];

/**
 * Fields that are checked for SQL injection attempts.
 */
const SQLI_CHECK_FIELDS = ["q", "query", "search", "filter", "sort", "email", "username"];

// ── Prototype Pollution Detection ──────────────────────────

const FORBIDDEN_KEYS = [
  "__proto__",
  "constructor",
  "prototype",
  "__defineGetter__",
  "__defineSetter__",
  "__lookupGetter__",
  "__lookupSetter__",
];

// ═══════════════════════════════════════════════════════════
// Helmet Configuration
// ═══════════════════════════════════════════════════════════

export function createHelmetMiddleware() {
  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.adnexus.io",
          "https://analytics.adnexus.io",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdn.adnexus.io",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://cdn.adnexus.io",
          "https://storage.adnexus.io",
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: [
          "'self'",
          "https://api.adnexus.io",
          "https://analytics.adnexus.io",
          "https://ws.adnexus.io",
        ],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },

    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },

    // X-Frame-Options
    frameguard: {
      action: "deny",
    },

    // X-Content-Type-Options
    xContentTypeOptions: true,

    // X-XSS-Protection (legacy browsers)
    xssFilter: true,

    // Referrer-Policy
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },

    // Permissions-Policy (formerly Feature-Policy)
    // Applied via custom middleware below

    // Cross-Origin Embedder Policy
    crossOriginEmbedderPolicy: { policy: "require-corp" },

    // Cross-Origin Opener Policy
    crossOriginOpenerPolicy: { policy: "same-origin" },

    // Cross-Origin Resource Policy
    crossOriginResourcePolicy: { policy: "cross-origin" },

    // Origin Agent Cluster
    originAgentCluster: true,

    // DNS Prefetch Control
    dnsPrefetchControl: { allow: false },

    // Hide X-Powered-By (also handled by Express)
    hidePoweredBy: true,

    // IE No Open
    ieNoOpen: true,

    // Don't Block Open Redirects (we handle this in auth middleware)
    permittedCrossDomainPolicies: false,
  });
}

// ═══════════════════════════════════════════════════════════
// CORS Configuration
// ═══════════════════════════════════════════════════════════

export function createCorsMiddleware(): ReturnType<typeof cors> {
  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (CORS_WHITELIST.includes(origin)) {
        callback(null, true);
        return;
      }

      // Log blocked origins for security monitoring
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-ID",
      "X-Correlation-ID",
      "X-API-Version",
      "X-Client-Version",
      "X-Platform",
      "Accept",
      "Origin",
      "Cache-Control",
      "If-Match",
      "If-None-Match",
    ],
    exposedHeaders: [
      "X-Request-ID",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
      "X-API-Version",
    ],
    credentials: true,
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };

  return cors(corsOptions);
}

// ═══════════════════════════════════════════════════════════
// Request Size Limit Middleware
// ═══════════════════════════════════════════════════════════

export function createBodySizeLimit() {
  return {
    json: (req: Request, res: Response, next: NextFunction) => {
      const size = parseInt(req.headers["content-length"] || "0", 10);
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (size > maxSize) {
        res.status(413).json({
          error: "Request entity too large",
          maxSize: `${MAX_REQUEST_BODY_SIZE}`,
          received: `${(size / 1024 / 1024).toFixed(2)}MB`,
        });
        return;
      }
      next();
    },
  };
}

// ═══════════════════════════════════════════════════════════
// Prototype Pollution Prevention
// ═══════════════════════════════════════════════════════════

export function prototypePollutionPrevention(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  /**
   * Recursively check an object for forbidden keys that could
   * be used for prototype pollution.
   */
  function checkObject(obj: unknown, path: string = ""): string | null {
    if (obj === null || typeof obj !== "object") {
      return null;
    }

    for (const key of Object.keys(obj as Record<string, unknown>)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (FORBIDDEN_KEYS.includes(key)) {
        return currentPath;
      }

      const value = (obj as Record<string, unknown>)[key];
      if (typeof value === "object" && value !== null) {
        const result = checkObject(value, currentPath);
        if (result) return result;
      }
    }

    return null;
  }

  const bodyViolation = req.body ? checkObject(req.body) : null;
  if (bodyViolation) {
    res.status(400).json({
      error: "Invalid request body",
      message: `Forbidden key detected at: ${bodyViolation}`,
    });
    return;
  }

  const queryViolation = checkObject(req.query);
  if (queryViolation) {
    res.status(400).json({
      error: "Invalid query parameters",
      message: `Forbidden key detected at: ${queryViolation}`,
    });
    return;
  }

  next();
}

// ═══════════════════════════════════════════════════════════
// SQL Injection Detection Middleware
// ═══════════════════════════════════════════════════════════

export function sqlInjectionDetection(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  /**
   * Check a string value against SQL injection patterns.
   */
  function detectSqlInjection(value: string): string | null {
    for (let i = 0; i < SQL_INJECTION_PATTERNS.length; i++) {
      if (SQL_INJECTION_PATTERNS[i].test(value)) {
        return SQL_INJECTION_PATTERNS[i].source;
      }
    }
    return null;
  }

  /**
   * Recursively scan an object for SQL injection attempts.
   */
  function scanObject(
    obj: unknown,
    checkFields: string[]
  ): { field: string; value: string; pattern: string } | null {
    if (obj === null || typeof obj !== "object") {
      return null;
    }

    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (typeof value === "string" && checkFields.includes(key.toLowerCase())) {
        const detected = detectSqlInjection(value);
        if (detected) {
          return { field: key, value, pattern: detected };
        }
      }

      if (typeof value === "object" && value !== null) {
        const result = scanObject(value, checkFields);
        if (result) return result;
      }
    }

    return null;
  }

  // Check query parameters
  const queryResult = scanObject(req.query, SQLI_CHECK_FIELDS);
  if (queryResult) {
    // Log the field/pattern only — the raw value is attacker-controlled and
    // may contain payloads or secrets that don't belong in permanent logs
    logger.warn(
      {
        ip: req.ip,
        path: req.path,
        field: queryResult.field,
        pattern: queryResult.pattern,
      },
      `SQL injection attempt detected in query`
    );
    res.status(403).json({
      error: "Invalid input detected",
      code: "SQL_INJECTION_DETECTED",
    });
    return;
  }

  // Check request body
  const bodyResult = scanObject(req.body, SQLI_CHECK_FIELDS);
  if (bodyResult) {
    logger.warn(
      {
        ip: req.ip,
        path: req.path,
        field: bodyResult.field,
        pattern: bodyResult.pattern,
      },
      `SQL injection attempt detected in body`
    );
    res.status(403).json({
      error: "Invalid input detected",
      code: "SQL_INJECTION_DETECTED",
    });
    return;
  }

  // Check raw URL
  const rawUrl = req.originalUrl || req.url;
  const urlMatch = SQL_INJECTION_PATTERNS.find((p) => p.test(rawUrl));
  if (urlMatch) {
    logger.warn(
      {
        ip: req.ip,
        path: req.path,
        pattern: String(urlMatch),
      },
      `SQL injection pattern in URL`
    );
    res.status(403).json({
      error: "Invalid request",
      code: "SQL_INJECTION_DETECTED",
    });
    return;
  }

  next();
}

// ═══════════════════════════════════════════════════════════
// Brute Force Protection
// ═══════════════════════════════════════════════════════════

function getClientIdentifier(req: Request): string {
  // Combine IP + route for route-specific rate limiting
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const route = req.path;
  // Normalize so case/whitespace variants of the same account share a bucket
  const username = String(req.body?.email || req.body?.username || "")
    .trim()
    .toLowerCase();
  // Include username to prevent credential stuffing across different accounts
  return `${ip}:${route}:${username}`;
}

function cleanupBruteForceStore(): void {
  const now = Date.now();
  for (const [key, entry] of bruteForceStore.entries()) {
    if (entry.blockedUntil && entry.blockedUntil < now) {
      bruteForceStore.delete(key);
    }
  }
}

// Periodic cleanup every 5 minutes
setInterval(cleanupBruteForceStore, 5 * 60 * 1000);

export function bruteForceProtection(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const id = getClientIdentifier(req);
  const now = Date.now();

  const entry = bruteForceStore.get(id);

  // Check if currently blocked
  if (entry?.blockedUntil && entry.blockedUntil > now) {
    const remainingMs = entry.blockedUntil - now;
    const remainingMin = Math.ceil(remainingMs / 60000);

    // Match the API's standard error envelope ({ success, error: { code,
    // message } }) so clients surface the lockout message instead of a
    // generic failure.
    res.setHeader("Retry-After", Math.ceil(remainingMs / 1000));
    res.status(429).json({
      success: false,
      error: {
        code: "ACCOUNT_LOCKED",
        message: `Account temporarily locked. Try again in ${remainingMin} minute(s).`,
        details: { retryAfter: Math.ceil(remainingMs / 1000) },
      },
    });
    return;
  }

  // Attach a function to record failed attempts (called by auth handler)
  (req as unknown as Record<string, unknown>).recordFailedAttempt = () => {
    const currentEntry = bruteForceStore.get(id);

    // Start a fresh window when there is no entry or the previous attempts
    // fall outside the configured window
    if (!currentEntry || now - currentEntry.firstAttempt > BRUTE_FORCE_WINDOW_MS) {
      bruteForceStore.set(id, {
        attempts: 1,
        firstAttempt: now,
        blockedUntil: null,
      });
      return;
    }

    currentEntry.attempts += 1;

    if (currentEntry.attempts >= BRUTE_FORCE_MAX_ATTEMPTS) {
      currentEntry.blockedUntil = now + BRUTE_FORCE_BLOCK_DURATION_MS;
      logger.warn(
        {
          identifier: id,
          attempts: currentEntry.attempts,
          blockedUntil: new Date(currentEntry.blockedUntil).toISOString(),
        },
        `Account locked due to brute force`
      );
    }

    bruteForceStore.set(id, currentEntry);
  };

  // Attach a function to reset on successful login
  (req as unknown as Record<string, unknown>).recordSuccessfulAttempt = () => {
    bruteForceStore.delete(id);
  };

  next();
}

/**
 * Standalone rate limiter for auth endpoints.
 */
export function createAuthRateLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_AUTH_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => req.ip || req.socket.remoteAddress || "unknown",
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: "Too many authentication attempts",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
      });
    },
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      return req.path.startsWith("/health");
    },
  });
}

/**
 * General API rate limiter.
 */
export function createApiRateLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Use API key or authenticated user ID if available
      const apiKey = req.headers["x-api-key"] as string;
      const userId = (req as unknown as Record<string, unknown>).userId as string;
      return apiKey || userId || (req.ip || req.socket.remoteAddress || "unknown");
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: "Rate limit exceeded",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
      });
    },
  });
}

/**
 * Speed limiter — gradually slow down repeated requests.
 */
export function createSpeedLimiter() {
  return slowDown({
    windowMs: RATE_LIMIT_WINDOW_MS,
    delayAfter: 100, // start delaying after 100 requests
    delayMs: (used: number) => {
      const delay = (used - 100) * 50;
      return Math.min(delay, 5000); // cap at 5 seconds
    },
    keyGenerator: (req: Request) => req.ip || req.socket.remoteAddress || "unknown",
  });
}

// ═══════════════════════════════════════════════════════════
// API Versioning Middleware
// ═══════════════════════════════════════════════════════════

export function apiVersioning(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Extract version from header or URL path
  const headerVersion = req.headers["x-api-version"] as string;
  const pathVersion = req.path.match(/^\/api\/(v\d+)\//)?.[1];

  const requestedVersion = headerVersion || pathVersion || API_VERSION_CURRENT;

  // Validate version
  if (!API_VERSIONS_SUPPORTED.includes(requestedVersion)) {
    res.status(400).json({
      error: "Unsupported API version",
      requestedVersion,
      supportedVersions: API_VERSIONS_SUPPORTED,
    });
    return;
  }

  // Attach version to request for downstream use
  (req as unknown as Record<string, unknown>).apiVersion = requestedVersion;

  // Set version header in response
  res.setHeader("X-API-Version", requestedVersion);

  // Add deprecation warning for non-current versions
  if (requestedVersion !== API_VERSION_CURRENT) {
    res.setHeader(
      "Deprecation",
      `version="${requestedVersion}"; sunsetting="2025-06-01T00:00:00Z"`
    );
  }

  next();
}

// ═══════════════════════════════════════════════════════════
// HPP (HTTP Parameter Pollution) Prevention
// ═══════════════════════════════════════════════════════════

export function createHppMiddleware() {
  return hpp({
    whitelist: [
      // Fields that are allowed to be arrays
      "platforms",
      "status",
      "campaignIds",
      "adSetIds",
      "fields",
      "include",
    ],
  });
}

// ═══════════════════════════════════════════════════════════
// NoSQL Injection Prevention (MongoDB sanitize)
// ═══════════════════════════════════════════════════════════

export function createMongoSanitizeMiddleware() {
  return mongoSanitize({
    onSanitize: ({ req, key }) => {
      logger.warn(
        {
          ip: req.ip,
          path: req.path,
        },
        `Sanitized MongoDB operator in key: ${key}`
      );
    },
  });
}

// ═══════════════════════════════════════════════════════════
// Security Headers (additional beyond Helmet)
// ═══════════════════════════════════════════════════════════

export function additionalSecurityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Remove server fingerprinting
  res.removeHeader("X-Powered-By");

  // Add custom security headers
  res.setHeader("X-AdNexus-Request-ID", req.headers["x-request-id"] || crypto.randomUUID());

  // Cache control for sensitive endpoints
  if (req.path.startsWith("/api/v1/auth") || req.path.startsWith("/api/v1/user")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }

  next();
}

// ═══════════════════════════════════════════════════════════
// Request ID & Logging
// ═══════════════════════════════════════════════════════════

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId =
    (req.headers["x-request-id"] as string) ||
    (req.headers["x-correlation-id"] as string) ||
    crypto.randomUUID();

  req.headers["x-request-id"] = requestId;
  res.setHeader("X-Request-ID", requestId);

  next();
}

// ═══════════════════════════════════════════════════════════
// Composite Security Middleware Setup
// ═══════════════════════════════════════════════════════════

/**
 * Apply all security middleware to an Express app in the correct order.
 */
export function applySecurityMiddleware(app: {
  use: (path: string | unknown, ...handlers: unknown[]) => void;
  set: (key: string, value: unknown) => void;
}): void {
  // Trust proxy if behind a load balancer
  app.set("trust proxy", 1);

  // Request ID first
  app.use(requestIdMiddleware as unknown as string);

  // Helmet security headers
  app.use(createHelmetMiddleware());

  // CORS
  app.use(createCorsMiddleware());

  // Additional security headers
  app.use(additionalSecurityHeaders as unknown as string);

  // HPP protection
  app.use(createHppMiddleware());

  // MongoDB sanitize (NoSQL injection)
  app.use(createMongoSanitizeMiddleware());

  // API versioning
  app.use("/api", apiVersioning as unknown as string);

  // Body size limit
  app.use(createBodySizeLimit().json as unknown as string);

  // Prototype pollution prevention
  app.use(prototypePollutionPrevention as unknown as string);

  // SQL injection detection
  app.use(sqlInjectionDetection as unknown as string);

  // General rate limiting
  app.use(createApiRateLimiter());

  // Speed limiting
  app.use(createSpeedLimiter());

  // Auth-specific rate limiting on auth routes
  app.use("/api/v1/auth", createAuthRateLimiter());

  // Brute force protection on login
  app.use("/api/v1/auth/login", bruteForceProtection as unknown as string);
}

// ═══════════════════════════════════════════════════════════
// Utility: Check if account is locked
// ═══════════════════════════════════════════════════════════

export function isAccountLocked(identifier: string): {
  locked: boolean;
  remainingMs?: number;
} {
  const entry = bruteForceStore.get(identifier);
  if (!entry?.blockedUntil) return { locked: false };

  const now = Date.now();
  if (entry.blockedUntil > now) {
    return { locked: true, remainingMs: entry.blockedUntil - now };
  }

  return { locked: false };
}

/**
 * Reset brute force counter for an account (on successful login).
 */
export function resetBruteForceCounter(identifier: string): void {
  bruteForceStore.delete(identifier);
}

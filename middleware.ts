import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type RateLimitRule = {
  id: string;
  matcher: RegExp;
  limit: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const RATE_LIMITS: RateLimitRule[] = [
  { id: 'otp-send', matcher: /^\/api\/otp\/send$/, limit: 5, windowMs: 10 * 60 * 1000 },
  { id: 'otp-verify', matcher: /^\/api\/otp\/verify$/, limit: 10, windowMs: 10 * 60 * 1000 },
  { id: 'contact', matcher: /^\/api\/contact$/, limit: 10, windowMs: 10 * 60 * 1000 },
  { id: 'send-emails', matcher: /^\/api\/send-emails$/, limit: 5, windowMs: 60 * 1000 },
  { id: 'send-individual-email', matcher: /^\/api\/send-individual-email$/, limit: 10, windowMs: 60 * 1000 }
];

const RATE_LIMIT_STORE = new Map<string, RateLimitEntry>();
const MAX_STORE_SIZE = 5000;

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  return request.ip ?? 'unknown';
}

function applyRateLimit(request: NextRequest, rule: RateLimitRule) {
  const now = Date.now();
  const ip = getClientIp(request);
  const key = `${rule.id}:${ip}`;
  const entry = RATE_LIMIT_STORE.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + rule.windowMs;
    RATE_LIMIT_STORE.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: rule.limit - 1, resetAt };
  }

  entry.count += 1;
  RATE_LIMIT_STORE.set(key, entry);

  const remaining = Math.max(0, rule.limit - entry.count);
  return { allowed: entry.count <= rule.limit, remaining, resetAt: entry.resetAt };
}

function cleanupStore(now: number) {
  if (RATE_LIMIT_STORE.size < MAX_STORE_SIZE) return;

  for (const [key, entry] of RATE_LIMIT_STORE.entries()) {
    if (now > entry.resetAt) {
      RATE_LIMIT_STORE.delete(key);
    }
  }
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const rule = RATE_LIMITS.find((candidate) => candidate.matcher.test(pathname));
  if (!rule) {
    return NextResponse.next();
  }

  const now = Date.now();
  cleanupStore(now);

  const result = applyRateLimit(request, rule);
  const headers = {
    'X-RateLimit-Limit': rule.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toString()
  };

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - now) / 1000);
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          ...headers,
          'Retry-After': retryAfter.toString()
        }
      }
    );
  }

  const response = NextResponse.next();
  Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}

export const config = {
  matcher: [
    '/api/otp/send',
    '/api/otp/verify',
    '/api/contact',
    '/api/send-emails',
    '/api/send-individual-email'
  ]
};

import { NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Valid email required').max(200),
  company: z.string().max(200).optional(),
  message: z.string().min(10, 'Please include at least 10 characters').max(4000),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { name, email, company, message } = parsed.data;

  // Redacted identifier for observability — avoids writing PII (full name,
  // email, message body) into log aggregators where it would be hard to purge.
  const redactedEmail = email.replace(/^(.).*(@.*)$/, '$1***$2');
  const submissionRef = { emailHint: redactedEmail, messageLength: message.length };

  const apiUrl = process.env.ADNEXUS_API_URL;

  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}/api/v1/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company, message }),
      });
      if (!res.ok) {
        // Surface the delivery failure (without PII) so it is never silent.
        console.error('[contact] upstream rejected', { ...submissionRef, status: res.status });
        return NextResponse.json({ ok: true }, { status: 202 });
      }
      return NextResponse.json({ ok: true }, { status: 201 });
    } catch (err) {
      console.error('[contact] upstream unreachable', { ...submissionRef, err: String(err) });
      return NextResponse.json({ ok: true }, { status: 202 });
    }
  }

  // No upstream configured: there is no delivery channel, so do not claim
  // success. Signal the client to show the direct-email fallback instead of
  // silently dropping the submission. (Logs stay redacted to avoid storing PII.)
  console.warn('[contact] no upstream configured — prompting direct email', submissionRef);
  return NextResponse.json(
    { ok: false, delivered: false, fallbackEmail: 'hello@adnexus.ai' },
    { status: 503 },
  );
}

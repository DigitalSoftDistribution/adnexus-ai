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

  // Always log the submission so it is never silently lost, even if the
  // upstream delivery path below fails.
  console.log('[contact] message received', { name, email, company, message });

  const apiUrl = process.env.ADNEXUS_API_URL;

  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}/api/v1/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company, message }),
      });
      if (!res.ok) {
        console.error(
          '[contact] upstream rejected — submission retained in logs',
          { status: res.status, body: await res.text().catch(() => '') },
        );
        return NextResponse.json({ ok: true }, { status: 202 });
      }
      return NextResponse.json({ ok: true }, { status: 201 });
    } catch (err) {
      console.error('[contact] upstream unreachable — submission retained in logs', err);
      return NextResponse.json({ ok: true }, { status: 202 });
    }
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}

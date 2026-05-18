import { NextRequest, NextResponse } from 'next/server';
import { verifyGitHubSecret } from '@/lib/config';
import { routeWebhook, deliverToChannel } from '@/lib/routing-engine';
import type { WebhookPayload } from '@/lib/teams-formatter';

export async function POST(req: NextRequest) {
  try {
    // 1. Get the raw body for signature verification
    const rawBody = await req.text();

    // 2. Verify signature if a secret is configured
    const signature = req.headers.get('x-hub-signature-256');
    if (signature && !verifyGitHubSecret(signature, rawBody)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 3. Parse the payload
    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // 4. Get the GitHub event type from header
    const eventType = req.headers.get('x-github-event') || 'unknown';
    if (eventType === 'ping') {
      return NextResponse.json({ message: 'Pong! Webhook is working.' }, { status: 200 });
    }

    // 5. Validate repository info
    if (!payload.repository || !payload.repository.full_name) {
      return NextResponse.json({ error: 'Missing repository information in payload' }, { status: 400 });
    }

    const repoName = payload.repository.full_name;
    const action = payload.action;
    const eventKey = action ? `${eventType}.${action}` : eventType;

    console.log(`[Webhook] Received ${eventKey} for ${repoName}`);

    // 6. Route through the engine — find all matching rules & format messages
    const routeResults = routeWebhook(eventType, payload);

    if (routeResults.length === 0) {
      console.log(`[Webhook] No matching rules for ${repoName} / ${eventKey}`);
      return NextResponse.json(
        { message: 'No matching routing rules', repo: repoName, event: eventKey },
        { status: 200 }
      );
    }

    // 7. Fan out — deliver to all matched channels in parallel
    const deliveryResults = await Promise.all(
      routeResults.map((r) => deliverToChannel(r.rule, r.formattedPayload))
    );

    const successes = deliveryResults.filter((d) => d.success).length;
    const failures = deliveryResults.filter((d) => !d.success).length;

    console.log(`[Webhook] Delivered ${eventKey} for ${repoName}: ${successes} success, ${failures} failed`);

    return NextResponse.json({
      success: failures === 0,
      message: `Routed to ${routeResults.length} channel(s): ${successes} delivered, ${failures} failed`,
      deliveries: deliveryResults,
    }, { status: failures > 0 ? 207 : 200 });

  } catch (error: any) {
    console.error('[Webhook] Error handling webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

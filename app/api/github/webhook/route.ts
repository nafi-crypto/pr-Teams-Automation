import { NextRequest, NextResponse } from 'next/server';
import { getWebhookUrlForRepo, verifyGitHubSecret } from '@/lib/config';
import { formatTeamsMessage, WebhookPayload } from '@/lib/teams-formatter';

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

    // 4. Get the GitHub event type
    const event = req.headers.get('x-github-event') || 'unknown';
    if (event === 'ping') {
      return NextResponse.json({ message: 'Pong! Webhook is working.' }, { status: 200 });
    }

    // 5. Ensure we have repository information
    if (!payload.repository || !payload.repository.full_name) {
      return NextResponse.json({ error: 'Missing repository information in payload' }, { status: 400 });
    }

    const repoName = payload.repository.full_name;

    // 6. Look up the corresponding Teams Webhook URL
    const teamsWebhookUrl = getWebhookUrlForRepo(repoName);
    if (!teamsWebhookUrl) {
      console.log(`No Teams Webhook URL mapped for repository: ${repoName}`);
      return NextResponse.json({ message: 'Ignored: No mapping for this repository' }, { status: 200 });
    }

    // 7. Format the Teams message based on the event type
    const teamsMessage = formatTeamsMessage(event, payload);
    if (!teamsMessage) {
      console.log(`Event ignored or not supported: ${event} / Action: ${payload.action}`);
      return NextResponse.json({ message: 'Event ignored or not supported' }, { status: 200 });
    }

    // 8. Send the formatted message to Microsoft Teams
    const response = await fetch(teamsWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(teamsMessage),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to send message to Teams: ${response.status} ${response.statusText}`, errorText);
      return NextResponse.json({ error: 'Failed to notify Teams' }, { status: 502 });
    }

    console.log(`Successfully routed ${event} for ${repoName} to Teams.`);
    return NextResponse.json({ success: true, message: 'Notification sent' }, { status: 200 });

  } catch (error: any) {
    console.error('Error handling webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

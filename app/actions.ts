'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import {
  getRules,
  saveRules,
  addRule as addRuleToDb,
  deleteRule as deleteRuleFromDb,
  toggleRule as toggleRuleInDb,
  type RoutingRule,
} from '@/lib/config';
import { simulateRouting } from '@/lib/routing-engine';
import { auth } from '@/auth';
import { registerRepositoryWebhook } from '@/lib/github';

// ---------------------------------------------------------------------------
// Rule CRUD
// ---------------------------------------------------------------------------

export async function addRuleAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const repoName = formData.get('repoName') as string;
  const channelType = (formData.get('channelType') as string) || 'teams';
  const channelName = (formData.get('channelName') as string) || 'Unnamed Channel';
  const webhookUrl = formData.get('webhookUrl') as string;
  const eventsRaw = formData.get('events') as string; // comma-separated

  if (!repoName || !webhookUrl) throw new Error('Missing required fields');

  const events = eventsRaw
    ? eventsRaw.split(',').map((e) => e.trim()).filter(Boolean)
    : ['*'];

  addRuleToDb({
    repoName,
    channelType: channelType as 'teams' | 'slack',
    channelName,
    webhookUrl,
    events,
    enabled: true,
  });

  // Automatically register webhook on GitHub if accessToken is available
  if (session.accessToken) {
    try {
      const headersList = await headers();
      const host = headersList.get('host') || 'localhost:3000';
      const protocol = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
      const targetUrl = `${protocol}://${host}/api/github/webhook`;
      const secret = process.env.GITHUB_WEBHOOK_SECRET;

      console.log(`[Actions] Attempting to auto-register webhook for ${repoName} targeting ${targetUrl}`);
      const registration = await registerRepositoryWebhook(
        session.accessToken,
        repoName,
        targetUrl,
        secret
      );

      if (!registration.success) {
        console.warn(`[Actions] Webhook auto-registration warning: ${registration.error}`);
      }
    } catch (err: any) {
      console.error('[Actions] Failed during automated webhook registration:', err);
    }
  }

  revalidatePath('/');
}

export async function deleteRuleAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  deleteRuleFromDb(id);
  revalidatePath('/');
}

export async function toggleRuleAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  toggleRuleInDb(id);
  revalidatePath('/');
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

export async function simulateAction(formData: FormData) {
  const eventType = (formData.get('eventType') as string) || 'pull_request';
  const action = (formData.get('action') as string) || 'opened';
  const repoName = (formData.get('repoName') as string) || 'org/repo';

  const result = simulateRouting(eventType, action, repoName);
  return result;
}

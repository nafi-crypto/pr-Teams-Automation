import fs from 'fs';
import path from 'path';

// Re-export types from the client-safe module
export type { RoutingRule } from './types';
export { EVENT_CATALOG } from './types';

import type { RoutingRule } from './types';

// ---------------------------------------------------------------------------
// Types (internal)
// ---------------------------------------------------------------------------

/** Legacy format — auto-migrated on first read */
interface LegacyMapping {
  repoName: string;
  teamsWebhookUrl: string;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const DB_FILE_PATH = path.join(process.cwd(), 'mappings.json');

function initDb() {
  if (!fs.existsSync(DB_FILE_PATH)) {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify([]), 'utf-8');
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

/** Detect if a record is legacy format */
function isLegacy(record: any): record is LegacyMapping {
  return 'teamsWebhookUrl' in record && !('channelType' in record);
}

/** Migrate a legacy mapping to a RoutingRule */
function migrateLegacy(legacy: LegacyMapping): RoutingRule {
  return {
    id: generateId(),
    repoName: legacy.repoName,
    channelType: 'teams',
    channelName: 'Migrated Channel',
    webhookUrl: legacy.teamsWebhookUrl,
    events: ['*'],   // wildcard = all events
    enabled: true,
  };
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function getRules(): RoutingRule[] {
  try {
    initDb();
    const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
    const records: any[] = JSON.parse(raw);

    let needsMigration = false;
    const rules: RoutingRule[] = records.map((r) => {
      if (isLegacy(r)) {
        needsMigration = true;
        return migrateLegacy(r);
      }
      return r as RoutingRule;
    });

    if (needsMigration) {
      saveRules(rules);
    }

    return rules;
  } catch (error) {
    console.error('Failed to read mappings.json:', error);
    return [];
  }
}

export function saveRules(rules: RoutingRule[]): void {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(rules, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write mappings.json:', error);
    throw error;
  }
}

export function addRule(rule: Omit<RoutingRule, 'id'>): RoutingRule {
  const newRule: RoutingRule = { ...rule, id: generateId() };
  const rules = getRules();
  rules.push(newRule);
  saveRules(rules);
  return newRule;
}

export function updateRule(id: string, updates: Partial<Omit<RoutingRule, 'id'>>): RoutingRule | null {
  const rules = getRules();
  const idx = rules.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  rules[idx] = { ...rules[idx], ...updates };
  saveRules(rules);
  return rules[idx];
}

export function deleteRule(id: string): boolean {
  const rules = getRules();
  const filtered = rules.filter((r) => r.id !== id);
  if (filtered.length === rules.length) return false;
  saveRules(filtered);
  return true;
}

export function toggleRule(id: string): RoutingRule | null {
  const rules = getRules();
  const idx = rules.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  rules[idx].enabled = !rules[idx].enabled;
  saveRules(rules);
  return rules[idx];
}

// ---------------------------------------------------------------------------
// Routing lookup
// ---------------------------------------------------------------------------

/**
 * Find all rules that match a given repo + event key.
 *
 * Matching logic:
 *  - Rule must be enabled
 *  - Rule's repoName must match (case-insensitive)
 *  - Rule's events list must contain:
 *      • "*" (wildcard — matches everything), OR
 *      • the exact eventKey (e.g. "push"), OR
 *      • the eventKey.action combo (e.g. "pull_request.opened")
 */
export function findMatchingRules(repoName: string, eventType: string, action?: string): RoutingRule[] {
  const rules = getRules();
  const eventKeyWithAction = action ? `${eventType}.${action}` : eventType;

  return rules.filter((rule) => {
    if (!rule.enabled) return false;
    if (rule.repoName.toLowerCase() !== repoName.toLowerCase()) return false;

    // Check if any event in the rule's list matches
    return rule.events.some((ev) => {
      if (ev === '*') return true;
      if (ev === eventType) return true;
      if (ev === eventKeyWithAction) return true;
      return false;
    });
  });
}

// ---------------------------------------------------------------------------
// Webhook secret verification (unchanged)
// ---------------------------------------------------------------------------

export function verifyGitHubSecret(signature: string, payload: string): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('No GITHUB_WEBHOOK_SECRET configured. Bypassing signature verification.');
    return true;
  }

  const crypto = require('crypto');
  const expectedSignature = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (e) {
    return false;
  }
}

import type { ActivityAction } from '@/lib/activity';

/**
 * Sends non-critical client-side activity events to the server.
 */
export async function logClientAction(
  action: ActivityAction,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    const token = localStorage.getItem('n1hub_vault_token');
    if (!token) return;

    await fetch('/api/activity/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, details }),
    });
  } catch (error) {
    console.error('Failed to send client activity:', error);
  }
}

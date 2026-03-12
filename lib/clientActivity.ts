import type { ActivityAction } from '@/lib/activity';
import { getClientJsonAuthHeaders } from '@/lib/clientAuth';

/**
 * Sends non-critical client-side activity events to the server.
 */
export async function logClientAction(
  action: ActivityAction,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    await fetch('/api/activity/log', {
      method: 'POST',
      headers: getClientJsonAuthHeaders(),
      body: JSON.stringify({ action, details }),
    });
  } catch (error) {
    console.error('Failed to send client activity:', error);
  }
}

import { logClientAction } from '@/lib/clientActivity';
import type { SovereignCapsule } from '@/types/capsule';

export async function exportCapsulesToDisk(capsules: SovereignCapsule[]) {
  const dataStr = JSON.stringify(capsules, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = `n1hub_vault_export_${new Date().toISOString().split('T')[0]}.json`;
  anchor.click();
  URL.revokeObjectURL(url);

  await logClientAction('export', {
    message: 'Vault exported to local disk.',
    count: capsules.length,
  });
}

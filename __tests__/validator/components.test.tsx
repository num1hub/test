import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ValidationBadge from '@/components/validation/ValidationBadge';
import ValidationPanel from '@/components/validation/ValidationPanel';
import VaultHealthCard from '@/components/validation/VaultHealthCard';

describe('validation components', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders FAIL badge with error count', () => {
    render(<ValidationBadge valid={false} errors={2} warnings={0} />);
    expect(screen.getByText('FAIL')).toBeInTheDocument();
    expect(screen.getByText(/2 errors/i)).toBeInTheDocument();
  });

  it('renders validation panel issues', () => {
    render(
      <ValidationPanel
        result={{
          valid: false,
          errors: [{ gate: 'G07', path: '$.neuro_concentrate.summary', message: 'too short' }],
          warnings: [{ gate: 'G05', path: '$.core_payload.content_type', message: 'non-standard' }],
        }}
      />,
    );

    expect(screen.getByText('Validation Results')).toBeInTheDocument();
    expect(screen.getByText('too short')).toBeInTheDocument();
    expect(screen.getByText('non-standard')).toBeInTheDocument();
  });

  it('loads and displays vault validation health stats', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          total: 10,
          passed: 8,
          failed: 2,
          warned: 3,
          passRate: 0.8,
          trend: [
            { date: '2026-03-01', passed: 2, failed: 0, warned: 1 },
            { date: '2026-03-02', passed: 1, failed: 1, warned: 0 },
          ],
        }),
        { status: 200 },
      ),
    );

    render(<VaultHealthCard />);

    await waitFor(() => {
      expect(screen.getByText('Vault Health')).toBeInTheDocument();
      expect(screen.getByText('80% pass')).toBeInTheDocument();
    });
  });
});

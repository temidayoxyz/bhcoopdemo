import { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { can } from '../../lib/roles';
import { RotateCcw, Save } from 'lucide-react';

export function AdminSettings() {
  const { user } = useOutletContext<{ user: any }>();
  const navigate = useNavigate();
  const [resetting, setResetting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [monthlyNaira, setMonthlyNaira] = useState('20000');
  const [multiplier, setMultiplier] = useState('2');
  const canSettings = can(user?.role, 'settings:write');

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.monthlySavingsKobo) {
          setMonthlyNaira(String(d.settings.monthlySavingsKobo / 100));
        }
        if (d.settings?.loanThriftMultiplier != null) {
          setMultiplier(String(d.settings.loanThriftMultiplier));
        }
      })
      .catch(() => {});
  }, []);

  const saveSettings = async () => {
    if (!canSettings) return;
    const monthlySavingsKobo = Math.round(parseFloat(monthlyNaira) * 100);
    if (!monthlySavingsKobo || monthlySavingsKobo < 100) {
      return toast.error('Enter a valid monthly savings amount');
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlySavingsKobo,
          loanThriftMultiplier: parseFloat(multiplier) || 2,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `Settings saved. ${data.obligationsCreated || 0} new monthly obligation(s) created for members missing this period.`,
        );
      } else toast.error(data.error || 'Save failed');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (
      !confirm(
        'Restore all cooperative data to the default opening state? Every member and staff balance on this device will reset.',
      )
    )
      return;
    setResetting(true);
    try {
      const res = await fetch('/api/system/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('Default state restored. Sign in again.');
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ portal: 'ADMIN' }),
        });
        navigate('/login');
      } else toast.error(data.error || 'Reset failed');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold text-seed-950">Settings</h1>
        <p className="text-ink-600 mt-1">Cooperative rules and data management.</p>
      </header>

      <div className="bg-white rounded-[14px] border border-ink-200 p-6 space-y-4">
        <h2 className="font-semibold text-seed-950">Monthly savings obligation</h2>
        <p className="text-sm text-ink-600">
          This amount is what each active member is expected to save each calendar month. New
          obligations are created automatically for members who do not yet have one for the current
          period.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">
              Monthly savings (₦)
            </label>
            <input
              type="number"
              min="1"
              value={monthlyNaira}
              onChange={(e) => setMonthlyNaira(e.target.value)}
              disabled={!canSettings}
              className="w-full px-3 py-2 border border-ink-200 rounded-[8px] disabled:bg-ink-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">
              Loan max multiplier (× thrift)
            </label>
            <input
              type="number"
              min="1"
              step="0.1"
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
              disabled={!canSettings}
              className="w-full px-3 py-2 border border-ink-200 rounded-[8px] disabled:bg-ink-50"
            />
          </div>
        </div>
        {canSettings ? (
          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-seed-800 text-white px-4 py-2 rounded-[8px] text-sm font-medium hover:bg-seed-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        ) : (
          <p className="text-sm text-ink-500">Only Super Admin can change platform parameters.</p>
        )}
      </div>

      <div className="bg-white rounded-[14px] border border-ink-200 p-6 space-y-3">
        <h2 className="font-semibold text-seed-950">Restore default data</h2>
        <p className="text-sm text-ink-600">
          Returns all profiles, balances, loans, investments, dividends, and messages to the opening
          cooperative state. Use this before a walkthrough.
        </p>
        <button
          type="button"
          onClick={reset}
          disabled={resetting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] border border-ink-200 bg-ivory-50 hover:bg-ink-50 text-sm font-medium"
        >
          <RotateCcw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
          Restore default cooperative data
        </button>
      </div>
    </div>
  );
}

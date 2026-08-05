import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import { can } from '../../lib/roles';
import { MoneyText } from '../../components/money/MoneyText';
import { nairaToKobo } from '../../lib/money';
export function AdminInvestments() {
  const { user } = useOutletContext<{ user: any }>();
  const [data, setData] = useState<any>(null);
  const writable = can(user?.role, 'investments:write');
  const [form, setForm] = useState({ name: '', category: 'Fixed Income', principal: '', notes: '' });

  const load = () => fetch('/api/admin/investments').then((r) => r.json()).then(setData);
  useEffect(() => { load(); }, []);

  const submit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const principalKobo = nairaToKobo(parseFloat(form.principal));
    if (!form.name || principalKobo <= 0) {
      toast.error('Enter a name and amount');
      return;
    }
    const res = await fetch('/api/admin/investments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        category: form.category,
        principalKobo,
        notes: form.notes,
      }),
    });
    const d = await res.json();
    if (d.success) {
      toast.success(`Investment booked · ${d.reference}`);
      setForm({ name: '', category: 'Fixed Income', principal: '', notes: '' });
      load();
    } else toast.error(d.error || 'Failed');
  };

  if (!data) return <div>Loading…</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-seed-950">Investments</h1>
          <p className="text-ink-600 mt-1">Co-op investment portfolio and returns.</p>
        </div>
        <div className="bg-white px-4 py-3 rounded-[10px] border border-ink-200">
          <p className="text-xs text-ink-500 uppercase font-semibold">Portfolio value</p>
          <p className="text-xl font-bold"><MoneyText kobo={data.totalValueKobo} /></p>
        </div>
      </header>

      {writable && (
        <form onSubmit={submit} className="bg-white p-6 rounded-[14px] border border-ink-200 grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            placeholder="Investment name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="px-3 py-2 border border-ink-200 rounded-[8px] md:col-span-2"
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="px-3 py-2 border border-ink-200 rounded-[8px]"
          >
            <option>Fixed Income</option>
            <option>Agriculture</option>
            <option>Money Market</option>
            <option>Real Estate</option>
          </select>
          <input
            placeholder="Principal (₦)"
            value={form.principal}
            onChange={(e) => setForm({ ...form, principal: e.target.value })}
            className="px-3 py-2 border border-ink-200 rounded-[8px]"
          />
          <input
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="px-3 py-2 border border-ink-200 rounded-[8px] md:col-span-3"
          />
          <button type="submit" className="bg-seed-800 text-white rounded-[8px] font-medium hover:bg-seed-700">
            Record investment
          </button>
        </form>
      )}

      {!writable && (
        <p className="text-sm text-ink-600 bg-ink-50 border border-ink-200 rounded-[10px] px-4 py-3">
          Read-only for your role. Financial Secretary proposes investments; Super Admin final-approves money-out.
        </p>
      )}

      <div className="grid gap-4">
        {data.investments.map((inv: any) => (
          <div key={inv.id} className="bg-white p-5 rounded-[12px] border border-ink-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-seed-950">{inv.name}</h3>
              <p className="text-xs text-ink-500 mt-1">{inv.category} · {inv.status}</p>
              {inv.notes && <p className="text-sm text-ink-600 mt-2">{inv.notes}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-ink-500">Current value</p>
              <p className="text-lg font-bold"><MoneyText kobo={inv.currentValueKobo} /></p>
              <p className="text-xs text-ink-500 mt-1">Principal <MoneyText kobo={inv.principalKobo} /></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

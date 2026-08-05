import { useEffect, useState } from 'react';
import { PackageCheck, Search, PackageX, PackageOpen, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { MoneyText } from '../../components/money/MoneyText';
import { can } from '../../lib/roles';
import { useOutletContext } from 'react-router-dom';

const STATUS_STYLES: Record<string, string> = {
  PLACED: 'bg-amber-50 text-amber-800 border-amber-200',
  PACKED: 'bg-blue-50 text-blue-800 border-blue-200',
  FULFILLED: 'bg-success/10 text-success border-success/30',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

export function AdminMarketOrders() {
  const { user } = useOutletContext<{ user: any }>();
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchOrders = () => {
    fetch('/api/admin/market/orders').then((res) => res.json()).then((data) => {
      setOrders(data.orders || []);
    }).catch(() => {});
  };

  useEffect(() => { fetchOrders(); }, []);

  const filtered = orders.filter((o) => {
    const q = searchQuery.toLowerCase();
    const name = `${o.member?.firstName || ''} ${o.member?.lastName || ''}`.toLowerCase();
    const memNo = (o.member?.membershipNumber || '').toLowerCase();
    return o.reference.toLowerCase().includes(q) || name.includes(q) || memNo.includes(q);
  });

  const canWrite = can(user?.role, 'market:write');

  const transition = async (order: any, status: string) => {
    if (status === 'CANCELLED' && !window.confirm(`Cancel ${order.reference}? The member's Deposit Wallet will be refunded and stock restored.`)) return;
    setBusyId(order.id);
    try {
      const res = await fetch(`/api/admin/market/orders/${order.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Order marked ${status}`);
        fetchOrders();
      } else toast.error(data.error || 'Update failed');
    } catch {
      toast.error('Update failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <header>
        <h1 className="text-2xl font-bold text-seed-950 flex items-center gap-2">
          <PackageCheck className="w-6 h-6 text-seed-800" /> Market Orders
        </h1>
        <p className="text-ink-600 mt-1">Fulfil member purchases — pack, hand over, or cancel (cancellation refunds the Deposit Wallet and restores stock).</p>
      </header>

      <div className="bg-white rounded-[10px] border border-ink-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-ink-200 bg-ink-50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by reference or member..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-ink-200 rounded-[8px] focus:ring-2 focus:ring-seed-500 outline-none bg-white"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-ink-500">
            <PackageCheck className="w-6 h-6 mx-auto mb-2 text-ink-300" />
            No market orders yet. Orders appear here once members shop the market.
          </div>
        ) : (
          <div className="divide-y divide-ink-100">
            {filtered.map((order) => (
              <div key={order.id} className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="lg:w-56 shrink-0">
                  <div className="font-mono text-sm font-semibold text-seed-950">{order.reference}</div>
                  <div className="text-xs text-ink-500 mt-1">{new Date(order.placedAt * 1000).toLocaleString()}</div>
                  <div className="text-xs text-ink-700 mt-1">
                    {order.member?.firstName} {order.member?.lastName}
                    <span className="font-mono text-ink-400"> · {order.member?.membershipNumber}</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {(order.items || []).map((item: any) => (
                      <span key={item.id} className="text-ink-700">
                        <span className="font-mono text-ink-500">{item.quantity}×</span> {item.productName}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[order.status] || 'bg-ink-50 text-ink-600 border-ink-200'}`}>
                      {order.status}
                    </span>
                    <MoneyText kobo={order.totalKobo} className="font-bold text-seed-900 text-sm" />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {canWrite && order.status === 'PLACED' && (
                    <>
                      <button type="button" disabled={busyId === order.id} onClick={() => transition(order, 'PACKED')}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[8px] bg-seed-800 text-white hover:bg-seed-700 disabled:opacity-50">
                        <PackageOpen className="w-3.5 h-3.5" /> Pack
                      </button>
                      <button type="button" disabled={busyId === order.id} onClick={() => transition(order, 'CANCELLED')}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[8px] border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50">
                        <PackageX className="w-3.5 h-3.5" /> Cancel
                      </button>
                    </>
                  )}
                  {canWrite && order.status === 'PACKED' && (
                    <>
                      <button type="button" disabled={busyId === order.id} onClick={() => transition(order, 'FULFILLED')}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[8px] bg-success text-white hover:opacity-90 disabled:opacity-50">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark Fulfilled
                      </button>
                      <button type="button" disabled={busyId === order.id} onClick={() => transition(order, 'CANCELLED')}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[8px] border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50">
                        <PackageX className="w-3.5 h-3.5" /> Cancel
                      </button>
                    </>
                  )}
                  {['FULFILLED', 'CANCELLED'].includes(order.status) && (
                    <span className="text-[11px] text-ink-400">Final</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

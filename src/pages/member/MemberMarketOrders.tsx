import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { PackageCheck, Store } from 'lucide-react';
import { MoneyText } from '../../components/money/MoneyText';

const STATUS_STYLES: Record<string, string> = {
  PLACED: 'bg-amber-50 text-amber-800 border-amber-200',
  PACKED: 'bg-blue-50 text-blue-800 border-blue-200',
  FULFILLED: 'bg-success/10 text-success border-success/30',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

export function MemberMarketOrders() {
  const [orders, setOrders] = useState<any[]>([]);

  const fetchOrders = () => {
    fetch('/api/members/market/orders').then((res) => res.json()).then((data) => {
      setOrders(data.orders || []);
    }).catch(() => {});
  };

  useEffect(() => { fetchOrders(); }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-0">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-seed-950 flex items-center gap-2">
            <PackageCheck className="w-6 h-6 text-seed-800" /> My Market Orders
          </h1>
          <p className="text-ink-600 mt-1">Track your cooperative market purchases — from placed to collected.</p>
        </div>
        <Link
          to="/member/market"
          className="inline-flex items-center justify-center gap-2 bg-seed-800 text-white px-5 py-2.5 rounded-[10px] text-sm font-semibold hover:bg-seed-700 shadow-sm"
        >
          <Store className="w-4 h-4" /> Back to Market
        </Link>
      </header>

      {orders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-[10px] border border-ink-200">
          <div className="text-3xl mb-2">🛒</div>
          <p className="text-ink-500">No market orders yet. <Link to="/member/market" className="text-seed-800 underline font-medium">Visit the market</Link>.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-[10px] border border-ink-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-ink-200 bg-ink-50 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-mono text-sm font-semibold text-seed-950">{order.reference}</span>
                  <p className="text-xs text-ink-500 mt-0.5">{new Date(order.placedAt * 1000).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[order.status] || 'bg-ink-50 text-ink-600 border-ink-200'}`}>
                    {order.status}
                  </span>
                  <MoneyText kobo={order.totalKobo} className="font-bold text-seed-900" />
                </div>
              </div>
              <div className="divide-y divide-ink-100">
                {(order.items || []).map((item: any) => (
                  <div key={item.id} className="px-6 py-3 flex items-center justify-between text-sm">
                    <span className="text-ink-700">{item.quantity} × {item.productName}</span>
                    <span className="text-ink-500"><MoneyText kobo={item.unitPriceKobo * item.quantity} /></span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

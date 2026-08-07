import { useEffect, useState } from 'react';
import { Store, Plus, Pencil, Search, Package } from 'lucide-react';
import { toast } from 'sonner';
import { MoneyText } from '../../components/money/MoneyText';
import { parseNairaInput, koboToNaira } from '../../lib/money';
import { can } from '../../lib/roles';
import { useOutletContext } from 'react-router-dom';

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  priceKobo: number;
  stock: number;
  isActive: number;
  imageEmoji: string | null;
  soldCount?: number;
}

const EMPTY_FORM = { name: '', description: '', category: '', unit: '', price: '', stock: '', imageEmoji: '📦' };

export function AdminMarket() {
  const { user } = useOutletContext<{ user: any }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const fetchProducts = () => {
    fetch('/api/admin/market/products').then((res) => res.json()).then((data) => {
      setProducts(data.products || []);
    }).catch(() => {});
  };

  useEffect(() => { fetchProducts(); }, []);

  const filtered = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description || '',
      category: p.category,
      unit: p.unit,
      price: String(koboToNaira(p.priceKobo)),
      stock: String(p.stock),
      imageEmoji: p.imageEmoji || '📦',
    });
  };

  const save = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const priceKobo = parseNairaInput(form.price);
    if (!form.name.trim() || !form.category.trim() || !form.unit.trim() || priceKobo <= 0) {
      return toast.error('Name, category, unit and a positive price are required');
    }
    setIsSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        unit: form.unit.trim(),
        priceKobo,
        stock: Math.max(0, Math.floor(Number(form.stock) || 0)),
        imageEmoji: form.imageEmoji.trim() || '📦',
      };
      const res = await fetch(editing ? `/api/admin/market/products/${editing.id}` : '/api/admin/market/products', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editing ? 'Product updated' : 'Product created');
        setForm(EMPTY_FORM);
        setEditing(null);
        fetchProducts();
      } else toast.error(data.error || 'Save failed');
    } catch {
      toast.error('Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (p: Product) => {
    const res = await fetch(`/api/admin/market/products/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: p.isActive ? 0 : 1 }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(p.isActive ? 'Product hidden from members' : 'Product live in the market');
      fetchProducts();
    } else toast.error(data.error || 'Update failed');
  };

  const canWrite = can(user?.role, 'market:write');

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-seed-950 flex items-center gap-2">
            <Store className="w-6 h-6 text-seed-800" /> Market Catalog
          </h1>
          <p className="text-ink-600 mt-1">Products members can purchase with their Deposit Wallet. Manage pricing, stock and visibility.</p>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 bg-seed-800 text-white px-5 py-2.5 rounded-[10px] text-sm font-semibold hover:bg-seed-700 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        )}
      </header>

      <div className="bg-white rounded-[10px] border border-ink-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-ink-200 bg-ink-50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name or category..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-ink-200 rounded-[8px] focus:ring-2 focus:ring-seed-500 outline-none bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm divide-y divide-ink-100">
            <thead className="bg-ink-50/70 text-ink-600 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Product</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Unit</th>
                <th className="px-6 py-3.5 text-right">Price</th>
                <th className="px-6 py-3.5 text-right">Stock</th>
                <th className="px-6 py-3.5 text-right">Sold</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                {canWrite && <th className="px-6 py-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-ink-500">
                    <Package className="w-6 h-6 mx-auto mb-2 text-ink-300" />
                    No products found.
                  </td>
                </tr>
              ) : filtered.map((p) => (
                <tr key={p.id} className="hover:bg-ivory-50/80 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="text-xl w-8 text-center">{p.imageEmoji || '📦'}</span>
                      <div>
                        <div className="font-medium text-seed-950">{p.name}</div>
                        {p.description && <div className="text-xs text-ink-500 mt-0.5 max-w-[280px] truncate">{p.description}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="text-[11px] font-medium text-ink-600 bg-ink-50 border border-ink-200 px-2 py-0.5 rounded-full">{p.category}</span>
                  </td>
                  <td className="px-6 py-3.5 text-ink-600">{p.unit}</td>
                  <td className="px-6 py-3.5 text-right font-semibold text-seed-900"><MoneyText kobo={p.priceKobo} /></td>
                  <td className={`px-6 py-3.5 text-right font-mono ${p.stock <= 5 ? 'text-amber-700' : 'text-ink-700'}`}>{p.stock}</td>
                  <td className="px-6 py-3.5 text-right font-mono text-ink-500">{p.soldCount || 0}</td>
                  <td className="px-6 py-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => toggleActive(p)}
                      disabled={!canWrite}
                      title={p.isActive ? 'Click to hide from members' : 'Click to make live'}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border disabled:opacity-50 ${
                        p.isActive ? 'bg-success/10 text-success border-success/30' : 'bg-ink-100 text-ink-500 border-ink-200'
                      }`}
                    >
                      {p.isActive ? 'Live' : 'Hidden'}
                    </button>
                  </td>
                  {canWrite && (
                    <td className="px-6 py-3.5 text-right">
                      <button type="button" onClick={() => openEdit(p)} className="inline-flex items-center gap-1.5 text-xs font-medium text-seed-800 hover:bg-seed-50 px-2.5 py-1.5 rounded-[6px]" aria-label="Edit product">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(canWrite && (form.name !== '' || editing)) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-seed-950/40 p-4" onClick={() => { setForm(EMPTY_FORM); setEditing(null); }}>
          <div className="bg-white rounded-[12px] shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={save}>
              <div className="px-6 py-4 border-b border-ink-200 flex justify-between items-center">
                <h2 className="font-semibold text-seed-950">{editing ? 'Edit Product' : 'Add Product'}</h2>
                <button type="button" onClick={() => { setForm(EMPTY_FORM); setEditing(null); }} className="text-ink-400 hover:text-ink-600 text-xl leading-none">×</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-1">
                    <label className="block text-sm font-medium mb-1">Icon</label>
                    <input value={form.imageEmoji} onChange={(e) => setForm({ ...form, imageEmoji: e.target.value })} className="w-full px-2 py-2 border border-ink-200 rounded-[8px] outline-none text-center text-lg" maxLength={8} />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-sm font-medium mb-1">Product name</label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-ink-200 rounded-[8px] outline-none" placeholder="e.g. Improved Maize Seed" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-ink-200 rounded-[8px] outline-none" placeholder="Short member-facing description" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required list="market-categories" className="w-full px-3 py-2 border border-ink-200 rounded-[8px] outline-none" placeholder="e.g. Seeds" />
                    <datalist id="market-categories">
                      {['Seeds', 'Inputs', 'Animal Feed', 'Harvest', 'Equipment'].map((c) => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Unit</label>
                    <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required className="w-full px-3 py-2 border border-ink-200 rounded-[8px] outline-none" placeholder="e.g. 10kg bag" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Price (₦)</label>
                    <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required inputMode="decimal" className="w-full px-3 py-2 border border-ink-200 rounded-[8px] outline-none" placeholder="e.g. 8500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Stock</label>
                    <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="w-full px-3 py-2 border border-ink-200 rounded-[8px] outline-none" placeholder="e.g. 40" />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-ink-200 flex justify-end gap-3">
                <button type="button" onClick={() => { setForm(EMPTY_FORM); setEditing(null); }} className="px-4 py-2 rounded-[8px] text-sm font-medium text-ink-600 hover:bg-ink-50">Cancel</button>
                <button type="submit" disabled={isSaving} className="px-5 py-2 rounded-[8px] text-sm font-semibold bg-seed-800 text-white hover:bg-seed-700 disabled:opacity-50">
                  {isSaving ? 'Saving…' : editing ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

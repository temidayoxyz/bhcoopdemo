import { useOutletContext, Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ShoppingCart, Minus, Plus, Trash2, PackageCheck, Store } from 'lucide-react';
import { MoneyText } from '../../components/money/MoneyText';

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  priceKobo: number;
  stock: number;
  imageEmoji: string | null;
}

export function MemberMarket() {
  const { member, refreshMember } = useOutletContext<{ member: any; refreshMember?: () => void }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isPlacing, setIsPlacing] = useState(false);
  const [lastReference, setLastReference] = useState<string | null>(null);

  const fetchProducts = () => {
    fetch('/api/members/market/products').then((res) => res.json()).then((data) => {
      setProducts(data.products || []);
    }).catch(() => {});
  };

  useEffect(() => { fetchProducts(); }, []);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['All', ...Array.from(set)];
  }, [products]);

  const visibleProducts = useMemo(() => {
    if (category === 'All') return products;
    return products.filter((p) => p.category === category);
  }, [products, category]);

  const cartLines = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => ({ product: products.find((p) => p.id === id)!, qty }))
      .filter((l) => l.product);
  }, [cart, products]);

  const cartTotalKobo = cartLines.reduce((sum, l) => sum + l.product.priceKobo * l.qty, 0);
  const cartItemCount = cartLines.reduce((sum, l) => sum + l.qty, 0);

  const addToCart = (product: Product) => {
    const current = cart[product.id] || 0;
    if (current >= product.stock) return toast.error('No more stock available for this item');
    setCart((c) => ({ ...c, [product.id]: current + 1 }));
  };

  const setQty = (product: Product, qty: number) => {
    if (qty <= 0) {
      setCart(({ [product.id]: _, ...rest }) => rest);
      return;
    }
    if (qty > product.stock) return toast.error(`Only ${product.stock} × ${product.name} in stock`);
    setCart((c) => ({ ...c, [product.id]: qty }));
  };

  const placeOrder = async () => {
    if (cartLines.length === 0) return;
    setIsPlacing(true);
    try {
      const res = await fetch('/api/members/market/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartLines.map((l) => ({ productId: l.product.id, quantity: l.qty })),
          note: 'Market order from member portal',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Order ${data.order.reference} placed!`);
        setCart({});
        setLastReference(data.order.reference);
        fetchProducts();
        refreshMember?.();
      } else {
        toast.error(data.error || 'Could not place order');
      }
    } catch {
      toast.error('Could not place order');
    } finally {
      setIsPlacing(false);
    }
  };

  const insufficient = cartTotalKobo > (member.depositBalanceKobo || 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 md:pb-0">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-seed-950 flex items-center gap-2">
            <Store className="w-6 h-6 text-seed-800" /> Cooperative Market
          </h1>
          <p className="text-ink-600 mt-1">
            Bulk-priced inputs and pooled harvest for members · payable from your Deposit Wallet
            (<strong className="text-seed-900"><MoneyText kobo={member.depositBalanceKobo || 0} /></strong>)
          </p>
        </div>
        <Link
          to="/member/market/orders"
          className="inline-flex items-center justify-center gap-2 bg-white border border-ink-200 px-5 py-2.5 rounded-[10px] text-sm font-semibold text-seed-900 hover:bg-ink-50 shadow-xs"
        >
          <PackageCheck className="w-4 h-4" /> My Orders
        </Link>
      </header>

      {lastReference && (
        <div className="flex items-center gap-3 bg-seed-50 border border-seed-200 text-seed-900 px-4 py-3 rounded-[10px] text-sm">
          <PackageCheck className="w-5 h-5" />
          <span>
            <strong>{lastReference}</strong> confirmed — our ops team will pack it for collection.
            Track it on the <Link to="/member/market/orders" className="underline font-medium">My Orders</Link> page.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product grid */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <div className="flex gap-2 flex-wrap mb-4">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  category === c
                    ? 'bg-seed-800 text-white border-seed-800'
                    : 'bg-white text-ink-600 border-ink-200 hover:bg-ink-50'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visibleProducts.map((p) => {
              const inCart = cart[p.id] || 0;
              const outOfStock = p.stock <= 0;
              return (
                <div key={p.id} className="bg-white rounded-[10px] border border-ink-200 shadow-sm p-5 flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-3xl">{p.imageEmoji || '📦'}</div>
                    <span className="text-[11px] font-medium text-ink-500 bg-ink-50 border border-ink-200 px-2 py-0.5 rounded-full">
                      {p.category}
                    </span>
                  </div>
                  <h3 className="font-semibold text-seed-950 mt-3 leading-snug">{p.name}</h3>
                  <p className="text-xs text-ink-500 mt-1 flex-1">{p.description}</p>
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      <MoneyText kobo={p.priceKobo} className="font-bold text-seed-900" />
                      <p className="text-[11px] text-ink-500">per {p.unit}</p>
                    </div>
                    <div className="text-right text-[11px]">
                      {outOfStock ? (
                        <span className="text-ink-400 font-medium">Out of stock</span>
                      ) : (
                        <span className={p.stock <= 5 ? 'text-amber-700 font-medium' : 'text-ink-500'}>
                          {p.stock} in stock
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3">
                    {inCart > 0 ? (
                      <div className="flex items-center justify-between bg-seed-50 border border-seed-200 rounded-[8px] px-2 py-1.5">
                        <button type="button" onClick={() => setQty(p, inCart - 1)} className="p-1.5 text-seed-800 hover:bg-seed-100 rounded-[6px]" aria-label="Decrease">
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-semibold text-seed-900">{inCart} × {p.unit}</span>
                        <button type="button" onClick={() => setQty(p, inCart + 1)} disabled={outOfStock} className="p-1.5 text-seed-800 hover:bg-seed-100 rounded-[6px] disabled:opacity-40" aria-label="Increase">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addToCart(p)}
                        disabled={outOfStock}
                        className="w-full py-2 rounded-[8px] text-sm font-medium bg-seed-800 text-white hover:bg-seed-700 disabled:bg-ink-200 disabled:text-ink-500"
                      >
                        Add to cart
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {visibleProducts.length === 0 && (
            <div className="p-12 text-center text-ink-500 bg-white rounded-[10px] border border-ink-200">
              No products in this category.
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="lg:col-span-1 order-1 lg:order-2 h-fit lg:sticky lg:top-6 bg-white rounded-[10px] border border-ink-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-ink-200 bg-ink-50 font-semibold flex justify-between items-center">
            <span className="flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Your Cart</span>
            {cartItemCount > 0 && <span className="text-xs text-ink-500 font-normal">{cartItemCount} item{cartItemCount === 1 ? '' : 's'}</span>}
          </div>

          <div className="divide-y divide-ink-100">
            {cartLines.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-3xl mb-2">🛒</div>
                <p className="text-sm text-ink-500">Your cart is empty. Add items from the market.</p>
              </div>
            ) : cartLines.map((l) => (
              <div key={l.product.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-seed-950 truncate">{l.product.name}</p>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {l.qty} × <MoneyText kobo={l.product.priceKobo} /> <span className="text-ink-400">/ {l.product.unit}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <MoneyText kobo={l.product.priceKobo * l.qty} className="text-sm font-semibold" />
                  <button type="button" onClick={() => setQty(l.product, 0)} className="p-1 text-ink-400 hover:text-red-600" aria-label="Remove">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {cartLines.length > 0 && (
            <div className="p-4 border-t border-ink-200 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-ink-600">Total</span>
                <MoneyText kobo={cartTotalKobo} className="font-bold text-seed-900" />
              </div>
              <div className="flex justify-between text-xs text-ink-500">
                <span>Deposit Wallet balance</span>
                <MoneyText kobo={member.depositBalanceKobo || 0} />
              </div>
              {insufficient ? (
                <p className="text-xs text-red-600">
                  Insufficient balance. <Link to="/member/deposits" className="underline font-medium">Top up your Deposit Wallet</Link> or reduce items.
                </p>
              ) : null}
              <button
                type="button"
                onClick={placeOrder}
                disabled={isPlacing || insufficient}
                className="w-full py-2.5 bg-seed-800 text-white rounded-[8px] text-sm font-medium hover:bg-seed-700 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {isPlacing ? 'Placing order…' : (<><span>Place Order</span> · <MoneyText kobo={cartTotalKobo} className="text-white" /></>)}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useOutletContext, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MoneyText } from '../../components/money/MoneyText';
import { trialStatusLabel } from '../../lib/coop/loans';

export function MemberLoanApply() {
  const { member } = useOutletContext<{ member: any }>();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [eligibleGuarantors, setEligibleGuarantors] = useState<any[]>([]);
  const [trialStatus, setTrialStatus] = useState('TRIAL_NOT_STARTED');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [term, setTerm] = useState('');
  const [guarantor1, setGuarantor1] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/members/loans/metadata')
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products || []);
        setEligibleGuarantors(data.eligibleGuarantors || []);
        setTrialStatus(data.trialCreditStatus || 'TRIAL_NOT_STARTED');
      })
      .catch(() => {});
  }, []);

  const selectProduct = (p: any) => {
    setSelectedProduct(p);
    if (p.code === 'TRIAL' || p.fixedAmount) {
      setAmount(String(p.minAmountKobo / 100));
      setTerm(String((p.termOptions || [p.maxTermMonths])[0]));
    } else {
      setAmount('');
      setTerm(String((p.termOptions || [p.maxTermMonths])[0]));
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!selectedProduct.canApply) {
      return toast.error(selectedProduct.blockReason || 'Not eligible for this product');
    }

    const amountKobo = Math.round(parseFloat(amount) * 100);
    const guarantors = [guarantor1].filter(Boolean);
    if (guarantors.length < (selectedProduct.requiredGuarantors || 0)) {
      return toast.error(`This loan requires ${selectedProduct.requiredGuarantors} guarantor(s).`);
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/members/loans/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          amountKobo,
          termMonths: parseInt(term, 10),
          guarantors,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Loan application submitted · ${data.reference}`);
        navigate('/member/loans');
      } else {
        toast.error(data.error || 'Failed to submit');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const termOptions: number[] = selectedProduct?.termOptions || [selectedProduct?.maxTermMonths].filter(Boolean);

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20 md:pb-0">
      <header>
        <h1 className="text-2xl font-bold text-seed-950">Apply for a loan</h1>
        <p className="text-ink-600 mt-1">
          Trial Loan is the cooperative credit test. Complete it cleanly to unlock Normal (5%) and Emergency (7%) loans.
        </p>
        <p className="text-sm mt-2 text-seed-800 font-medium">
          Credit status: {trialStatusLabel(trialStatus as any)}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white rounded-[14px] p-6 border border-ink-200 shadow-sm space-y-8">
        <section>
          <h3 className="font-semibold text-seed-950 mb-4">1. Select product</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {products.map((p) => (
              <div
                key={p.id}
                onClick={() => selectProduct(p)}
                className={`p-4 border rounded-[10px] cursor-pointer transition-colors ${
                  selectedProduct?.id === p.id
                    ? 'border-seed-500 bg-seed-50 ring-1 ring-seed-500'
                    : 'border-ink-200 hover:border-seed-300'
                } ${!p.canApply ? 'opacity-70' : ''}`}
              >
                <div className="font-medium text-sm text-seed-950 mb-2">{p.name}</div>
                <div className="text-xs text-ink-600 space-y-1">
                  {p.code === 'TRIAL' ? (
                    <p>Fixed <MoneyText kobo={p.minAmountKobo} /></p>
                  ) : (
                    <p>
                      <MoneyText kobo={p.minAmountKobo} /> – <MoneyText kobo={p.maxAmountKobo} />
                    </p>
                  )}
                  <p>{(p.interestRate * 100).toFixed(0)}% interest</p>
                  <p>Terms: {(p.termOptions || [p.maxTermMonths]).join(', ')} mo</p>
                  <p>{p.requiredGuarantors} guarantor(s)</p>
                </div>
                {!p.canApply && (
                  <p className="text-[11px] text-warning mt-2">{p.blockReason}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {selectedProduct && (
          <section className="space-y-4">
            <h3 className="font-semibold text-seed-950">2. Loan details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount (₦)</label>
                <input
                  type="number"
                  required
                  disabled={selectedProduct.code === 'TRIAL'}
                  min={selectedProduct.minAmountKobo / 100}
                  max={selectedProduct.maxAmountKobo / 100}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-ink-200 rounded-[8px] focus:ring-2 focus:ring-seed-500 outline-none disabled:bg-ink-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Term (months)</label>
                <select
                  required
                  disabled={selectedProduct.code === 'TRIAL'}
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-ink-200 rounded-[8px] focus:ring-2 focus:ring-seed-500 outline-none disabled:bg-ink-50"
                >
                  {termOptions.map((t) => (
                    <option key={t} value={t}>
                      {t} month{t > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(selectedProduct.requiredGuarantors || 0) > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1">Guarantor</label>
                <select
                  required
                  value={guarantor1}
                  onChange={(e) => setGuarantor1(e.target.value)}
                  className="w-full px-3 py-2 border border-ink-200 rounded-[8px]"
                >
                  <option value="">Select member…</option>
                  {eligibleGuarantors.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.firstName} {g.lastName} ({g.membershipNumber})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <p className="text-xs text-ink-500">
              Approval chain: Financial Secretary → Admin → Super Admin. Final approval disburses the loan.
            </p>

            <button
              type="submit"
              disabled={isSubmitting || !selectedProduct.canApply}
              className="bg-seed-800 text-white px-6 py-2.5 rounded-[8px] text-sm font-medium hover:bg-seed-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting…' : 'Submit application'}
            </button>
          </section>
        )}
      </form>
    </div>
  );
}

import { Link } from 'react-router-dom';

export function LoansPage() {
  return (
    <div className="flex flex-col min-h-screen pt-16">
      <section className="bg-seed-950 text-white py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Cooperative loans</h1>
          <p className="text-xl text-seed-200">
            Three clear products: a compulsory Trial Loan for credit verification, then Normal and Emergency credit.
          </p>
        </div>
      </section>
      <section className="py-24 bg-ivory-50 flex-grow">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-[16px] border border-ink-200 shadow-sm">
            <h3 className="text-2xl font-bold text-seed-950 mb-4">Trial Loan</h3>
            <p className="text-ink-600 mb-6">
              Compulsory credit test for every member. Fixed ₦30,000, 5% interest, 3 months. Take it when you are ready and repay on time.
            </p>
            <div className="text-sm font-semibold text-seed-800 bg-seed-50 px-3 py-1.5 rounded-full inline-block">
              ₦30,000 · 5% · 3 months
            </div>
          </div>
          <div className="bg-white p-8 rounded-[16px] border border-ink-200 shadow-sm">
            <h3 className="text-2xl font-bold text-seed-950 mb-4">Normal Loan</h3>
            <p className="text-ink-600 mb-6">
              Apply after a clean Trial Loan. Flexible amount, 5% interest, terms of 1, 3, 6, or 12 months.
            </p>
            <div className="text-sm font-semibold text-seed-800 bg-seed-50 px-3 py-1.5 rounded-full inline-block">
              5% · 1–12 months
            </div>
          </div>
          <div className="bg-white p-8 rounded-[16px] border border-ink-200 shadow-sm">
            <h3 className="text-2xl font-bold text-seed-950 mb-4">Emergency Loan</h3>
            <p className="text-ink-600 mb-6">
              For urgent needs after Trial verification. Flexible amount, 7% interest, same term options.
            </p>
            <div className="text-sm font-semibold text-seed-800 bg-seed-50 px-3 py-1.5 rounded-full inline-block">
              7% · 1–12 months
            </div>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 mt-12 text-center text-ink-600 text-sm">
          All money-out loans require approval by Financial Secretary → Admin → Super Admin.
          <div className="mt-6">
            <Link to="/join" className="text-seed-800 font-semibold hover:underline">
              Become a member to apply →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SUPER_ADMIN_REFERRAL_CODE } from '../../lib/coop/constants';

export function MembershipPage() {
  return (
    <div className="flex flex-col min-h-screen pt-16">
      <section className="bg-seed-950 text-white py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Join SeedCoop</h1>
          <p className="text-xl text-seed-200">
            Free signup with a referral code. Pay a modest registration fee, complete Know Your Member (KYM),
            and join a growing thrift community.
          </p>
        </div>
      </section>
      <section className="py-24 bg-ivory-50 flex-grow">
        <div className="max-w-3xl mx-auto px-4 space-y-8 text-lg text-ink-700">
          <h2 className="text-3xl font-bold text-seed-950">How joining works</h2>
          <ol className="space-y-4 list-decimal list-inside">
            <li>Create a free account with a member referral code (or Super Admin code for demos)</li>
            <li>Pay ₦2,000 registration fee within 7 days</li>
            <li>Complete Know Your Member (identity, occupation, next of kin, residency)</li>
            <li>Board approves after background checks — you receive your own referral code</li>
            <li>Buy minimum ₦20,000 share capital and start thrift, loans, and dividends</li>
          </ol>
          <ul className="space-y-4">
            {[
              'Trial, Normal, and Emergency loans with a clear credit path',
              'Annual dividends weighted by share capital',
              'Deposit wallet for flexible funding and instant withdrawals',
              'Democratic participation in cooperative decisions',
            ].map((benefit, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-seed-600 flex-shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-ink-600 bg-white border border-ink-200 rounded-[10px] p-4">
            Demo referral (Super Admin member code): <strong className="font-mono">{SUPER_ADMIN_REFERRAL_CODE}</strong>
          </p>
          <div className="mt-12 text-center">
            <Link
              to="/join"
              className="inline-flex items-center gap-2 bg-seed-800 text-white px-8 py-4 rounded-xl font-bold hover:bg-seed-700 transition-colors"
            >
              Start free application <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

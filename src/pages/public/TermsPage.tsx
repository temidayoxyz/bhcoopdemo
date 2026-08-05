export function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen pt-16 bg-ivory-50">
      <div className="max-w-3xl mx-auto px-4 py-24 w-full flex-grow">
        <h1 className="text-4xl font-bold text-seed-950 mb-8">Terms of Service</h1>
        <div className="max-w-none text-ink-700 space-y-6">
          <p className="text-sm text-ink-500">Last updated: October 2023</p>
          <h2 className="text-2xl font-bold text-seed-950 mt-8 mb-4">1. Acceptance of Terms</h2>
          <p className="leading-relaxed">By accessing and using the SeedCoop platform, you accept and agree to be bound by the terms and provision of this agreement.</p>
          <h2 className="text-2xl font-bold text-seed-950 mt-8 mb-4">2. Member Responsibilities</h2>
          <p className="leading-relaxed">Members are expected to provide accurate information and maintain the confidentiality of their account credentials. You are responsible for all activities that occur under your account.</p>
          <h2 className="text-2xl font-bold text-seed-950 mt-8 mb-4">3. Financial Transactions</h2>
          <p className="leading-relaxed">All contributions and loan repayments are subject to the cooperative bylaws. Processing times may vary depending on the payment method used.</p>
        </div>
      </div>
    </div>
  );
}

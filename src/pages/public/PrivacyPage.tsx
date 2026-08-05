export function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen pt-16 bg-ivory-50">
      <div className="max-w-3xl mx-auto px-4 py-24 w-full flex-grow">
        <h1 className="text-4xl font-bold text-seed-950 mb-8">Privacy Policy</h1>
        <div className="max-w-none text-ink-700 space-y-6">
          <p className="text-sm text-ink-500">Last updated: October 2023</p>
          <h2 className="text-2xl font-bold text-seed-950 mt-8 mb-4">1. Information Collection</h2>
          <p className="leading-relaxed">We collect information that you provide directly to us, including your name, email address, phone number, and financial information necessary for cooperative operations.</p>
          <h2 className="text-2xl font-bold text-seed-950 mt-8 mb-4">2. Use of Information</h2>
          <p className="leading-relaxed">We use the information we collect to operate, maintain, and improve our services, process transactions, and communicate with you about your account.</p>
          <h2 className="text-2xl font-bold text-seed-950 mt-8 mb-4">3. Data Security</h2>
          <p className="leading-relaxed">We implement appropriate technical and organizational measures to protect your personal data against unauthorized or unlawful processing and against accidental loss, destruction, or damage.</p>
        </div>
      </div>
    </div>
  );
}

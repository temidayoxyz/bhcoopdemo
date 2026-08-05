export function BylawsPage() {
  return (
    <div className="flex flex-col min-h-screen pt-16 bg-ivory-50">
      <div className="max-w-3xl mx-auto px-4 py-24 w-full flex-grow">
        <h1 className="text-4xl font-bold text-seed-950 mb-8">Cooperative Bylaws</h1>
        <div className="max-w-none text-ink-700 space-y-6">
          <p className="text-sm text-ink-500">Adopted: January 2015</p>
          <h2 className="text-2xl font-bold text-seed-950 mt-8 mb-4">Article I: Name and Purpose</h2>
          <p className="leading-relaxed">The name of this cooperative shall be Blessed Hands. Its purpose is to promote the economic welfare of its members by providing a secure means to save and access credit at reasonable rates.</p>
          <h2 className="text-2xl font-bold text-seed-950 mt-8 mb-4">Article II: Membership</h2>
          <p className="leading-relaxed">Membership is open to individuals who share the common bond of the cooperative. Admission to membership is subject to approval by the Board of Directors.</p>
          <h2 className="text-2xl font-bold text-seed-950 mt-8 mb-4">Article III: Capital and Liability</h2>
          <p className="leading-relaxed">The capital of the cooperative shall be raised by means of shares and savings deposits from members. The liability of a member for the debts of the cooperative shall be limited to the member's share capital.</p>
        </div>
      </div>
    </div>
  );
}

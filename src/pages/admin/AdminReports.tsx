import { FileBarChart, Download } from 'lucide-react';

export function AdminReports() {
  return (
    <div className="flex-1 overflow-y-auto bg-ivory-50">
      <header className="bg-white border-b border-ink-200 px-8 py-6 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-seed-950">Reports</h1>
          <p className="text-ink-600 mt-1">Generate financial and operational reports.</p>
        </div>
      </header>
      <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {['Monthly Financials', 'Loan Portfolio Health', 'Membership Growth', 'Dividend Projections'].map((report, i) => (
          <div key={i} className="bg-white p-6 rounded-[14px] border border-ink-200 shadow-sm flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-[8px] bg-seed-50 flex items-center justify-center text-seed-700 flex-shrink-0">
                <FileBarChart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-seed-950">{report}</h3>
                <p className="text-sm text-ink-500 mt-1">PDF • System Generated</p>
              </div>
            </div>
            <button className="p-2 text-ink-400 hover:text-seed-700 hover:bg-seed-50 rounded-lg transition-colors">
              <Download className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Mail, Search, RefreshCw, Calendar, FileText } from 'lucide-react';
import { toast } from 'sonner';

export function AdminOutbox() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOutbox = () => {
    setLoading(true);
    fetch('/api/admin/outbox')
      .then(res => res.json())
      .then(data => {
        setMessages(data.messages || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOutbox();
  }, []);

  const filteredMessages = messages.filter(m => {
    const q = searchQuery.toLowerCase();
    const recipient = (m.recipient || '').toLowerCase();
    const subject = (m.subject || '').toLowerCase();
    const template = (m.template || '').toLowerCase();
    return recipient.includes(q) || subject.includes(q) || template.includes(q);
  });

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-seed-950 flex items-center gap-2">
            <Mail className="w-6 h-6 text-seed-800" /> Outbox & System Messages
          </h1>
          <p className="text-ink-600 mt-1">Audit trail of outbound email notifications and member alerts.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2.5 rounded-[10px] border border-ink-200 text-xs font-semibold text-seed-900 shadow-xs">
            Total Sent Messages: <span className="font-bold text-seed-950 text-base font-mono">{messages.length}</span>
          </div>
          <button 
            onClick={fetchOutbox} 
            className="p-2.5 bg-white border border-ink-200 rounded-[10px] text-ink-700 hover:text-seed-950 hover:bg-ink-50 transition-colors shadow-xs"
            title="Refresh outbox"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="bg-white rounded-[14px] border border-ink-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
        <div className="p-4 border-b border-ink-200 bg-ink-50 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by recipient email, subject, or template..." 
              className="w-full pl-9 pr-4 py-2 text-sm border border-ink-200 rounded-[8px] focus:ring-2 focus:ring-seed-500 outline-none bg-white" 
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-ink-500">Loading outbox records...</div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm divide-y divide-ink-100">
              <thead className="bg-ink-50/70 text-ink-600 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Recipient</th>
                  <th className="px-6 py-3.5">Subject & Template</th>
                  <th className="px-6 py-3.5">Payload Details</th>
                  <th className="px-6 py-3.5 text-right">Sent Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 bg-white">
                {filteredMessages.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-ink-500">
                      No outbox messages found.
                    </td>
                  </tr>
                ) : (
                  filteredMessages.map(msg => {
                    let parsedPayload: any = {};
                    try {
                      parsedPayload = JSON.parse(msg.payload || '{}');
                    } catch (e) {}

                    return (
                      <tr key={msg.id} className="hover:bg-ivory-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-seed-950">{msg.recipient}</div>
                          <span className="text-[11px] font-mono text-ink-500">Delivered</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-seed-900">{msg.subject}</div>
                          <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-seed-50 text-seed-800 border border-seed-200">
                            {msg.template}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-ink-700 max-w-md">{msg.body || '—'}</p>
                          {Object.keys(parsedPayload).length > 0 && (
                            <div className="mt-2 bg-ivory-50 p-2 rounded-[6px] border border-ink-100 text-xs text-ink-600">
                              {parsedPayload.reference && <span>Ref: {parsedPayload.reference} </span>}
                              {parsedPayload.membershipNumber && <span>· {parsedPayload.membershipNumber} </span>}
                              {parsedPayload.amountKobo != null && <span>· ₦{(parsedPayload.amountKobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-xs text-ink-600 font-mono whitespace-nowrap">
                          {new Date(msg.sentAt * 1000).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

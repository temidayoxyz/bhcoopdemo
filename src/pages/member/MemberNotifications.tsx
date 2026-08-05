import { useEffect, useState } from 'react';
import { Bell, Mail, Megaphone, Calendar } from 'lucide-react';
import { formatNaira } from '../../lib/money';

export function MemberNotifications() {
  const [data, setData] = useState<{ announcements: any[]; emails: any[] }>({ announcements: [], emails: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ANNOUNCEMENTS' | 'ALERTS'>('ALL');

  useEffect(() => {
    fetch('/api/members/notifications')
      .then((res) => res.json())
      .then((d) => setData({ announcements: d.announcements || [], emails: d.emails || [] }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-0">
      <header>
        <h1 className="text-2xl font-bold text-seed-950">Notifications</h1>
        <p className="text-ink-600 mt-1">Cooperative announcements and messages for your account.</p>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-ink-200 pb-2">
        {([
          ['ALL', 'All'],
          ['ANNOUNCEMENTS', `Announcements (${data.announcements.length})`],
          ['ALERTS', `Messages (${data.emails.length})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-[8px] text-sm font-medium ${
              activeTab === key ? 'bg-seed-800 text-white' : 'text-ink-600 hover:bg-ink-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center text-ink-500 bg-white rounded-[14px] border border-ink-200">Loading…</div>
      ) : (
        <div className="space-y-4">
          {(activeTab === 'ALL' || activeTab === 'ANNOUNCEMENTS') &&
            data.announcements.map((ann) => (
              <div key={ann.id} className="bg-white p-5 rounded-[12px] border border-ink-200 space-y-2">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-seed-600" />
                    <h4 className="font-bold text-seed-950">{ann.title}</h4>
                  </div>
                  <span className="text-xs text-ink-500 flex items-center gap-1 shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(ann.publishedAt * 1000).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-ink-700 leading-relaxed">{ann.content}</p>
              </div>
            ))}

          {(activeTab === 'ALL' || activeTab === 'ALERTS') &&
            data.emails.map((email) => {
              let payload: any = {};
              try {
                payload = JSON.parse(email.payload || '{}');
              } catch { /* ignore */ }
              return (
                <div key={email.id} className="bg-white p-5 rounded-[12px] border border-ink-200 space-y-2">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-seed-600" />
                      <h4 className="font-semibold text-seed-950 text-sm">{email.subject}</h4>
                    </div>
                    <span className="text-xs text-ink-500 font-mono shrink-0">
                      {new Date(email.sentAt * 1000).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-ink-700">{email.body || 'Notification for your account.'}</p>
                  {(payload.amountKobo || payload.reference || payload.membershipNumber) && (
                    <div className="text-xs text-ink-600 bg-ivory-50 p-2.5 rounded-[6px] border border-ink-100">
                      {payload.membershipNumber && <span>ID: {payload.membershipNumber} </span>}
                      {payload.reference && <span>· Ref: {payload.reference} </span>}
                      {payload.amountKobo != null && <span>· {formatNaira(payload.amountKobo)}</span>}
                    </div>
                  )}
                </div>
              );
            })}

          {data.announcements.length === 0 && data.emails.length === 0 && (
            <div className="bg-white rounded-[14px] border border-ink-200 p-16 text-center text-ink-500">
              <Bell className="w-12 h-12 mx-auto mb-3 text-ink-300" />
              <p>No notifications yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

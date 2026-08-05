import { X, Printer } from 'lucide-react';
import { formatNaira } from '../../lib/money';
import { CopyableRef } from './CopyableRef';

export type ReceiptData = {
  title: string;
  reference: string;
  amountKobo: number;
  memberName?: string;
  membershipNumber?: string;
  description?: string;
  date?: number;
  typeLabel?: string;
};

export function ReceiptModal({
  receipt,
  onClose,
}: {
  receipt: ReceiptData | null;
  onClose: () => void;
}) {
  if (!receipt) return null;
  const when = new Date((receipt.date || Math.floor(Date.now() / 1000)) * 1000);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-seed-950/50 backdrop-blur-sm">
      <div className="bg-white rounded-[16px] border border-ink-200 shadow-xl max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-ink-100 flex items-center justify-between bg-seed-50">
          <h3 className="font-bold text-seed-950">{receipt.title}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4" id="receipt-print">
          <div className="text-center pb-4 border-b border-dashed border-ink-200">
            <div className="text-xs font-semibold uppercase tracking-widest text-seed-700 mb-1">Blessed Hands</div>
            <div className="text-2xl font-bold tabular-nums text-seed-950">{formatNaira(receipt.amountKobo)}</div>
            {receipt.typeLabel && (
              <div className="text-sm text-ink-600 mt-1">{receipt.typeLabel}</div>
            )}
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500">Reference</dt>
              <dd><CopyableRef value={receipt.reference} /></dd>
            </div>
            {receipt.memberName && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500">Member</dt>
                <dd className="font-medium text-seed-950 text-right">{receipt.memberName}</dd>
              </div>
            )}
            {receipt.membershipNumber && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500">Membership No.</dt>
                <dd className="font-mono text-seed-950">{receipt.membershipNumber}</dd>
              </div>
            )}
            {receipt.description && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500">Description</dt>
                <dd className="text-right text-seed-950 max-w-[60%]">{receipt.description}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500">Date</dt>
              <dd className="font-mono text-seed-950">{when.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-500">Status</dt>
              <dd className="text-success font-medium">Completed</dd>
            </div>
          </dl>
        </div>
        <div className="px-6 py-4 border-t border-ink-100 flex gap-3 justify-end bg-ivory-50">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] border border-ink-200 bg-white text-sm font-medium hover:bg-ink-50"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[8px] bg-seed-800 text-white text-sm font-medium hover:bg-seed-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

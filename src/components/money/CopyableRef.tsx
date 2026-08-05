import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

export function CopyableRef({ value, className = '' }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async (e: { preventDefault: () => void; stopPropagation: () => void }) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Reference copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy reference"
      className={`inline-flex items-center gap-1.5 font-mono text-xs text-ink-600 hover:text-seed-800 transition-colors ${className}`}
    >
      <span>{value}</span>
      {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

import { formatNaira } from '../../lib/money';

export function MoneyText({
  kobo,
  className = '',
  signed = false,
}: {
  kobo: number;
  className?: string;
  signed?: boolean;
}) {
  return (
    <span className={`tabular-nums ${className}`}>
      {formatNaira(kobo, { signed })}
    </span>
  );
}

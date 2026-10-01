import { useEffect, useState } from 'react';
import Alert from '../common/Alert';

/**
 * @param {object} props
 * @param {string|Date|number} props.lockedUntil ISO date, Date, or minutes remaining
 */
const LockoutBanner = ({ lockedUntil }) => {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    const resolveTarget = () => {
      if (typeof lockedUntil === 'number') {
        return Date.now() + lockedUntil * 60 * 1000;
      }
      if (lockedUntil instanceof Date) {
        return lockedUntil.getTime();
      }
      const parsed = Date.parse(lockedUntil);
      return Number.isNaN(parsed) ? Date.now() : parsed;
    };

    const target = resolveTarget();

    const tick = () => {
      setRemainingMs(Math.max(0, target - Date.now()));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <Alert variant="error" className="text-center">
      <p className="font-semibold">Account temporarily locked</p>
      <p className="mt-1">
        Too many failed attempts. Try again in{' '}
        <span className="font-mono tabular-nums">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
        {minutes > 0 && ` (${minutes} min remaining)`}
      </p>
    </Alert>
  );
};

export default LockoutBanner;

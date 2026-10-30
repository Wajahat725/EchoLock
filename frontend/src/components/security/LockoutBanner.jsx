import { useEffect, useState } from 'react';
import Alert from '../common/Alert';

const LockoutBanner = ({ lockedUntil }) => {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    const target = typeof lockedUntil === 'number'
      ? Date.now() + lockedUntil * 60000
      : (Date.parse(lockedUntil) || Date.now());

    const tick = () => setRemainingMs(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <Alert variant="error" className="text-center">
      <p className="font-bold">Account temporarily locked</p>
      <p className="mt-1 font-normal">
        Too many failed attempts. Try again in{' '}
        <span className="font-mono font-bold tabular-nums">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
        {minutes > 0 && ` (${minutes} min remaining)`}
      </p>
    </Alert>
  );
};

export default LockoutBanner;


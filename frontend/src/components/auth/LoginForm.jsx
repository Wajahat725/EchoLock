import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../common/Button';
import Input from '../common/Input';
import Alert from '../common/Alert';
import Loader from '../common/Loader';
import Grid from '../grid/Grid';
import SelectedPositions from '../grid/SelectedPositions';
import LockoutBanner from '../security/LockoutBanner';
import { useGrid } from '../../hooks/useGrid';
import { useAuth } from '../../hooks/useAuth';
import { startLogin, verifyLogin } from '../../services/authService';
import { ROUTES } from '../../utils/constants';
import { validateUsername } from '../../utils/validators';

const GridSkeleton = () => (
  <div className="mx-auto grid max-w-md grid-cols-5 gap-2 sm:gap-3">
    {Array.from({ length: 25 }).map((_, i) => (
      <div key={i} className="aspect-square animate-pulse rounded-xl bg-slate-200" />
    ))}
  </div>
);

const LoginForm = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [grid, setGrid] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [loadingStart, setLoadingStart] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [sessionPassword, setSessionPassword] = useState('');
  const [gridKey, setGridKey] = useState(0);

  const { selections, handleCellClick, resetSelections, isComplete } = useGrid();

  useEffect(() => {
    resetSelections();
  }, [gridKey, resetSelections]);

  const verifySession = useCallback(async (positions) => {
    setLoadingVerify(true);
    setStatusMessage(null);
    try {
      const { data } = await verifyLogin({ username: username.trim(), session_id: sessionId, positions });
      if (data.locked || data.status === 'locked') {
        setLockedUntil(data.locked_until || data.lockout_until);
        setStatusMessage({ variant: 'error', text: 'Account locked due to failed attempts.' });
        toast.error('Account locked');
        return;
      }
      if (data.success || data.status === 'success') {
        const password = data.session_password || positions.map((p) => `${p.row},${p.col}`).join('|');
        setSessionPassword(password);
        login({ username: username.trim(), sessionPassword: password });
        setStatusMessage({ variant: 'success', text: 'Authentication successful.' });
        toast.success('Welcome back!');
        setTimeout(() => navigate(ROUTES.DASHBOARD), 1500);
        return;
      }
      setStatusMessage({ variant: 'error', text: data.message || 'Authentication failed.' });
      toast.error('Invalid selection — try again');
      setGridKey((k) => k + 1);
    } catch (err) {
      const msg = err.message || 'Verification failed';
      if (msg.toLowerCase().includes('lock')) {
        setLockedUntil(new Date(Date.now() + 15 * 60 * 1000).toISOString());
      }
      setStatusMessage({ variant: 'error', text: msg });
      toast.error(msg);
      setGridKey((k) => k + 1);
    } finally {
      setLoadingVerify(false);
    }
  }, [sessionId, username, login, navigate]);

  useEffect(() => {
    if (!isComplete || loadingVerify || sessionPassword) return;
    verifySession(selections.map(({ row, col }) => ({ row, col })));
  }, [isComplete, selections, loadingVerify, sessionPassword, verifySession]);

  const handleStartLogin = async (e) => {
    e.preventDefault();
    const err = validateUsername(username);
    setUsernameError(err);
    if (err) return;

    setLoadingStart(true);
    setStatusMessage(null);
    setLockedUntil(null);
    try {
      const { data } = await startLogin(username);
      setGrid(data.grid);
      setSessionId(data.session_id);
      setStep(2);
      setGridKey((k) => k + 1);
      toast.success('Grid loaded — select your secret pattern');
    } catch (err) {
      const msg = err.message || 'Could not start login session';
      toast.error(msg);
      setStatusMessage({ variant: 'error', text: msg });
    } finally {
      setLoadingStart(false);
    }
  };

  const copySessionPassword = async () => {
    try {
      await navigator.clipboard.writeText(sessionPassword);
      toast.success('Session password copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  if (lockedUntil) {
    return (
      <div className="space-y-4">
        <LockoutBanner lockedUntil={lockedUntil} />
        <Button variant="secondary" className="w-full" onClick={() => setLockedUntil(null)}>
          Back
        </Button>
      </div>
    );
  }

  if (step === 1) {
    return (
      <form onSubmit={handleStartLogin} className="space-y-4">
        {statusMessage && <Alert variant={statusMessage.variant}>{statusMessage.text}</Alert>}
        <Input
          label="Username"
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your username"
          error={usernameError}
        />
        <Button type="submit" className="w-full" loading={loadingStart}>
          Continue to grid
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      {statusMessage && <Alert variant={statusMessage.variant}>{statusMessage.text}</Alert>}

      {sessionPassword && (
        <Alert variant="success">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              One-time session password:{' '}
              <code className="rounded-md bg-white border border-emerald-300 px-2.5 py-1 text-emerald-800 font-mono font-bold">{sessionPassword}</code>
            </span>
            <Button size="sm" variant="secondary" onClick={copySessionPassword}>
              Copy
            </Button>
          </div>
        </Alert>
      )}

      <p className="text-center text-sm text-slate-600">
        Signed in as <span className="font-semibold text-indigo-600">{username}</span>
      </p>

      {loadingStart ? (
        <Loader label="Loading grid..." />
      ) : grid ? (
        <Grid
          key={gridKey}
          grid={grid}
          selections={selections}
          onCellClick={(r, c) => !loadingVerify && !isComplete && !sessionPassword && handleCellClick(r, c, grid)}
          disabled={loadingVerify || !!sessionPassword}
        />
      ) : (
        <GridSkeleton />
      )}

      <SelectedPositions selections={selections} />
      {loadingVerify && <Loader size="sm" label="Verifying..." />}

      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => { setStep(1); setGrid(null); resetSelections(); setStatusMessage(null); }}
          disabled={loadingVerify}
        >
          Change user
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => setGridKey((k) => k + 1)}
          disabled={loadingVerify || !!sessionPassword}
        >
          Reset selection
        </Button>
      </div>
    </div>
  );
};

export default LoginForm;


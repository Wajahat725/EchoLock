import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Card from '../components/common/Card';
import Loader from '../components/common/Loader';
import LeakageReport from '../components/security/LeakageReport';
import { useAuth } from '../hooks/useAuth';
import { getLeakageReport, getLoginHistory } from '../services/sessionService';
import { ROUTES } from '../utils/constants';

const DashboardPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [history, setHistory] = useState([]);
  const [leakage, setLeakage] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingLeakage, setLoadingLeakage] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [leakageError, setLeakageError] = useState('');

  useEffect(() => {
    if (!user?.username) return;

    const load = async () => {
      setLoadingHistory(true);
      setHistoryError('');
      try {
        const { data } = await getLoginHistory(user.username);
        setHistory(Array.isArray(data) ? data : data?.history ?? []);
      } catch (err) {
        setHistoryError(err.message);
        setHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };

    load();
  }, [user?.username]);

  useEffect(() => {
    if (!user?.username) return;

    const load = async () => {
      setLoadingLeakage(true);
      setLeakageError('');
      try {
        const { data } = await getLeakageReport(user.username);
        setLeakage(data);
      } catch (err) {
        setLeakageError(err.message);
        setLeakage(null);
      } finally {
        setLoadingLeakage(false);
      }
    };

    load();
  }, [user?.username]);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return (
    <div className="mx-auto max-w-4xl flex-1 px-4 py-12 sm:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
        <p className="mt-1 text-gray-400">
          Welcome, <span className="text-cyan-accent">{user.username}</span>
        </p>
        {user.sessionPassword && (
          <p className="mt-2 text-sm text-gray-500">
            Latest session key:{' '}
            <code className="rounded bg-navy-light px-2 py-0.5 text-success">
              {user.sessionPassword}
            </code>
          </p>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Login history" subtitle="Recent authentication events">
          {loadingHistory ? (
            <Loader size="sm" label="Loading history..." />
          ) : historyError ? (
            <p className="text-sm text-gray-500">
              History unavailable ({historyError}). Connect the backend dashboard endpoints.
            </p>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-500">No login events recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500">
                    <th className="pb-2 pr-4 font-medium">Time</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row, i) => (
                    <tr key={row.id ?? i} className="border-b border-gray-800/50">
                      <td className="py-2 pr-4 text-gray-300">
                        {row.timestamp || row.created_at || '—'}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={
                            row.success || row.status === 'success'
                              ? 'text-success'
                              : 'text-danger'
                          }
                        >
                          {row.success || row.status === 'success' ? 'Success' : 'Failed'}
                        </span>
                      </td>
                      <td className="py-2 text-gray-400">{row.ip || row.ip_address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="AI leakage analysis" subtitle="Cross-session pattern monitoring">
          <LeakageReport
            report={leakage}
            loading={loadingLeakage}
            error={leakageError}
          />
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;

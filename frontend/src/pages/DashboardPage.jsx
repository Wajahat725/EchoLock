import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Card from '../components/common/Card';
import Loader from '../components/common/Loader';
import LeakageReport from '../components/security/LeakageReport';
import { useAuth } from '../hooks/useAuth';
import { getLeakageReport, getLoginHistory } from '../services/sessionService';
import { ROUTES } from '../utils/constants';

// Date formatting function with Pakistan Timezone
const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Karachi' // Pakistan Standard Time
  }).toLowerCase();

  return `${day}/${month}/${year}, ${time}`;
};

const DashboardPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [history, setHistory] = useState([]);
  const [leakage, setLeakage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!user?.username) return;
    let mounted = true;
    setLoading(true);

    Promise.allSettled([
      getLoginHistory(user.username),
      getLeakageReport(user.username),
    ]).then(([histRes, leakRes]) => {
      if (!mounted) return;
      if (histRes.status === 'fulfilled') {
        const d = histRes.value.data;
        setHistory(Array.isArray(d) ? d : d?.history ?? []);
      } else {
        setErrors((prev) => ({ ...prev, history: histRes.reason?.message }));
      }
      if (leakRes.status === 'fulfilled') {
        setLeakage(leakRes.value.data);
      } else {
        setErrors((prev) => ({ ...prev, leakage: leakRes.reason?.message }));
      }
      setLoading(false);
    });

    return () => { mounted = false; };
  }, [user?.username]);

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />;

  return (
    <div className="mx-auto max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-1 text-slate-600">
          Welcome back, <span className="font-semibold text-indigo-600">{user.username}</span>
        </p>
        {user.sessionPassword && (
          <p className="mt-2 text-sm text-slate-600">
            Latest session key:{' '}
            <code className="rounded-md border border-slate-200 bg-white px-2.5 py-1 font-mono font-semibold text-indigo-700 shadow-xs">
              {user.sessionPassword}
            </code>
          </p>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Login history" subtitle="Recent authentication events">
          {loading ? (
            <Loader size="sm" label="Loading history..." />
          ) : errors.history ? (
            <p className="text-sm text-slate-500">History unavailable ({errors.history}).</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-500">No login events recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="pb-3 pr-4">Time</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((row, i) => (
                    <tr key={row.id ?? i} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 pr-4 text-slate-700 font-medium">
                        {formatDate(row.timestamp || row.created_at)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          row.success || row.status === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {row.success || row.status === 'success' ? 'Success' : 'Failed'}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500 font-mono text-xs">{row.ip || row.ip_address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="AI leakage analysis" subtitle="Cross-session pattern monitoring">
          <LeakageReport report={leakage} loading={loading} error={errors.leakage} />
        </Card>
      </div>
    </div>
  );
};
export default DashboardPage;
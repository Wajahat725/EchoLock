import Alert from '../common/Alert';
import Loader from '../common/Loader';
import { LEAKAGE_STATUS } from '../../utils/constants';

const LeakageReport = ({ report, loading, error }) => {
  if (loading) return <Loader size="sm" label="Running AI leakage analysis..." />;
  if (error) return <Alert variant="warning">Could not load leakage report: {error}</Alert>;
  if (!report) return <p className="text-sm text-slate-500">No AI analysis available yet. Complete a few login sessions first.</p>;

  const status = (report.status || LEAKAGE_STATUS.SAFE).toLowerCase();
  const meta = {
    [LEAKAGE_STATUS.SAFE]: { variant: 'success', title: 'Safe', desc: 'No cross-session pattern leakage detected.' },
    [LEAKAGE_STATUS.WARNING]: { variant: 'warning', title: 'Warning', desc: 'Similar click patterns detected across sessions.' },
    [LEAKAGE_STATUS.LEAKAGE]: { variant: 'error', title: 'Leakage detected', desc: 'Session passwords may be predictable. Rotate secrets.' },
  }[status] || { variant: 'success', title: 'Safe', desc: 'No cross-session pattern leakage detected.' };

  return (
    <div className="space-y-3">
      <Alert variant={meta.variant}>
        <p className="font-bold">{meta.title}</p>
        <p className="mt-1 font-normal opacity-90">{report.message || meta.desc}</p>
        {typeof report.score === 'number' && <p className="mt-2 text-xs font-semibold opacity-80">Risk score: {report.score}/100</p>}
      </Alert>
      {report.patterns?.length > 0 && (
        <ul className="list-inside list-disc text-sm text-slate-600">
          {report.patterns.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
    </div>
  );
};

export default LeakageReport;


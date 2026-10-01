import Alert from '../common/Alert';
import Loader from '../common/Loader';
import { LEAKAGE_STATUS } from '../../utils/constants';

/**
 * @param {object} props
 * @param {{ status?: string, message?: string, score?: number, patterns?: string[] }|null} props.report
 * @param {boolean} [props.loading]
 * @param {string} [props.error]
 */
const LeakageReport = ({ report, loading, error }) => {
  if (loading) {
    return <Loader size="sm" label="Running AI leakage analysis..." />;
  }

  if (error) {
    return (
      <Alert variant="warning">
        Could not load leakage report: {error}
      </Alert>
    );
  }

  if (!report) {
    return (
      <p className="text-sm text-gray-500">
        No AI analysis available yet. Complete a few login sessions first.
      </p>
    );
  }

  const status = (report.status || LEAKAGE_STATUS.SAFE).toLowerCase();

  const config = {
    [LEAKAGE_STATUS.SAFE]: {
      variant: 'success',
      title: 'Safe',
      description: 'No cross-session pattern leakage detected.',
    },
    [LEAKAGE_STATUS.WARNING]: {
      variant: 'warning',
      title: 'Warning',
      description: 'Similar click patterns detected across sessions. Consider varying behavior.',
    },
    [LEAKAGE_STATUS.LEAKAGE]: {
      variant: 'error',
      title: 'Leakage detected',
      description: 'Session passwords may be predictable. Rotate secrets and review activity.',
    },
  };

  const meta = config[status] || config[LEAKAGE_STATUS.SAFE];

  return (
    <div className="space-y-3">
      <Alert variant={meta.variant}>
        <p className="font-semibold">{meta.title}</p>
        <p className="mt-1 opacity-90">{report.message || meta.description}</p>
        {typeof report.score === 'number' && (
          <p className="mt-2 text-xs opacity-75">Risk score: {report.score}/100</p>
        )}
      </Alert>
      {report.patterns?.length > 0 && (
        <ul className="list-inside list-disc text-sm text-gray-400">
          {report.patterns.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LeakageReport;

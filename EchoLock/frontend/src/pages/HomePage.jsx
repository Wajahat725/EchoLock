import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { ROUTES } from '../utils/constants';

const features = [
  {
    title: 'Grid-based login',
    text: 'Each session shows a unique 5×5 character grid. Your password is where you click — not what you type.',
    icon: '🔐',
  },
  {
    title: 'One-time session keys',
    text: 'Click positions become a disposable session password verified securely server-side.',
    icon: '⚡',
  },
  {
    title: 'Lockout protection',
    text: 'Failed attempts trigger temporary lockouts to prevent automated brute-force attacks.',
    icon: '🛡️',
  },
  {
    title: 'AI leakage monitoring',
    text: 'Cross-session analysis flags predictable patterns and protects against shoulder surfing.',
    icon: '🤖',
  },
];

const HomePage = () => (
  <div className="mx-auto max-w-5xl flex-1 px-4 py-12 sm:px-6 sm:py-20">
    <section className="text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700 shadow-xs mb-4">
        <span>✨ Next-Gen Authentication</span>
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
        Security with <span className="text-gradient">EchoLock</span>
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 leading-relaxed">
        Register three secret characters, then authenticate by clicking their positions on a
        fresh random grid every time. Stronger than static passwords, designed for modern session-based
        access.
      </p>
      <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link to={ROUTES.REGISTER}>
          <Button size="lg">Get started</Button>
        </Link>
        <Link to={ROUTES.LOGIN}>
          <Button size="lg" variant="secondary">
            Sign in
          </Button>
        </Link>
      </div>
    </section>

    <section className="mt-16 grid gap-6 sm:grid-cols-2">
      {features.map((f) => (
        <Card key={f.title} className="hover:-translate-y-0.5 transition-all">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-lg">
              {f.icon}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{f.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.text}</p>
            </div>
          </div>
        </Card>
      ))}
    </section>

    <section className="mt-12 rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-sm text-center">
      <h2 className="text-xl font-bold text-slate-900">How it works</h2>
      <ol className="mx-auto mt-6 max-w-xl space-y-3 text-left text-sm text-slate-600">
        <li className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">1</span>
          <span>Register with a username and three secret characters.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">2</span>
          <span>At login, enter your username and receive a dynamic random grid.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">3</span>
          <span>Click your three secrets in order — those dynamic coordinates form your one-time session password.</span>
        </li>
      </ol>
    </section>
  </div>
);

export default HomePage;


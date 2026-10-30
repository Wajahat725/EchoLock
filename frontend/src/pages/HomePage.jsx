import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { ROUTES } from '../utils/constants';

const features = [
  {
    title: 'Grid-based login',
    text: 'Each session shows a unique 5×5 character grid. Your password is where you click — not what you type.',
  },
  {
    title: 'One-time session keys',
    text: 'Click positions become a disposable session password verified securely server-side.',
  },
  {
    title: 'Lockout protection',
    text: 'Failed attempts trigger temporary lockouts to prevent automated brute-force attacks.',
  },
  {
    title: 'AI leakage monitoring',
    text: 'Cross-session analysis flags predictable patterns and protects against shoulder surfing.',
  },
];

const HomePage = () => (
  <div className="mx-auto max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
    <section className="relative overflow-hidden rounded-[1.75rem] border border-indigo-900/10 bg-cream-50 px-6 py-12 shadow-[0_24px_70px_-42px_rgba(37,50,91,0.38)] sm:px-12 sm:py-16 lg:px-16">
      <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full border-[48px] border-indigo-50/80" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-8 -top-16 h-64 w-64 rounded-full border border-indigo-200/70" aria-hidden="true" />
      <div className="relative max-w-3xl">
        <div className="mb-5 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-800">
          Next-Gen Authentication
        </div>
        <h1 className="text-4xl font-bold leading-[1.08] tracking-[-0.045em] text-indigo-950 sm:text-5xl lg:text-6xl">
          Security with <span className="text-gradient">EchoLock</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
          Register eight secret characters, then authenticate by clicking their positions on a
          fresh random grid every time. Stronger than static passwords, designed for modern session-based
          access.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to={ROUTES.REGISTER}>
            <Button size="lg" className="w-full sm:w-auto">Get started</Button>
          </Link>
          <Link to={ROUTES.LOGIN}>
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              Sign in
            </Button>
          </Link>
        </div>
      </div>
    </section>

    <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:gap-5">
      {features.map((feature) => (
        <Card key={feature.title} className="group relative overflow-hidden p-6 sm:p-7">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-700 to-indigo-300" aria-hidden="true" />
          <h2 className="text-base font-bold tracking-tight text-indigo-950">{feature.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{feature.text}</p>
        </Card>
      ))}
    </section>

    <section className="mt-8 rounded-2xl border border-slate-200/80 bg-cream-50 p-6 shadow-[0_12px_36px_-24px_rgba(37,50,91,0.28)] sm:p-8">
      <h2 className="text-xl font-bold tracking-tight text-indigo-950">How it works</h2>
      <ol className="mt-6 grid gap-4 text-sm leading-6 text-slate-600 md:grid-cols-3">
        <li className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800">1</span>
          <span>Register with a username and eight secret characters.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800">2</span>
          <span>At login, enter your username and receive a dynamic random grid.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800">3</span>
          <span>Click your eight secrets in order — those dynamic coordinates form your one-time session password.</span>
        </li>
      </ol>
    </section>
  </div>
);

export default HomePage;

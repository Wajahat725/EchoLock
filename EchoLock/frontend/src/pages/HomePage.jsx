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
    text: 'Click positions become a disposable session password verified server-side.',
  },
  {
    title: 'Lockout protection',
    text: 'Failed attempts trigger temporary lockouts to slow brute-force attacks.',
  },
  {
    title: 'AI leakage monitoring',
    text: 'Cross-session analysis flags predictable patterns before attackers do.',
  },
];

const HomePage = () => (
  <div className="mx-auto max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
    <section className="text-center">
      <p className="mb-3 text-sm font-medium uppercase tracking-widest text-cyan-accent">
        Improved session password security
      </p>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
        <span className="text-gradient">EchoLock</span>
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
        Register three secret characters, then authenticate by clicking their positions on a
        fresh random grid every time. Stronger than static passwords, designed for session-based
        access.
      </p>
      <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
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

    <section className="mt-20 grid gap-6 sm:grid-cols-2">
      {features.map((f) => (
        <Card key={f.title} title={f.title}>
          <p className="text-sm leading-relaxed text-gray-400">{f.text}</p>
        </Card>
      ))}
    </section>

    <section className="mt-16 rounded-xl border border-dashed border-gray-700 p-8 text-center">
      <h2 className="text-xl font-semibold text-gray-200">How it works</h2>
      <ol className="mx-auto mt-6 max-w-xl space-y-3 text-left text-sm text-gray-400">
        <li>
          <span className="font-semibold text-cyan-accent">1.</span> Register with a username and
          three secret characters.
        </li>
        <li>
          <span className="font-semibold text-cyan-accent">2.</span> At login, enter your username
          and receive a random grid.
        </li>
        <li>
          <span className="font-semibold text-cyan-accent">3.</span> Click your three secrets in
          order — those coordinates are your one-time session password.
        </li>
      </ol>
    </section>
  </div>
);

export default HomePage;

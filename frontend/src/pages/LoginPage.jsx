import { Link } from 'react-router-dom';
import Card from '../components/common/Card';
import LoginForm from '../components/auth/LoginForm';
import { ROUTES } from '../utils/constants';

const LoginPage = () => (
  <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-12">
    <Card
      title="Sign in"
      subtitle="Step 1: username · Step 2: click your secret pattern on the grid"
    >
      <LoginForm />
      <p className="mt-6 text-center text-sm text-slate-500">
        New to EchoLock?{' '}
        <Link to={ROUTES.REGISTER} className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
          Register
        </Link>
      </p>
    </Card>
  </div>
);

export default LoginPage;


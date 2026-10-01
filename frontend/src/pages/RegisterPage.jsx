import { Link } from 'react-router-dom';
import Card from '../components/common/Card';
import RegisterForm from '../components/auth/RegisterForm';
import { ROUTES } from '../utils/constants';

const RegisterPage = () => (
  <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
    <Card title="Create account" subtitle="Set your username and three secret characters.">
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-gray-500">
        Already registered?{' '}
        <Link to={ROUTES.LOGIN} className="text-cyan-accent hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  </div>
);

export default RegisterPage;

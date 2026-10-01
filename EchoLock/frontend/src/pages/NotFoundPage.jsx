import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import { ROUTES } from '../utils/constants';

const NotFoundPage = () => (
  <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
    <p className="text-6xl font-bold text-cyan-accent/30">404</p>
    <h1 className="mt-4 text-2xl font-semibold text-gray-100">Page not found</h1>
    <p className="mt-2 text-gray-400">
      The route you requested does not exist in EchoLock.
    </p>
    <Link to={ROUTES.HOME} className="mt-8">
      <Button>Back to home</Button>
    </Link>
  </div>
);

export default NotFoundPage;

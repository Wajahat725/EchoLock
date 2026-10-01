import { Link, NavLink } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';
import Button from './Button';
import logo from '../../assets/logo.svg';

const navLinkClass = ({ isActive }) =>
  `text-sm font-medium transition-colors ${
    isActive ? 'text-cyan-accent' : 'text-gray-400 hover:text-gray-200'
  }`;

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-800/80 bg-navy/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to={ROUTES.HOME} className="flex items-center gap-2.5">
          <img src={logo} alt="" className="h-8 w-8" aria-hidden />
          <span className="text-lg font-bold tracking-tight">
            Echo<span className="text-cyan-accent">Lock</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          <NavLink to={ROUTES.HOME} className={navLinkClass}>
            Home
          </NavLink>
          {!isAuthenticated && (
            <>
              <NavLink to={ROUTES.LOGIN} className={navLinkClass}>
                Login
              </NavLink>
              <NavLink to={ROUTES.REGISTER} className={navLinkClass}>
                Register
              </NavLink>
            </>
          )}
          {isAuthenticated && (
            <NavLink to={ROUTES.DASHBOARD} className={navLinkClass}>
              Dashboard
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <span className="hidden text-sm text-gray-400 sm:inline">
                {user?.username}
              </span>
              <Button variant="secondary" size="sm" onClick={logout}>
                Log out
              </Button>
            </>
          ) : (
            <Link to={ROUTES.LOGIN} className="md:hidden">
              <Button size="sm">Sign in</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;

import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';
import Button from './Button';

const navLinkClass = ({ isActive }) =>
  `inline-flex items-center px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
    isActive
      ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
  }`;

const mobileNavLinkClass = ({ isActive }) =>
  `block px-4 py-2.5 rounded-lg text-base font-medium transition-all ${
    isActive
      ? 'bg-indigo-50 text-indigo-700 font-semibold'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
  }`;

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between px-4 sm:px-6">
        
        {/* Brand Logo & Security Badge */}
        <div className="flex items-center gap-3">
          <Link
            to={ROUTES.HOME}
            onClick={closeMenu}
            className="group flex items-center gap-2.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-4"
          >
            <img
              src="/echolock-mark.svg"
              alt=""
              aria-hidden="true"
              className="h-9 w-9 rounded-xl shadow-sm shadow-indigo-950/15 transition-transform duration-200 group-hover:-rotate-3 group-hover:scale-105"
            />
            <span className="text-xl font-bold tracking-[-0.045em] text-indigo-950">
              Echo<span className="text-indigo-600">Lock</span>
            </span>
          </Link>

          <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main Navigation">
          <NavLink to={ROUTES.HOME} className={navLinkClass}>
            Home
          </NavLink>
          {isAuthenticated && (
            <NavLink to={ROUTES.DASHBOARD} className={navLinkClass}>
              Dashboard
            </NavLink>
          )}
        </nav>

        {/* Desktop User Actions */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-3 shadow-xs">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-xs">
                  {user?.username ? user.username[0].toUpperCase() : 'U'}
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {user?.username}
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={logout}
                className="gap-1.5 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/50"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to={ROUTES.LOGIN}>
                <Button variant="secondary" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link to={ROUTES.REGISTER}>
                <Button size="sm">
                  Get started
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-200 bg-cream-50 px-4 pt-2 pb-5 shadow-lg md:hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col space-y-1">
            <NavLink to={ROUTES.HOME} onClick={closeMenu} className={mobileNavLinkClass}>
              Home
            </NavLink>
            {isAuthenticated && (
              <NavLink to={ROUTES.DASHBOARD} onClick={closeMenu} className={mobileNavLinkClass}>
                Dashboard
              </NavLink>
            )}
          </nav>

          <div className="mt-4 pt-4 border-t border-slate-100">
            {isAuthenticated ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                    {user?.username ? user.username[0].toUpperCase() : 'U'}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">
                    {user?.username}
                  </span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    logout();
                    closeMenu();
                  }}
                >
                  Log out
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link to={ROUTES.LOGIN} onClick={closeMenu}>
                  <Button variant="secondary" className="w-full">
                    Sign in
                  </Button>
                </Link>
                <Link to={ROUTES.REGISTER} onClick={closeMenu}>
                  <Button className="w-full">
                    Get started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;

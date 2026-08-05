import { Outlet, Link } from 'react-router-dom';

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col font-sans text-ink-950">
      <header className="border-b border-ink-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-seed-800 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-ivory-50 relative">
                  <div className="absolute inset-0 rounded-full border border-gold-500 scale-150"></div>
                </div>
              </div>
              <span className="font-semibold text-lg tracking-tight text-seed-950">SeedCoop</span>
            </Link>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link to="/" className="text-sm font-medium hover:text-seed-600 transition-colors">Home</Link>
            <Link to="/about" className="text-sm font-medium hover:text-seed-600 transition-colors">About</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium bg-seed-800 text-white px-4 py-2 rounded-[10px] hover:bg-seed-700 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-grow">
        <Outlet />
      </main>
      <footer className="bg-seed-950 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-ivory-50 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-seed-950"></div>
              </div>
              <span className="font-semibold tracking-tight text-ivory-50">SeedCoop</span>
            </div>
            <p className="text-sm text-seed-200">Shared growth, made visible. A modern cooperative platform.</p>
          </div>
          <div>
            <h3 className="font-medium mb-4 text-ivory-50">Cooperative</h3>
            <ul className="space-y-2 text-sm text-seed-200">
              <li><Link to="/about" className="hover:text-white">About Us</Link></li>
              <li><Link to="/membership" className="hover:text-white">Membership</Link></li>
              <li><Link to="/loans" className="hover:text-white">Loans</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-4 text-ivory-50">Legal</h3>
            <ul className="space-y-2 text-sm text-seed-200">
              <li><Link to="/terms" className="hover:text-white">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              <li><Link to="/bylaws" className="hover:text-white">Cooperative Bylaws</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-4 text-ivory-50">Contact</h3>
            <ul className="space-y-2 text-sm text-seed-200">
              <li>contact@seedcoop.ng</li>
              <li>+234 800 000 0000</li>
              <li className="mt-4 text-xs opacity-75">Member-owned thrift & credit cooperative.</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { useLocation } from 'react-router-dom';

export function GenericPage() {
  const location = useLocation();
  const pageName = location.pathname.substring(1).split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-24 px-4 bg-ivory-50">
      <div className="max-w-2xl w-full text-center space-y-6">
        <div className="w-20 h-20 bg-seed-100 text-seed-800 rounded-full flex items-center justify-center mx-auto mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        </div>
        <h1 className="text-4xl font-bold text-seed-950">{pageName || 'Page'}</h1>
        <p className="text-xl text-ink-600">
          This page is currently being updated. Please check back later.
        </p>
        <p className="text-ink-500 max-w-lg mx-auto">
          We are constantly adding more information to our cooperative platform to ensure complete transparency for our members.
        </p>
      </div>
    </div>
  );
}

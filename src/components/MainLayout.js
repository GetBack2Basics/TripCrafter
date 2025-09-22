import React, { useEffect, useState } from 'react';

export default function MainLayout({ children }) {
  const [version, setVersion] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/version.json', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setVersion(data);
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen w-full min-w-full max-w-full bg-gradient-to-br from-blue-100 to-indigo-200 flex flex-col overflow-x-hidden">
      <main className="flex-1 flex justify-center items-start w-full min-w-full max-w-full">
        <div className="w-full min-w-full max-w-full bg-white shadow-xl rounded-xl p-6 mt-8 lg:p-8">
          {children}
        </div>
      </main>
      <footer className="text-center text-xs text-gray-500 py-2">
        {version ? (
          <span>v{version.version} • built {new Date(version.buildTime).toLocaleString()}{version.git ? ` • ${version.git}` : ''}</span>
        ) : (
          <span className="opacity-50">version unknown</span>
        )}
      </footer>
    </div>
  );
}

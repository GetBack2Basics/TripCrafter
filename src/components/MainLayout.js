import React from 'react';

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen w-full min-w-full max-w-full bg-gradient-to-br from-blue-100 to-indigo-200 flex flex-col overflow-x-hidden">
      <main className="flex-1 flex justify-center items-start w-full min-w-full max-w-full">
        <div className="w-full min-w-full max-w-full bg-white shadow-xl rounded-xl p-6 mt-8 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

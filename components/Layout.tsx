
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  wide?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, wide = false }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-200 py-12">
      <div className={`w-full ${wide ? 'max-w-3xl' : 'max-w-md'} bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-500`}>
        {children}
      </div>
    </div>
  );
};

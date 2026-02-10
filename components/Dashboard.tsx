
import React from 'react';
import { User, signOut } from 'firebase/auth';
import { auth } from '../services/firebase.ts';
import { Board } from './Board.tsx';

interface DashboardProps {
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="p-6 md:p-10">
      <header className="flex justify-between items-center mb-10 pb-6 border-b">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
            {user.email?.[0].toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Workspace</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
        >
          로그아웃
        </button>
      </header>

      <main>
        <Board />
      </main>
    </div>
  );
};

import React from 'react';
import { Bug, LogIn } from 'lucide-react';

const Login = () => {
  const handleLogin = () => {
    window.location.href = '/auth/login';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Bug className="h-12 w-12 text-primary-500" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Bug Tracker
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in with your Microsoft account to continue
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <button
            onClick={handleLogin}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            <LogIn className="h-5 w-5 mr-2" />
            Sign in with Microsoft
          </button>
        </div>
        
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Access is restricted to authorized users only
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
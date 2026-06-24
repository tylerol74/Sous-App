import React, { useState } from 'react';
import { User } from '../types';
import { ChefHatIcon } from './icons';
import { LoadingSpinner } from './LoadingSpinner';

interface AuthPageProps {
  onAuthSuccess: (user: User) => void;
  authService: {
    login: (email: string, password: string) => Promise<User>;
    signup: (email: string, password: string) => Promise<User>;
  }
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess, authService }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const authFunction = isLoginView ? authService.login : authService.signup;
      const user = await authFunction(email, password);
      onAuthSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center items-center mb-6">
          <ChefHatIcon className="h-12 w-12 text-emerald-500" />
          <h1 className="ml-4 text-4xl font-bold text-slate-800 tracking-tight">Pantry Chef AI</h1>
        </div>
        
        <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200/80">
          <h2 className="text-2xl font-semibold text-center text-slate-700 mb-6">
            {isLoginView ? 'Welcome Back!' : 'Create Your Account'}
          </h2>

          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm text-center">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isLoginView ? "current-password" : "new-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                {isLoading ? <LoadingSpinner className="h-6 w-6" /> : (isLoginView ? 'Log In' : 'Sign Up')}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => { setIsLoginView(!isLoginView); setError(null); }} className="text-sm font-medium text-emerald-600 hover:text-emerald-500">
              {isLoginView ? 'Need an account? Sign up' : 'Already have an account? Log in'}
            </button>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-500 text-center">
          <strong>Note:</strong> This is a demo application. Do not use real passwords.
        </p>
      </div>
    </div>
  );
};

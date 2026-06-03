import { useState, type FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface LoginFormProps {
  /** Called after successful login */
  onSuccess?: () => void;
  /** Navigate to register page */
  onSwitchToRegister?: () => void;
}

export function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isFormValid = username.trim().length > 0 && password.length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isFormValid) return;

    setError(null);
    setIsLoading(true);

    try {
      await login(username.trim(), password);
      onSuccess?.();
    } catch (err: unknown) {
      const apiErr = err as { message?: string } | undefined;
      setError(apiErr?.message ?? 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-white text-center mb-6">
          Sign In
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Username field */}
          <div>
            <label
              htmlFor="login-username"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Username
            </label>
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-poker-gold focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          {/* Password field */}
          <div>
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-poker-gold focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          {/* Error display */}
          {error && (
            <div
              role="alert"
              className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-300 text-sm"
            >
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={!isFormValid || isLoading}
            className="w-full py-3 px-4 bg-poker-gold text-gray-900 font-semibold rounded-md hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-poker-gold focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Switch to register */}
        {onSwitchToRegister && (
          <p className="mt-4 text-center text-sm text-gray-400">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-poker-gold hover:underline focus:outline-none focus:underline min-h-[44px] min-w-[44px] inline-flex items-center"
            >
              Register
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

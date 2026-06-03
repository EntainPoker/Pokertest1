import { useState, type FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface RegisterFormProps {
  /** Called after successful registration */
  onSuccess?: () => void;
  /** Navigate to login page */
  onSwitchToLogin?: () => void;
}

/** Validate username: 3-20 alphanumeric characters */
function validateUsername(value: string): string | null {
  if (value.length < 3) return 'Username must be at least 3 characters';
  if (value.length > 20) return 'Username must be at most 20 characters';
  if (!/^[a-zA-Z0-9]+$/.test(value))
    return 'Username must contain only letters and numbers';
  return null;
}

/** Validate password: minimum 8 characters */
function validatePassword(value: string): string | null {
  if (value.length < 8) return 'Password must be at least 8 characters';
  return null;
}

export function RegisterForm({
  onSuccess,
  onSwitchToLogin,
}: RegisterFormProps) {
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState({ username: false, password: false });

  const usernameError = touched.username ? validateUsername(username) : null;
  const passwordError = touched.password ? validatePassword(password) : null;

  const isFormValid =
    !validateUsername(username) && !validatePassword(password);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ username: true, password: true });

    if (!isFormValid) return;

    setError(null);
    setIsLoading(true);

    try {
      await register(username.trim(), password);
      onSuccess?.();
    } catch (err: unknown) {
      const apiErr = err as { message?: string } | undefined;
      setError(apiErr?.message ?? 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-white text-center mb-6">
          Create Account
        </h2>

        {/* Validation rules display */}
        <div className="mb-4 p-3 bg-gray-700/50 rounded-md text-sm text-gray-300">
          <p className="font-medium mb-1">Account requirements:</p>
          <ul className="list-disc list-inside space-y-0.5 text-gray-400">
            <li>Username: 3–20 alphanumeric characters</li>
            <li>Password: minimum 8 characters</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Username field */}
          <div>
            <label
              htmlFor="register-username"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Username
            </label>
            <input
              id="register-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, username: true }))}
              placeholder="Choose a username"
              aria-describedby={usernameError ? 'username-error' : undefined}
              aria-invalid={!!usernameError}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-poker-gold focus:border-transparent ${
                usernameError ? 'border-red-500' : 'border-gray-600'
              }`}
              disabled={isLoading}
            />
            {usernameError && (
              <p id="username-error" className="mt-1 text-sm text-red-400">
                {usernameError}
              </p>
            )}
          </div>

          {/* Password field */}
          <div>
            <label
              htmlFor="register-password"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Password
            </label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              placeholder="Choose a password"
              aria-describedby={passwordError ? 'password-error' : undefined}
              aria-invalid={!!passwordError}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-poker-gold focus:border-transparent ${
                passwordError ? 'border-red-500' : 'border-gray-600'
              }`}
              disabled={isLoading}
            />
            {passwordError && (
              <p id="password-error" className="mt-1 text-sm text-red-400">
                {passwordError}
              </p>
            )}
          </div>

          {/* Server error display */}
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
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {/* Switch to login */}
        {onSwitchToLogin && (
          <p className="mt-4 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-poker-gold hover:underline focus:outline-none focus:underline min-h-[44px] min-w-[44px] inline-flex items-center"
            >
              Sign In
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

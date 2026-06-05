import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../admin/services/adminApi';

/**
 * Admin login page — completely separate from player login.
 * Authenticates against admin_accounts table.
 */
export function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const success = await adminLogin(username, password);
      if (success) {
        localStorage.setItem('adminLoggedIn', 'true');
        navigate('/admin');
      } else {
        setError('Invalid admin credentials');
      }
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-poker-gold text-center mb-2">
          Admin Panel
        </h1>
        <p className="text-gray-400 text-center mb-8 text-sm">
          Back Office Login
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-gray-800 rounded-lg p-6 space-y-4 border border-gray-700"
        >
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 rounded-md px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="admin-username" className="block text-sm font-medium text-gray-300 mb-1">
              Username
            </label>
            <input
              id="admin-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-poker-gold focus:border-transparent"
              placeholder="Admin username"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-poker-gold focus:border-transparent"
              placeholder="Admin password"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] px-4 py-2 bg-poker-gold text-gray-900 font-semibold rounded-md hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

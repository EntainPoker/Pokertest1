import { useNavigate } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';

/**
 * Login page — wraps LoginForm with navigation.
 * After successful login → navigate to /lobby.
 * Switch to register → navigate to /register.
 */
export function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-poker-gold text-center mb-8">
          Spin &amp; Go Poker
        </h1>
        <LoginForm
          onSuccess={() => navigate('/lobby')}
          onSwitchToRegister={() => navigate('/register')}
        />
      </div>
    </div>
  );
}

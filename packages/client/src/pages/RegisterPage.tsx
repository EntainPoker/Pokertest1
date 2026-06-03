import { useNavigate } from 'react-router-dom';
import { RegisterForm } from '../components/auth/RegisterForm';

/**
 * Register page — wraps RegisterForm with navigation.
 * After successful registration → navigate to /lobby.
 * Switch to login → navigate to /login.
 */
export function RegisterPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-poker-gold text-center mb-8">
          Spin &amp; Go Poker
        </h1>
        <RegisterForm
          onSuccess={() => navigate('/lobby')}
          onSwitchToLogin={() => navigate('/login')}
        />
      </div>
    </div>
  );
}

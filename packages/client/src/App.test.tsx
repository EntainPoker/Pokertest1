import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock react-router-dom to avoid BrowserRouter issues in tests
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// Mock the auth store to control authentication state
vi.mock('./stores/authStore', () => ({
  useAuthStore: vi.fn((selector) => {
    const state = {
      player: null,
      tokens: null,
      isAuthenticated: false,
      isHydrated: true,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      hydrate: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    // When not authenticated, AuthGuard redirects to login
    // The login page shows the title
    expect(screen.getByText('Spin & Go Poker')).toBeInTheDocument();
  });
});

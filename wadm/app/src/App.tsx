import { AppShell } from '@mantine/core';
import { useAppStore } from './store';
import { LoginForm } from './components/Auth/LoginForm';
import { SignUpForm } from './components/Auth/SignUpForm';
import { TwoFactorForm } from './components/Auth/TwoFactorForm';
import { OnboardingFlow } from './components/Auth/OnboardingFlow';
import { Dashboard } from './components/Layout/Dashboard';

function App() {
  const { authStep, isAuthenticated } = useAppStore();

  // Handle auth flow
  if (!isAuthenticated) {
    switch (authStep) {
      case 'signup':
        return <SignUpForm />;
      case '2fa':
        return <TwoFactorForm />;
      case 'onboarding':
        return <OnboardingFlow />;
      default:
        return <LoginForm />;
    }
  }

  return (
    <AppShell
      navbar={{ width: 280, breakpoint: 'md' }}
      header={{ height: 60 }}
      padding="md"
    >
      <Dashboard />
    </AppShell>
  );
}

export default App;

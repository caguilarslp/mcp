import { MantineProvider, createTheme } from '@mantine/core';
// import { useLocalStorage } from '@mantine/hooks';
import { useAuthStore } from './store';
import { LoginForm } from './components/Auth/LoginForm';
import { SignUpForm } from './components/Auth/SignUpForm';
import { TwoFactorForm } from './components/Auth/TwoFactorForm';
import { OnboardingFlow } from './components/Auth/OnboardingFlow';
import { Dashboard } from './components/Layout/Dashboard';

const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  headings: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  },
  colors: {
    // Custom trading colors
    trading: [
      '#f0f9ff', // 0 - lightest
      '#e0f2fe', // 1
      '#bae6fd', // 2
      '#7dd3fc', // 3
      '#38bdf8', // 4
      '#0ea5e9', // 5 - primary
      '#0284c7', // 6
      '#0369a1', // 7
      '#075985', // 8
      '#0c4a6e', // 9 - darkest
    ],
  },
  components: {
    Button: {
      styles: {
        root: {
          fontWeight: 600,
        },
      },
    },
  },
});

function App() {
  const { authStep, isAuthenticated, theme: appTheme } = useAuthStore();

  const renderAuthStep = () => {
    if (isAuthenticated) {
      return <Dashboard />;
    }

    switch (authStep) {
      case 'login':
        return <LoginForm />;
      case 'signup':
        return <SignUpForm />;
      case '2fa':
        return <TwoFactorForm />;
      case 'onboarding':
        return <OnboardingFlow />;
      default:
        return <LoginForm />;
    }
  };

  return (
    <MantineProvider theme={theme} forceColorScheme={appTheme}>
      {renderAuthStep()}
    </MantineProvider>
  );
}

export default App;

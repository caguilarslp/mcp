import { useState } from 'react';
import {
  Container,
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Stack,
  Alert,
  Checkbox,
  Group,
  Box,
  Progress,
  Anchor,
} from '@mantine/core';
import { IconMail, IconUser, IconBuilding, IconInfoCircle } from '@tabler/icons-react';
import { useAuthStore } from '../../store';

interface PasswordStrength {
  score: number;
  feedback: string[];
}

export function SignUpForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    company: '',
    acceptTerms: false,
  });
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, feedback: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signUp, switchToLogin } = useAuthStore();

  const validatePassword = (password: string): PasswordStrength => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score += 25;
    else feedback.push('At least 8 characters');

    if (/[A-Z]/.test(password)) score += 25;
    else feedback.push('One uppercase letter');

    if (/[a-z]/.test(password)) score += 25;
    else feedback.push('One lowercase letter');

    if (/\d/.test(password)) score += 25;
    else feedback.push('One number');

    return { score, feedback };
  };

  const handlePasswordChange = (value: string) => {
    setFormData(prev => ({ ...prev, password: value }));
    setPasswordStrength(validatePassword(value));
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (passwordStrength.score < 100) {
      setError('Please create a stronger password');
      return;
    }

    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return;
    }

    if (!formData.acceptTerms) {
      setError('Please accept the terms and conditions');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await signUp(formData);
      if (!success) {
        setError('Registration failed. Email might already be in use.');
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordColor = () => {
    if (passwordStrength.score < 50) return 'red';
    if (passwordStrength.score < 75) return 'yellow';
    return 'green';
  };

  return (
    <Container size={420} my={40}>
      <Box ta="center" mb="xl">
        <Title order={1} c="blue">WAIckoff Dashboard</Title>
        <Text c="dimmed" size="sm" mt="sm">
          Professional trading analysis platform
        </Text>
      </Box>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Group justify="space-between" align="flex-end">
              <Title order={3}>Create Account</Title>
              <Anchor size="sm" onClick={switchToLogin}>
                Already have an account?
              </Anchor>
            </Group>

            {error && (
              <Alert icon={<IconInfoCircle size="1rem" />} color="red">
                {error}
              </Alert>
            )}

            <TextInput
              label="Email Address"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              leftSection={<IconMail size="1rem" />}
              required
              disabled={loading}
              error={formData.email && !validateEmail(formData.email) ? 'Invalid email format' : ''}
            />

            <TextInput
              label="Full Name"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              leftSection={<IconUser size="1rem" />}
              required
              disabled={loading}
            />

            <TextInput
              label="Company (Optional)"
              placeholder="Your Company Inc."
              value={formData.company}
              onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
              leftSection={<IconBuilding size="1rem" />}
              disabled={loading}
            />

            <div>
              <PasswordInput
                label="Password"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                required
                disabled={loading}
              />
              {formData.password && (
                <Box mt="xs">
                  <Group justify="space-between" mb="xs">
                    <Text size="xs" c="dimmed">Password Strength</Text>
                    <Text size="xs" c={getPasswordColor()}>
                      {passwordStrength.score < 50 ? 'Weak' : 
                       passwordStrength.score < 75 ? 'Good' : 'Strong'}
                    </Text>
                  </Group>
                  <Progress value={passwordStrength.score} color={getPasswordColor()} size="sm" />
                  {passwordStrength.feedback.length > 0 && (
                    <Text size="xs" c="dimmed" mt="xs">
                      Missing: {passwordStrength.feedback.join(', ')}
                    </Text>
                  )}
                </Box>
              )}
            </div>

            <Checkbox
              label={
                <Text size="sm">
                  I accept the{' '}
                  <Anchor href="#" size="sm">Terms and Conditions</Anchor>
                  {' '}and{' '}
                  <Anchor href="#" size="sm">Privacy Policy</Anchor>
                </Text>
              }
              checked={formData.acceptTerms}
              onChange={(e) => setFormData(prev => ({ ...prev, acceptTerms: e.target.checked }))}
              required
              disabled={loading}
            />

            <Button
              type="submit"
              fullWidth
              loading={loading}
              mt="md"
              disabled={passwordStrength.score < 100 || !formData.acceptTerms}
            >
              Create Account
            </Button>

            <Alert icon={<IconInfoCircle size="1rem" />} color="blue" variant="light">
              <Text size="sm">
                <strong>What's next?</strong><br />
                After registration, we'll send you a verification code and guide you through our $1/session pricing model.
              </Text>
            </Alert>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
} 
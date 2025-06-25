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
  Group,
  Box,
  Checkbox,
  Anchor,
} from '@mantine/core';
import { IconKey, IconInfoCircle, IconMail } from '@tabler/icons-react';
import { useAppStore } from '../../store';

export function LoginForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, switchToSignUp } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await login(formData);
      if (!success) {
        setError('Invalid credentials. Please check and try again.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
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
              <Title order={3}>Sign In</Title>
              <Anchor size="sm" onClick={switchToSignUp}>
                Create account
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
            />

            <PasswordInput
              label="Password"
              placeholder="Your password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              required
              disabled={loading}
            />

            <Group justify="space-between">
              <Checkbox
                label="Remember me"
                checked={formData.rememberMe}
                onChange={(e) => setFormData(prev => ({ ...prev, rememberMe: e.target.checked }))}
                disabled={loading}
              />
              <Anchor size="sm" href="#">
                Forgot password?
              </Anchor>
            </Group>

            <Button
              type="submit"
              fullWidth
              loading={loading}
              mt="md"
            >
              Sign In
            </Button>

            <Alert icon={<IconInfoCircle size="1rem" />} color="blue" variant="light">
              <Text size="sm">
                <strong>Demo credentials:</strong><br />
                Email: demo@waickoff.com | Password: Demo123!
              </Text>
            </Alert>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
} 
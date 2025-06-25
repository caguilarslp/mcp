import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  PinInput,
  Button,
  Title,
  Text,
  Stack,
  Alert,
  Group,
  Box,
  Anchor,
} from '@mantine/core';
import { IconMail, IconInfoCircle, IconClock } from '@tabler/icons-react';
import { useAppStore } from '../../store';

export function TwoFactorForm() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [resendCount, setResendCount] = useState(0);
  const { verify2FA, pendingEmail, logout } = useAppStore();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await verify2FA(code);
      if (!success) {
        setError('Invalid verification code. Please try again.');
        setCode('');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCount >= 3) {
      setError('Maximum resend attempts reached. Please try again later.');
      return;
    }

    setResendCount(prev => prev + 1);
    setTimeLeft(600); // Reset timer
    
    // MOCK: Simulate resend
    console.log('Mock: Resending verification code to', pendingEmail);
    
    // Show success message (could use notifications)
    setError('');
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
            <Box ta="center">
              <IconMail size={48} color="var(--mantine-color-blue-6)" />
              <Title order={3} mt="md">Verify Your Email</Title>
              <Text size="sm" c="dimmed" mt="xs">
                We've sent a 6-digit code to<br />
                <strong>{pendingEmail}</strong>
              </Text>
            </Box>

            {error && (
              <Alert icon={<IconInfoCircle size="1rem" />} color="red">
                {error}
              </Alert>
            )}

            <Box ta="center">
              <Text size="sm" mb="md">Enter verification code:</Text>
              <PinInput
                length={6}
                value={code}
                onChange={setCode}
                size="lg"
                disabled={loading || timeLeft === 0}
                placeholder="•"
                type="number"
              />
            </Box>

            <Group justify="space-between" mt="md">
              <Box ta="center" flex={1}>
                <Group justify="center" gap="xs">
                  <IconClock size="1rem" />
                  <Text size="sm" c={timeLeft < 60 ? "red" : "dimmed"}>
                    {formatTime(timeLeft)}
                  </Text>
                </Group>
              </Box>
            </Group>

            <Button
              type="submit"
              fullWidth
              loading={loading}
              disabled={code.length !== 6 || timeLeft === 0}
              mt="md"
            >
              Verify Code
            </Button>

            <Group justify="center" mt="md">
              <Text size="sm" c="dimmed">Didn't receive the code?</Text>
              <Anchor 
                size="sm" 
                onClick={handleResend}
                style={{ 
                  pointerEvents: resendCount >= 3 ? 'none' : 'auto',
                  opacity: resendCount >= 3 ? 0.5 : 1
                }}
              >
                Resend ({3 - resendCount} left)
              </Anchor>
            </Group>

            <Group justify="center" mt="lg">
              <Anchor size="sm" onClick={logout}>
                ← Back to login
              </Anchor>
            </Group>

            <Alert icon={<IconInfoCircle size="1rem" />} color="blue" variant="light">
              <Text size="sm">
                <strong>Demo mode:</strong> Use code <strong>123456</strong> to continue.
              </Text>
            </Alert>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
} 
import { useState } from 'react';
import {
  Container,
  Paper,
  Button,
  Title,
  Text,
  Stack,
  Group,
  Box,
  Stepper,
  Card,
  Badge,
  Grid,
  TextInput,
  Select,
  Alert,
  Progress,
} from '@mantine/core';
import {
  IconWallet,
  IconChartLine,
  IconCheck,
  IconCreditCard,
  IconBrandPaypal,
  IconInfoCircle,
  IconTool,
} from '@tabler/icons-react';
import { useAuthStore } from '../../store';

const ONBOARDING_STEPS = [
  {
    label: 'Welcome',
    description: 'Learn about WAIckoff',
  },
  {
    label: 'Payment',
    description: 'Setup billing',
  },
  {
    label: 'Complete',
    description: 'Start trading',
  },
];

export function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');
  const [paymentData, setPaymentData] = useState({
    cardNumber: '4242 4242 4242 4242',
    expiryDate: '12/25',
    cvv: '123',
    nameOnCard: 'John Doe',
  });
  const { user, logout, onboardingData, setOnboardingStep, completeOnboarding } = useAuthStore();

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete onboarding
      console.log('Onboarding completed!');
      // Update user onboarding status and redirect to dashboard
      window.location.reload(); // Simple refresh for demo
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Stack gap="lg">
            <Box ta="center">
              <IconChartLine size={64} color="var(--mantine-color-blue-6)" />
              <Title order={2} mt="md">Welcome to WAIckoff!</Title>
              <Text c="dimmed" mt="xs">
                Professional trading analysis powered by advanced algorithms
              </Text>
            </Box>

            <Card withBorder>
              <Title order={4} mb="md">Our Transparent Pricing</Title>
              <Group justify="center" mb="lg">
                <Box ta="center">
                  <Text size="xl" fw={700} c="blue">$1.00</Text>
                  <Text size="sm" c="dimmed">per session</Text>
                </Box>
              </Group>
              
              <Stack gap="sm">
                <Group>
                  <IconCheck size="1rem" color="green" />
                  <Text size="sm">24 hours of access</Text>
                </Group>
                <Group>
                  <IconCheck size="1rem" color="green" />
                  <Text size="sm">100,000 token limit</Text>
                </Group>
                <Group>
                  <IconCheck size="1rem" color="green" />
                  <Text size="sm">133 analysis tools</Text>
                </Group>
                <Group>
                  <IconCheck size="1rem" color="green" />
                  <Text size="sm">Multi-exchange support</Text>
                </Group>
              </Stack>
            </Card>

            <Alert icon={<IconInfoCircle size="1rem" />} color="blue">
              <Text size="sm">
                <strong>First session is FREE!</strong> No credit card required to start.
              </Text>
            </Alert>
          </Stack>
        );

      case 1:
        return (
          <Stack gap="lg">
            <Box ta="center">
              <IconWallet size={64} color="var(--mantine-color-green-6)" />
              <Title order={2} mt="md">Setup Payment Method</Title>
              <Text c="dimmed" mt="xs">
                Choose how you'd like to pay for sessions
              </Text>
            </Box>

            <Grid>
              <Grid.Col span={6}>
                <Card 
                  withBorder 
                  p="md" 
                  style={{ 
                    border: paymentMethod === 'card' ? '2px solid var(--mantine-color-blue-6)' : undefined,
                    cursor: 'pointer'
                  }}
                  onClick={() => setPaymentMethod('card')}
                >
                  <Group>
                    <IconCreditCard size="1.5rem" />
                    <div>
                      <Text fw={500}>Credit Card</Text>
                      <Text size="xs" c="dimmed">Visa, Mastercard, Amex</Text>
                    </div>
                  </Group>
                </Card>
              </Grid.Col>
              <Grid.Col span={6}>
                <Card 
                  withBorder 
                  p="md"
                  style={{ 
                    border: paymentMethod === 'paypal' ? '2px solid var(--mantine-color-blue-6)' : undefined,
                    cursor: 'pointer'
                  }}
                  onClick={() => setPaymentMethod('paypal')}
                >
                  <Group>
                    <IconBrandPaypal size="1.5rem" />
                    <div>
                      <Text fw={500}>PayPal</Text>
                      <Text size="xs" c="dimmed">Fast & secure</Text>
                    </div>
                  </Group>
                </Card>
              </Grid.Col>
            </Grid>

            {paymentMethod === 'card' && (
              <Stack gap="md">
                <TextInput
                  label="Card Number"
                  placeholder="1234 5678 9012 3456"
                  value={paymentData.cardNumber}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, cardNumber: e.target.value }))}
                />
                <Group grow>
                  <TextInput
                    label="Expiry Date"
                    placeholder="MM/YY"
                    value={paymentData.expiryDate}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, expiryDate: e.target.value }))}
                  />
                  <TextInput
                    label="CVV"
                    placeholder="123"
                    value={paymentData.cvv}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, cvv: e.target.value }))}
                  />
                </Group>
                <TextInput
                  label="Name on Card"
                  placeholder="John Doe"
                  value={paymentData.nameOnCard}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, nameOnCard: e.target.value }))}
                />
              </Stack>
            )}

            <Alert icon={<IconInfoCircle size="1rem" />} color="green">
              <Text size="sm">
                <strong>Demo mode:</strong> This is a mock payment form. No real charges will be made.
              </Text>
            </Alert>
          </Stack>
        );

      case 2:
        return (
          <Stack gap="lg">
            <Box ta="center">
              <IconCheck size={64} color="var(--mantine-color-green-6)" />
              <Title order={2} mt="md">You're All Set!</Title>
              <Text c="dimmed" mt="xs">
                Welcome to professional trading analysis
              </Text>
            </Box>

            <Card withBorder>
              <Title order={4} mb="md">Your First Session is FREE</Title>
              <Group justify="space-between" mb="md">
                <Text>Session Token Usage</Text>
                <Badge color="green">0 / 100,000</Badge>
              </Group>
              <Progress value={0} color="green" size="lg" />
            </Card>

            <Grid>
              <Grid.Col span={4}>
                <Card withBorder ta="center">
                  <IconTool size="2rem" color="var(--mantine-color-blue-6)" />
                  <Text fw={500} mt="xs">133 Tools</Text>
                  <Text size="xs" c="dimmed">Analysis ready</Text>
                </Card>
              </Grid.Col>
              <Grid.Col span={4}>
                <Card withBorder ta="center">
                  <IconChartLine size="2rem" color="var(--mantine-color-green-6)" />
                  <Text fw={500} mt="xs">4 Exchanges</Text>
                  <Text size="xs" c="dimmed">Connected</Text>
                </Card>
              </Grid.Col>
              <Grid.Col span={4}>
                <Card withBorder ta="center">
                  <IconWallet size="2rem" color="var(--mantine-color-orange-6)" />
                  <Text fw={500} mt="xs">$1/Session</Text>
                  <Text size="xs" c="dimmed">Fair pricing</Text>
                </Card>
              </Grid.Col>
            </Grid>

            <Alert icon={<IconInfoCircle size="1rem" />} color="blue">
              <Text size="sm">
                <strong>Pro tip:</strong> Start with BTCUSDT analysis to see all features in action!
              </Text>
            </Alert>
          </Stack>
        );

      default:
        return null;
    }
  };

  return (
    <Container size={600} my={40}>
      <Box ta="center" mb="xl">
        <Title order={1} c="blue">WAIckoff Dashboard</Title>
        <Text c="dimmed" size="sm" mt="sm">
          Complete setup in 3 simple steps
        </Text>
      </Box>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Stepper active={currentStep} mb="xl">
          {ONBOARDING_STEPS.map((step, index) => (
            <Stepper.Step
              key={index}
              label={step.label}
              description={step.description}
            />
          ))}
        </Stepper>

        {renderStepContent()}

        <Group justify="space-between" mt="xl">
          <Button
            variant="subtle"
            onClick={currentStep === 0 ? switchToLogin : handleBack}
          >
            {currentStep === 0 ? 'Back to Login' : 'Back'}
          </Button>
          
          <Button onClick={handleNext}>
            {currentStep === ONBOARDING_STEPS.length - 1 ? 'Start Trading!' : 'Continue'}
          </Button>
        </Group>
      </Paper>
    </Container>
  );
} 
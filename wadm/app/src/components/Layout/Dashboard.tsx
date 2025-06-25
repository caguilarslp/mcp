import {
  AppShell,
  Box,
  Group,
  Title,
  Text,
  Button,
  // Menu,
  // Avatar,
  Badge,
  Card,
  SimpleGrid,
  Progress,
} from '@mantine/core';
import {
  IconKey,
  IconChartLine,
  IconTools,
  IconDatabase,
} from '@tabler/icons-react';
import { useAuthStore } from '../../store';
import { Navbar } from './Navbar';
import { Header } from './Header';
import { IndicatorChart, ChatChart } from '../Charts';

export function Dashboard() {
  const { 
    currentSession, 
    mcpTools, 
    selectedSymbol,
    // logout,
    // currentUser
  } = useAuthStore();

  return (
    <AppShell
      header={{ height: 70 }}
      navbar={{ width: 280, breakpoint: 'md' }}
      padding="md"
    >
      <AppShell.Header>
        <Header />
      </AppShell.Header>

      <AppShell.Navbar>
        <Navbar />
      </AppShell.Navbar>

      <AppShell.Main>
        <Box p="md">
          <Group justify="space-between" mb="xl">
            <div>
              <Title order={2}>Dashboard</Title>
              <Text c="dimmed" size="sm">
                Professional trading analysis for {selectedSymbol}
              </Text>
            </div>
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" mb="xl">
            <Card withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed">Session Status</Text>
                  <Text size="lg" fw={500}>
                    {currentSession?.status || 'Active'}
                  </Text>
                </div>
                <IconChartLine size={32} color="var(--mantine-color-blue-6)" />
              </Group>
            </Card>

            <Card withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed">Tokens Used</Text>
                  <Text size="lg" fw={500}>
                    {currentSession?.tokensUsed || 0} / {currentSession?.tokenLimit || 100000}
                  </Text>
                </div>
                <IconDatabase size={32} color="var(--mantine-color-green-6)" />
              </Group>
              <Progress 
                value={(currentSession?.tokensUsed || 0) / (currentSession?.tokenLimit || 100000) * 100} 
                size="sm" 
                mt="xs" 
              />
            </Card>

            <Card withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed">MCP Tools</Text>
                  <Text size="lg" fw={500}>
                    {mcpTools.length} Available
                  </Text>
                </div>
                <IconTools size={32} color="var(--mantine-color-orange-6)" />
              </Group>
            </Card>

            <Card withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed">Session Cost</Text>
                  <Text size="lg" fw={500}>
                    ${currentSession?.cost || 1}.00
                  </Text>
                </div>
                <IconKey size={32} color="var(--mantine-color-purple-6)" />
              </Group>
            </Card>
          </SimpleGrid>

          {/* Live Market Analysis */}
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg" mb="xl">
            <Card withBorder>
              <Group justify="space-between" mb="md">
                <div>
                  <Title order={3}>Live Chart Analysis</Title>
                  <Text c="dimmed" size="sm">
                    Real-time {selectedSymbol} with AI insights
                  </Text>
                </div>
                <Badge color="green" variant="dot">Live</Badge>
              </Group>
              
              <ChatChart
                symbol={selectedSymbol || 'BTCUSDT'}
                timeframe="60"
                height={300}
                showQuickStats={true}
              />
            </Card>

            <Card withBorder>
              <Title order={3} mb="md">Smart Money Concepts</Title>
              <IndicatorChart
                symbol={selectedSymbol || 'BTCUSDT'}
                indicatorType="smc"
                timeframe="60"
                height={300}
              />
            </Card>
          </SimpleGrid>

          {/* Advanced Indicators */}
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" mb="xl">
            <Card withBorder>
              <Title order={4} mb="md">Volume Profile</Title>
              <IndicatorChart
                symbol={selectedSymbol || 'BTCUSDT'}
                indicatorType="volume-profile"
                timeframe="60"
                height={200}
              />
            </Card>

            <Card withBorder>
              <Title order={4} mb="md">Order Flow</Title>
              <IndicatorChart
                symbol={selectedSymbol || 'BTCUSDT'}
                indicatorType="order-flow"
                timeframe="60"
                height={200}
              />
            </Card>

            <Card withBorder>
              <Title order={4} mb="md">Wyckoff Analysis</Title>
              <IndicatorChart
                symbol={selectedSymbol || 'BTCUSDT'}
                indicatorType="wyckoff"
                timeframe="60"
                height={200}
              />
            </Card>

            <Card withBorder>
              <Title order={4} mb="md">Bollinger Bands</Title>
              <IndicatorChart
                symbol={selectedSymbol || 'BTCUSDT'}
                indicatorType="bollinger"
                timeframe="60"
                height={200}
              />
            </Card>
          </SimpleGrid>

          <Card withBorder>
            <Title order={3} mb="md">Quick Actions</Title>
            <Text c="dimmed" mb="lg">
              Get started with your analysis or manage your account settings.
            </Text>
            <Group>
              <Button variant="filled">Start Analysis</Button>
              <Button variant="outline">Browse Tools</Button>
              <Button variant="light">View Documentation</Button>
            </Group>
          </Card>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
} 
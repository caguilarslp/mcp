import {
  AppShell,
  Box,
  Group,
  Title,
  Text,
  Button,
  Menu,
  Avatar,
  Badge,
  Stack,
  Card,
  SimpleGrid,
  Progress,
  ActionIcon,
} from '@mantine/core';
import {
  IconUser,
  IconLogout,
  IconSettings,
  IconKey,
  IconChartLine,
  IconTools,
  IconDatabase,
} from '@tabler/icons-react';
import { useAuthStore } from '../../store';
import { Navbar } from './Navbar';
import { Header } from './Header';

export function Dashboard() {
  const { 
    currentSession, 
    mcpTools, 
    selectedSymbol,
    logout,
    currentUser
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
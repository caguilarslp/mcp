import {
  Group,
  Title,
  Button,
  Menu,
  Avatar,
  Text,
  Badge,
  Select,
  ActionIcon,
  Burger,
  Box,
} from '@mantine/core';
import {
  IconUser,
  IconLogout,
  IconSettings,
  IconKey,
  IconBell,
  IconMenu2,
} from '@tabler/icons-react';
import { useAppStore } from '../../store';

const SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT',
  'LINKUSDT', 'AVAXUSDT', 'MATICUSDT', 'ATOMUSDT', 'ALGOUSDT'
];

export function Header() {
  const { 
    selectedSymbol, 
    setSelectedSymbol, 
    logout, 
    currentSession,
    sidebarOpen,
    setSidebarOpen
  } = useAppStore();

  return (
    <Group h="100%" px="md" justify="space-between">
      {/* Left side */}
      <Group>
        <Burger
          opened={sidebarOpen}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          size="sm"
          hiddenFrom="md"
        />
        <Title order={3} c="blue">WAIckoff</Title>
        <Badge variant="light" color="green">Live</Badge>
      </Group>

      {/* Center */}
      <Group>
        <Select
          value={selectedSymbol}
          onChange={(value) => value && setSelectedSymbol(value)}
          data={SYMBOLS}
          placeholder="Select Symbol"
          searchable
          size="sm"
          w={120}
        />
      </Group>

      {/* Right side */}
      <Group>
        <ActionIcon variant="subtle" size="lg">
          <IconBell size="1.1rem" />
        </ActionIcon>

        <Menu shadow="md" width={200}>
          <Menu.Target>
            <Button variant="subtle" size="sm" leftSection={<IconUser size="1rem" />}>
              Account
            </Button>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Session Info</Menu.Label>
            <Menu.Item>
              <div>
                <Text size="xs" c="dimmed">Tokens</Text>
                <Text size="sm">
                  {currentSession?.tokensUsed || 0} / {currentSession?.tokenLimit || 100000}
                </Text>
              </div>
            </Menu.Item>
            <Menu.Item>
              <div>
                <Text size="xs" c="dimmed">Status</Text>
                <Text size="sm">{currentSession?.status || 'Active'}</Text>
              </div>
            </Menu.Item>

            <Menu.Divider />

            <Menu.Item leftSection={<IconKey size="1rem" />}>
              API Keys
            </Menu.Item>
            <Menu.Item leftSection={<IconSettings size="1rem" />}>
              Settings
            </Menu.Item>

            <Menu.Divider />

            <Menu.Item 
              color="red" 
              leftSection={<IconLogout size="1rem" />}
              onClick={logout}
            >
              Logout
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
} 
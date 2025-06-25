import {
  Group,
  Title,
  Button,
  Menu,
  Avatar,
  Text,
  Badge,
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
  IconSun,
  IconMoon,
} from '@tabler/icons-react';
import { useAuthStore } from '../../store';

export function Header() {
  const { 
    logout, 
    currentSession,
    sidebarOpen,
    setSidebarOpen,
    theme,
    toggleTheme
  } = useAuthStore();

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

      {/* Center - Chat-First: No symbol dropdown */}
      <Group>
        <Text size="sm" c="dimmed" ta="center">
          💬 Pregunta por cualquier símbolo en el chat
        </Text>
      </Group>

      {/* Right side */}
      <Group>
        <ActionIcon variant="subtle" size="lg">
          <IconBell size="1.1rem" />
        </ActionIcon>

        <ActionIcon 
          variant="subtle" 
          size="lg"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark' ? <IconSun size="1.1rem" /> : <IconMoon size="1.1rem" />}
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
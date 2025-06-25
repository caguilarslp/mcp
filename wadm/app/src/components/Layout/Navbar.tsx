import {
  Stack,
  Text,
  Box,
  Group,
  ThemeIcon,
  UnstyledButton,
  Divider,
  ScrollArea,
  Badge,
} from '@mantine/core';
import {
  IconChartLine,
  IconMessages,
  IconTools,
  IconHistory,
  IconSettings,
  IconBook,
  IconTrendingUp,
  IconExchange,
  IconBrain,
  IconTarget,
} from '@tabler/icons-react';
import { useAuthStore } from '../../store';

const NAVIGATION_ITEMS = [
  { id: 'chat', label: 'Chat Análisis', icon: IconMessages, color: 'blue' },
  { id: 'tools', label: 'MCP Tools', icon: IconTools, color: 'green' },
  { id: 'charts', label: 'Charts', icon: IconChartLine, color: 'orange' },
  { id: 'history', label: 'Historial', icon: IconHistory, color: 'gray' },
];

const MCP_CATEGORIES = [
  { id: 'wyckoff', label: 'Wyckoff Analysis', icon: IconBrain, count: 12 },
  { id: 'smc', label: 'Smart Money', icon: IconTarget, count: 15 },
  { id: 'technical', label: 'Technical Analysis', icon: IconTrendingUp, count: 25 },
  { id: 'multi-exchange', label: 'Multi-Exchange', icon: IconExchange, count: 8 },
];

interface NavItemProps {
  icon: React.FC<any>;
  label: string;
  color: string;
  rightSection?: React.ReactNode;
  onClick?: () => void;
}

function NavItem({ icon: Icon, label, color, rightSection, onClick }: NavItemProps) {
  return (
    <UnstyledButton
      p="sm"
      style={{ borderRadius: 'var(--mantine-radius-sm)' }}
      onClick={onClick}
    >
      <Group>
        <ThemeIcon color={color} variant="light" size="sm">
          <Icon size="1rem" />
        </ThemeIcon>
        <Text size="sm" fw={500}>
          {label}
        </Text>
        {rightSection}
      </Group>
    </UnstyledButton>
  );
}

export function Navbar() {
  const { mcpTools } = useAuthStore();

  const renderNavItem = (item: any, /* level = 0 */) => (
    <NavItem
      key={item.id}
      icon={item.icon}
      label={item.label}
      color={item.color}
      rightSection={
        item.count ? <Badge size="xs" variant="light">{item.count}</Badge> : undefined
      }
    />
  );

  return (
    <Box h="100%" p="md">
      <ScrollArea h="100%">
        <Stack gap="xs">
          {/* Main Navigation */}
          <Box>
            <Text size="xs" tt="uppercase" fw={700} c="dimmed" mb="sm">
              Navegación
            </Text>
            <Stack gap={2}>
              {NAVIGATION_ITEMS.map(renderNavItem)}
            </Stack>
          </Box>

          <Divider my="md" />

          {/* MCP Tools Categories */}
          <Box>
            <Group justify="space-between" mb="sm">
              <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                Herramientas MCP
              </Text>
              <Badge size="xs" variant="light">
                {mcpTools.length}
              </Badge>
            </Group>
            <Stack gap={2}>
              {MCP_CATEGORIES.map(renderNavItem)}
            </Stack>
          </Box>

          <Divider my="md" />

          {/* Settings */}
          <Box>
            <Text size="xs" tt="uppercase" fw={700} c="dimmed" mb="sm">
              Configuración
            </Text>
            <Stack gap={2}>
              <NavItem icon={IconSettings} label="Ajustes" color="gray" />
              <NavItem icon={IconBook} label="Documentación" color="gray" />
            </Stack>
          </Box>
        </Stack>
      </ScrollArea>
    </Box>
  );
} 
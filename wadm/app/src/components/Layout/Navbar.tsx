import {
  Box,
  NavLink,
  Stack,
  Group,
  Text,
  Badge,
  ScrollArea,
} from '@mantine/core';
import {
  IconDashboard,
  IconChartLine,
  IconTools,
  IconKey,
  IconSettings,
  IconDatabase,
  IconAnalyze,
  IconTrendingUp,
  IconVolume,
  IconExchange,
} from '@tabler/icons-react';
import { useAppStore } from '../../store';

const NAVIGATION_ITEMS = [
  {
    label: 'Dashboard',
    icon: IconDashboard,
    active: true,
  },
  {
    label: 'Analysis',
    icon: IconChartLine,
    children: [
      { label: 'Wyckoff Analysis', icon: IconAnalyze },
      { label: 'SMC Analysis', icon: IconTrendingUp },
      { label: 'Technical Indicators', icon: IconChartLine },
      { label: 'Volume Analysis', icon: IconVolume },
      { label: 'Multi-Exchange', icon: IconExchange },
    ],
  },
  {
    label: 'MCP Tools',
    icon: IconTools,
    badge: '133',
    children: [
      { label: 'Wyckoff Tools', icon: IconAnalyze, badge: '25' },
      { label: 'SMC Tools', icon: IconTrendingUp, badge: '31' },
      { label: 'Technical Tools', icon: IconChartLine, badge: '28' },
      { label: 'Volume Tools', icon: IconVolume, badge: '22' },
      { label: 'Multi-Exchange Tools', icon: IconExchange, badge: '27' },
    ],
  },
  {
    label: 'Data',
    icon: IconDatabase,
    children: [
      { label: 'Market Data', icon: IconDatabase },
      { label: 'Analysis History', icon: IconChartLine },
      { label: 'Exports', icon: IconDatabase },
    ],
  },
  {
    label: 'Account',
    icon: IconKey,
    children: [
      { label: 'API Keys', icon: IconKey },
      { label: 'Sessions', icon: IconDatabase },
      { label: 'Settings', icon: IconSettings },
    ],
  },
];

export function Navbar() {
  const { mcpTools } = useAppStore();

  const renderNavItem = (item: any, level = 0) => (
    <NavLink
      key={item.label}
      label={item.label}
      leftSection={<item.icon size="1rem" />}
      rightSection={
        item.badge ? (
          <Badge size="xs" variant="filled" color="blue">
            {item.badge}
          </Badge>
        ) : null
      }
      active={item.active}
      variant="subtle"
      style={{ paddingLeft: level * 16 + 12 }}
    >
      {item.children?.map((child: any) => renderNavItem(child, level + 1))}
    </NavLink>
  );

  return (
    <Box p="md" h="100%">
      <ScrollArea h="calc(100vh - 120px)">
        <Stack gap="xs">
          <Group mb="md">
            <Text size="sm" fw={500} c="dimmed">
              NAVIGATION
            </Text>
          </Group>

          {NAVIGATION_ITEMS.map((item) => renderNavItem(item))}

          <Group mt="lg" mb="sm">
            <Text size="sm" fw={500} c="dimmed">
              QUICK STATS
            </Text>
          </Group>

          <Box p="sm" style={{ backgroundColor: 'var(--mantine-color-gray-0)', borderRadius: 'var(--mantine-radius-sm)' }}>
            <Group justify="space-between" mb="xs">
              <Text size="xs" c="dimmed">Tools Available</Text>
              <Badge size="xs" variant="light">
                {mcpTools.length}
              </Badge>
            </Group>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">Connection</Text>
              <Badge size="xs" color="green" variant="light">
                Online
              </Badge>
            </Group>
          </Box>
        </Stack>
      </ScrollArea>
    </Box>
  );
} 
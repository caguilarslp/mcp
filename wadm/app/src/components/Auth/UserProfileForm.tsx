import { useState } from 'react';
import {
  Stack,
  Title,
  Text,
  Select,
  MultiSelect,
  Radio,
  Group,
  Button,
  Card,
  Badge,
  Checkbox,
  Textarea,
  Grid,
  Progress,
  Alert,
} from '@mantine/core';
import { IconInfoCircle, IconTarget, IconBrain } from '@tabler/icons-react';
import { useAuthStore } from '../../store';
import type { UserProfile } from '../../types';

interface UserProfileFormProps {
  onComplete: () => void;
  onBack: () => void;
}

const UserProfileForm = ({ onComplete, onBack }: UserProfileFormProps) => {
  const { onboardingData, updateUserProfile } = useAuthStore();
  const [profile, setProfile] = useState<Partial<UserProfile>>(onboardingData.userProfile || {});
  const [currentSection, setCurrentSection] = useState(0);
  
  const sections = [
    { title: 'Experiencia', icon: IconBrain },
    { title: 'Objetivos', icon: IconTarget },
    { title: 'Preferencias', icon: IconInfoCircle },
  ];

  const handleNext = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
    } else {
      updateUserProfile(profile);
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    } else {
      onBack();
    }
  };

  const isCurrentSectionValid = () => {
    switch (currentSection) {
      case 0:
        return profile.tradingExperience && profile.capitalRange && profile.riskTolerance;
      case 1:
        return profile.tradingStyle && profile.primaryGoal && profile.preferredTimeframes?.length;
      case 2:
        return profile.preferredInstruments?.length && profile.learningFocus?.length;
      default:
        return false;
    }
  };

  const renderSection = () => {
    switch (currentSection) {
      case 0:
        return (
          <Stack gap="md">
            <Alert icon={<IconBrain size={16} />} color="blue" variant="light">
              Esta información ayudará al AI a personalizar tus análisis y estrategias
            </Alert>
            
            <Select
              label="¿Cuál es tu experiencia en trading?"
              placeholder="Selecciona tu nivel"
              value={profile.tradingExperience}
              onChange={(value) => setProfile({ ...profile, tradingExperience: value as any })}
              data={[
                { value: 'beginner', label: '🌱 Principiante (< 6 meses)' },
                { value: 'intermediate', label: '📈 Intermedio (6 meses - 2 años)' },
                { value: 'advanced', label: '🎯 Avanzado (2-5 años)' },
                { value: 'professional', label: '💎 Profesional (5+ años)' },
              ]}
              required
            />

            <Select
              label="Capital aproximado de trading"
              placeholder="Selecciona un rango"
              value={profile.capitalRange}
              onChange={(value) => setProfile({ ...profile, capitalRange: value as any })}
              data={[
                { value: 'under-1k', label: '💵 Menos de $1,000' },
                { value: '1k-10k', label: '💰 $1,000 - $10,000' },
                { value: '10k-50k', label: '🏦 $10,000 - $50,000' },
                { value: '50k-100k', label: '💎 $50,000 - $100,000' },
                { value: 'over-100k', label: '🚀 Más de $100,000' },
              ]}
              required
            />

            <Radio.Group
              label="Tolerancia al riesgo"
              value={profile.riskTolerance}
              onChange={(value) => setProfile({ ...profile, riskTolerance: value as any })}
              required
            >
              <Group mt="xs">
                <Radio value="conservative" label="🛡️ Conservador (1-2% por trade)" />
                <Radio value="moderate" label="⚖️ Moderado (2-5% por trade)" />
                <Radio value="aggressive" label="🔥 Agresivo (5%+ por trade)" />
              </Group>
            </Radio.Group>
          </Stack>
        );

      case 1:
        return (
          <Stack gap="md">
            <Select
              label="¿Cuál es tu estilo de trading principal?"
              placeholder="Selecciona tu estilo"
              value={profile.tradingStyle}
              onChange={(value) => setProfile({ ...profile, tradingStyle: value as any })}
              data={[
                { value: 'scalping', label: '⚡ Scalping (segundos a minutos)' },
                { value: 'day-trading', label: '📊 Day Trading (horas, sin overnight)' },
                { value: 'swing-trading', label: '🌊 Swing Trading (días a semanas)' },
                { value: 'position-trading', label: '📈 Position Trading (semanas a meses)' },
              ]}
              required
            />

            <Select
              label="¿Cuál es tu objetivo principal?"
              placeholder="Selecciona tu objetivo"
              value={profile.primaryGoal}
              onChange={(value) => setProfile({ ...profile, primaryGoal: value as any })}
              data={[
                { value: 'consistent-income', label: '💰 Ingresos consistentes' },
                { value: 'capital-growth', label: '📈 Crecimiento de capital' },
                { value: 'learning', label: '🎓 Aprender trading profesional' },
                { value: 'portfolio-hedge', label: '🛡️ Cobertura de portfolio' },
              ]}
              required
            />

            <MultiSelect
              label="Timeframes que prefieres analizar"
              placeholder="Selecciona los timeframes"
              value={profile.preferredTimeframes || []}
              onChange={(values) => setProfile({ ...profile, preferredTimeframes: values as any })}
              data={[
                { value: '1m', label: '1 Minuto' },
                { value: '5m', label: '5 Minutos' },
                { value: '15m', label: '15 Minutos' },
                { value: '1h', label: '1 Hora' },
                { value: '4h', label: '4 Horas' },
                { value: '1d', label: '1 Día' },
                { value: '1w', label: '1 Semana' },
              ]}
              required
              maxValues={3}
            />
          </Stack>
        );

      case 2:
        return (
          <Stack gap="md">
            <MultiSelect
              label="¿Qué instrumentos te interesan?"
              placeholder="Selecciona los mercados"
              value={profile.preferredInstruments || []}
              onChange={(values) => setProfile({ ...profile, preferredInstruments: values as any })}
              data={[
                { value: 'crypto', label: '₿ Criptomonedas' },
                { value: 'forex', label: '💱 Forex' },
                { value: 'stocks', label: '📊 Acciones' },
                { value: 'commodities', label: '🥇 Commodities' },
              ]}
              required
              maxValues={2}
            />

            <MultiSelect
              label="¿Qué te gustaría aprender o mejorar?"
              placeholder="Selecciona áreas de interés"
              value={profile.learningFocus || []}
              onChange={(values) => setProfile({ ...profile, learningFocus: values as any })}
              data={[
                { value: 'wyckoff', label: '🧠 Metodología Wyckoff' },
                { value: 'smc', label: '🏦 Smart Money Concepts (SMC)' },
                { value: 'technical-analysis', label: '📈 Análisis Técnico' },
                { value: 'risk-management', label: '🛡️ Gestión de Riesgo' },
                { value: 'psychology', label: '🧘 Psicología de Trading' },
              ]}
              required
              maxValues={3}
            />

            <Select
              label="¿Qué profundidad de análisis prefieres?"
              placeholder="Selecciona tu preferencia"
              value={profile.preferredAnalysisDepth}
              onChange={(value) => setProfile({ ...profile, preferredAnalysisDepth: value as any })}
              data={[
                { value: 'quick-insights', label: '⚡ Insights rápidos (2-3 min)' },
                { value: 'detailed-analysis', label: '🔍 Análisis detallado (5-10 min)' },
                { value: 'comprehensive-research', label: '📚 Investigación completa (15+ min)' },
              ]}
            />

            <Textarea
              label="¿Tienes algún desafío específico? (opcional)"
              placeholder="Ej: Me cuesta identificar zonas de entrada, gestionar emociones, etc."
              value={profile.currentChallenges?.join(', ') || ''}
              onChange={(e) => setProfile({ 
                ...profile, 
                currentChallenges: e.target.value ? e.target.value.split(', ') : [] 
              })}
              maxRows={3}
            />
          </Stack>
        );

      default:
        return null;
    }
  };

  return (
    <Card shadow="sm" padding="xl" radius="md">
      <Stack gap="xl">
        <div>
          <Title order={2}>Personaliza tu experiencia</Title>
          <Text size="sm" c="dimmed">
            Configura tu perfil para recibir análisis y estrategias personalizadas
          </Text>
        </div>

        <Progress 
          value={((currentSection + 1) / sections.length) * 100} 
          color="blue"
          size="sm"
        />

        <Grid>
          {sections.map((section, index) => (
            <Grid.Col span={4} key={index}>
              <Group gap="xs">
                <section.icon 
                  size={16} 
                  color={index === currentSection ? 'blue' : index < currentSection ? 'green' : 'gray'} 
                />
                <Text 
                  size="sm" 
                  fw={index === currentSection ? 600 : 400}
                  c={index === currentSection ? 'blue' : index < currentSection ? 'green' : 'dimmed'}
                >
                  {section.title}
                </Text>
              </Group>
            </Grid.Col>
          ))}
        </Grid>

        {renderSection()}

        <Group justify="apart">
          <Button variant="subtle" onClick={handleBack}>
            {currentSection === 0 ? 'Volver' : 'Anterior'}
          </Button>
          
          <Button 
            onClick={handleNext}
            disabled={!isCurrentSectionValid()}
          >
            {currentSection === sections.length - 1 ? 'Completar Perfil' : 'Siguiente'}
          </Button>
        </Group>

        {currentSection === sections.length - 1 && (
          <Alert color="green" variant="light">
            ¡Perfecto! Con esta información el AI podrá darte análisis específicos para tu perfil y objetivos.
          </Alert>
        )}
      </Stack>
    </Card>
  );
};

export default UserProfileForm; 
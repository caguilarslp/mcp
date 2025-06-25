// API Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// User Authentication Types
export interface User {
  id: string;
  email: string;
  fullName: string;
  company?: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  lastLoginAt: string;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  company?: string;
  acceptTerms: boolean;
}

export interface LoginData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface TwoFactorData {
  code: string;
  email: string;
}

export interface PasswordResetData {
  email: string;
  code?: string;
  newPassword?: string;
}

// Legacy API Key Types (for internal use)
export interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  usage: {
    requests: number;
    limit: number;
  };
  createdAt: string;
  active: boolean;
}

export interface Session {
  id: string;
  userId: string;
  tokensUsed: number;
  tokenLimit: number;
  timeRemaining: number;
  cost: number;
  status: 'active' | 'expired' | 'suspended';
  createdAt: string;
}

// Onboarding Types
export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

export interface PaymentSetup {
  method: 'card' | 'paypal';
  cardLast4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  verified: boolean;
}

// MCP Tool Types
export interface MCPTool {
  id: string;
  name: string;
  description: string;
  category: 'wyckoff' | 'smc' | 'technical' | 'volume' | 'multi-exchange';
  parameters: MCPParameter[];
  examples?: any[];
}

export interface MCPParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  required: boolean;
  description: string;
  options?: string[];
  default?: any;
}

// Market Data Types
export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
} 
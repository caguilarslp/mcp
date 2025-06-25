import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ApiKey, Session, MCPTool, User, SignUpData, LoginData, TwoFactorData, UserProfile, OnboardingData } from '../types';
import { apiService } from '../services/api';

interface AppState {
  // Authentication
  isAuthenticated: boolean;
  currentUser: User | null;
  currentApiKey: string | null;
  apiKeys: ApiKey[];
  currentSession: Session | null;
  
  // Auth Flow
  authStep: 'login' | 'signup' | '2fa' | 'onboarding' | 'dashboard';
  pendingEmail: string | null;
  
  // MCP Tools
  mcpTools: MCPTool[];
  toolsLoading: boolean;
  
  // UI State
  sidebarOpen: boolean;
  selectedSymbol: string;
  theme: 'light' | 'dark';
  
  // User Profile & Onboarding
  twoFactorData: TwoFactorData | null;
  userProfile: UserProfile | null;
  onboardingData: OnboardingData;
  
  // Actions
  login: (data: LoginData) => Promise<boolean>;
  signUp: (data: SignUpData) => Promise<boolean>;
  verify2FA: (code: string) => Promise<boolean>;
  logout: () => void;
  switchToLogin: () => void;
  switchToSignUp: () => void;
  fetchApiKeys: () => Promise<void>;
  fetchCurrentSession: () => Promise<void>;
  fetchMCPTools: () => Promise<void>;
  setSidebarOpen: (open: boolean) => void;
  setSelectedSymbol: (symbol: string) => void;
  toggleTheme: () => void;
  setTwoFactorData: (data: TwoFactorData | null) => void;
  
  // Profile Actions
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  setOnboardingStep: (step: number) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

export const useAuthStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      currentUser: null,
      currentApiKey: null,
      apiKeys: [],
      currentSession: null,
      authStep: 'login',
      pendingEmail: null,
      mcpTools: [],
      toolsLoading: false,
      sidebarOpen: true,
      selectedSymbol: 'BTCUSDT',
      theme: 'dark',
      
      // User Profile & Onboarding
      twoFactorData: null,
      userProfile: null,
      onboardingData: {
        step: 1,
        userProfile: {},
        isComplete: false,
        paymentSetup: false,
      },

      // Actions
      login: async (data: LoginData) => {
        try {
          // MOCK: Simulate login (replace with real API call)
          console.log('Mock login:', data);
          
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Mock successful login
          const mockUser: User = {
            id: '1',
            email: data.email,
            fullName: 'John Doe',
            company: 'Test Company',
            emailVerified: true,
            twoFactorEnabled: true,
            onboardingCompleted: true,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };

          set({ 
            currentUser: mockUser,
            pendingEmail: data.email,
            authStep: mockUser.twoFactorEnabled ? '2fa' : 'dashboard'
          });
          
          return true;
        } catch (error) {
          console.error('Login failed:', error);
          return false;
        }
      },

      signUp: async (data: SignUpData) => {
        try {
          // MOCK: Simulate signup (replace with real API call)
          console.log('Mock signup:', data);
          
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Mock successful signup
          set({ 
            pendingEmail: data.email,
            authStep: '2fa'
          });
          
          // Mock email sent notification
          console.log('Mock: Email verification sent to', data.email);
          
          return true;
        } catch (error) {
          console.error('Signup failed:', error);
          return false;
        }
      },

      verify2FA: async (code: string) => {
        try {
          // MOCK: Simulate 2FA verification
          console.log('Mock 2FA verification:', code);
          
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Mock successful verification
          if (code === '123456' || code.length === 6) {
            const mockUser: User = {
              id: '1',
              email: get().pendingEmail || 'user@example.com',
              fullName: 'John Doe',
              company: 'Test Company',
              emailVerified: true,
              twoFactorEnabled: true,
              onboardingCompleted: false,
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            };

            set({ 
              isAuthenticated: true,
              currentUser: mockUser,
              authStep: mockUser.onboardingCompleted ? 'dashboard' : 'onboarding'
            });
            
            // Fetch initial data
            get().fetchMCPTools();
            
            return true;
          }
          return false;
        } catch (error) {
          console.error('2FA verification failed:', error);
          return false;
        }
      },

      logout: () => {
        apiService.clearApiKey();
        set({
          isAuthenticated: false,
          currentUser: null,
          currentApiKey: null,
          apiKeys: [],
          currentSession: null,
          mcpTools: [],
          authStep: 'login',
          pendingEmail: null,
        });
      },

      switchToLogin: () => set({ authStep: 'login' }),
      switchToSignUp: () => set({ authStep: 'signup' }),

      fetchApiKeys: async () => {
        try {
          const result = await apiService.getApiKeys();
          if (result.success && result.data) {
            set({ apiKeys: result.data });
          }
        } catch (error) {
          console.error('Failed to fetch API keys:', error);
        }
      },

      fetchCurrentSession: async () => {
        try {
          const result = await apiService.getCurrentSession();
          if (result.success && result.data) {
            set({ currentSession: result.data });
          }
        } catch (error) {
          console.error('Failed to fetch current session:', error);
        }
      },

      fetchMCPTools: async () => {
        set({ toolsLoading: true });
        try {
          const result = await apiService.getMCPTools();
          if (result.success && result.data) {
            set({ mcpTools: result.data });
          }
        } catch (error) {
          console.error('Failed to fetch MCP tools:', error);
        } finally {
          set({ toolsLoading: false });
        }
      },

      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
      setSelectedSymbol: (symbol: string) => set({ selectedSymbol: symbol }),
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'light' ? 'dark' : 'light' 
      })),

      setTwoFactorData: (data) => set({ twoFactorData: data }),
      
      // Profile Actions
      updateUserProfile: (profile) => set((state) => ({
        userProfile: state.userProfile ? { ...state.userProfile, ...profile } : profile as UserProfile,
        onboardingData: {
          ...state.onboardingData,
          userProfile: { ...state.onboardingData.userProfile, ...profile }
        }
      })),
      
      setOnboardingStep: (step) => set((state) => ({
        onboardingData: { ...state.onboardingData, step }
      })),
      
      completeOnboarding: () => set((state) => ({
        onboardingData: { ...state.onboardingData, isComplete: true },
        userProfile: state.onboardingData.userProfile as UserProfile
      })),
      
      resetOnboarding: () => set({
        onboardingData: {
          step: 1,
          userProfile: {},
          isComplete: false,
          paymentSetup: false,
        }
      }),
    }),
    {
      name: 'wadm-dashboard',
      partialize: (state) => ({
        currentApiKey: state.currentApiKey,
        selectedSymbol: state.selectedSymbol,
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
); 
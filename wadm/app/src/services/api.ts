import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { ApiResponse, ApiKey, Session, MCPTool } from '../types';

class ApiService {
  private api: AxiosInstance;
  private apiKey: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include API key
    this.api.interceptors.request.use((config) => {
      if (this.apiKey) {
        config.headers['X-API-Key'] = this.apiKey;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  clearApiKey() {
    this.apiKey = null;
  }

  // Authentication
  async validateApiKey(key: string): Promise<ApiResponse<boolean>> {
    try {
      const response = await this.api.get('/api/v1/auth/validate', {
        headers: { 'X-API-Key': key }
      });
      return response.data;
    } catch (error) {
      return { success: false, error: 'Invalid API key' };
    }
  }

  async getApiKeys(): Promise<ApiResponse<ApiKey[]>> {
    try {
      const response = await this.api.get('/api/v1/auth/keys');
      return response.data;
    } catch (error) {
      return { success: false, error: 'Failed to fetch API keys' };
    }
  }

  async createApiKey(name: string, permissions: string[]): Promise<ApiResponse<ApiKey>> {
    try {
      const response = await this.api.post('/api/v1/auth/keys', {
        name,
        permissions
      });
      return response.data;
    } catch (error) {
      return { success: false, error: 'Failed to create API key' };
    }
  }

  // Sessions
  async getCurrentSession(): Promise<ApiResponse<Session>> {
    try {
      const response = await this.api.get('/api/v1/auth/session');
      return response.data;
    } catch (error) {
      return { success: false, error: 'Failed to fetch session' };
    }
  }

  // MCP Tools
  async getMCPTools(): Promise<ApiResponse<MCPTool[]>> {
    try {
      const response = await this.api.get('/api/v1/mcp/tools');
      return response.data;
    } catch (error) {
      return { success: false, error: 'Failed to fetch MCP tools' };
    }
  }

  async executeMCPTool(toolName: string, parameters: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post(`/api/v1/mcp/execute/${toolName}`, parameters);
      return response.data;
    } catch (error) {
      return { success: false, error: 'Failed to execute MCP tool' };
    }
  }

  // Market Data
  async getMarketData(symbol: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get(`/api/v1/market/${symbol}`);
      return response.data;
    } catch (error) {
      return { success: false, error: 'Failed to fetch market data' };
    }
  }
}

export const apiService = new ApiService(); 
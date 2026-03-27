/**
 * API Service - Connects to .NET Web API backend
 * Fetches real-time PLC data from PostgreSQL database
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5200';

export interface LatestPlcValue {
  address: string;
  value: string;
  timestamp: Date;
}

export interface TimeSeriesData {
  timestamp: Date;
  value: string;
}

export interface PlcValuesResponse {
  values: LatestPlcValue[];
  total: number;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  private async fetchApi<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = localStorage.getItem('plc_gateway_token');

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Get latest value for each PLC address
   */
  async getLatestValues(): Promise<PlcValuesResponse> {
    const data = await this.fetchApi<{ Values: LatestPlcValue[]; Total: number }>('/api/plc/latest');

    // Convert timestamp strings to Date objects
    // Handle both lowercase and uppercase property names (API uses Values, we normalize to values)
    const values = data.Values || (data as any).values || [];
    return {
      values: values.map((v: any) => ({
        ...v,
        timestamp: new Date(v.timestamp),
      })),
      total: data.Total || values.length,
    };
  }

  /**
   * Get time-series data for a specific PLC address
   */
  async getTimeSeries(address: string, limit: number = 100): Promise<TimeSeriesData[]> {
    const data = await this.fetchApi<TimeSeriesData[]>(
      `/api/plc/timeseries/${encodeURIComponent(address)}?limit=${limit}`
    );

    // Convert timestamp strings to Date objects
    return data.map(item => ({
      ...item,
      timestamp: new Date(item.timestamp),
    }));
  }

  /**
   * Get all PLC values with pagination
   */
  async getAllValues(page: number = 1, pageSize: number = 50) {
    return this.fetchApi(`/api/plc/values?page=${page}&pageSize=${pageSize}`);
  }

  /**
   * Get list of unique PLC addresses
   */
  async getAddresses(): Promise<string[]> {
    return this.fetchApi<string[]>('/api/plc/addresses');
  }

  /**
   * Get data from calculated_metrics table
   */
  async getCalculatedMetrics(): Promise<any[]> {
    return this.fetchApi<any[]>('/api/plc/metrics');
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; database: string; timestamp: string }> {
    return this.fetchApi('/api/plc/health');
  }
}

// Singleton instance
export const apiService = new ApiService();


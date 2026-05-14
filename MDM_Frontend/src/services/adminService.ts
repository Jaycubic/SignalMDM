import { api } from './api';

export interface HealthComponent {
    name: string;
    status: 'UP' | 'DOWN' | 'DEGRADED';
    latency?: string;
}

export interface HealthMetrics {
    total_tenants: number;
    total_sources: number;
    total_ingestion_runs: number;
}

export interface SystemHealthData {
    components: HealthComponent[];
    metrics: HealthMetrics;
    timestamp: number;
    environment: string;
}

export const adminService = {
    getSystemHealth: async () => {
        const res = await api.get<SystemHealthData>('/admin/health');
        return res.data;
    }
};

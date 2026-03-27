import * as signalR from '@microsoft/signalr';
import type { LatestPlcValue } from './apiService';

class SignalRService {
    private connection: signalR.HubConnection | null = null;
    private isConnecting: boolean = false;
    private callbacks: ((values: LatestPlcValue[]) => void)[] = [];
    private retryCount: number = 0;
    private maxRetryDelay: number = 30000; // Max 30 seconds

    constructor() {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5200';
        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(`${apiUrl}/plchub`, {
                accessTokenFactory: () => localStorage.getItem('plc_gateway_token') || ''
            })
            .withAutomaticReconnect({
                nextRetryDelayInMilliseconds: retryContext => {
                    if (retryContext.elapsedMilliseconds < 60000) {
                        return Math.random() * 10000;
                    }
                    return 30000;
                }
            })
            .configureLogging(signalR.LogLevel.Warning) // Reduce noise
            .build();

        this.connection.on('ReceiveLatestValues', (values: LatestPlcValue[]) => {
            this.callbacks.forEach(callback => callback(values));
        });
    }

    public async start() {
        if (this.isConnecting) return;
        if (this.connection?.state === signalR.HubConnectionState.Connected) return;

        try {
            this.isConnecting = true;
            await this.connection?.start();
            console.log('✅ SignalR Connected.');
            this.retryCount = 0;
        } catch (err) {
            this.retryCount++;
            const delay = Math.min(Math.pow(2, this.retryCount) * 1000, this.maxRetryDelay);

            // Only log as error occasionally to reduce noise
            if (this.retryCount % 5 === 1) {
                console.warn(`⚠️ SignalR connection attempt ${this.retryCount} failed. Retrying in ${delay / 1000}s...`);
            }

            setTimeout(() => this.start(), delay);
        } finally {
            this.isConnecting = false;
        }
    }

    public subscribe(callback: (values: LatestPlcValue[]) => void) {
        this.callbacks.push(callback);
    }

    public unsubscribe(callback: (values: LatestPlcValue[]) => void) {
        this.callbacks = this.callbacks.filter(cb => cb !== callback);
    }

    public getConnectionState() {
        return this.connection?.state;
    }
}

export const signalRService = new SignalRService();

import * as signalR from '@microsoft/signalr';
import type { LatestPlcValue } from './apiService';

class SignalRService {
    private connection: signalR.HubConnection | null = null;
    private isConnecting: boolean = false;
    private callbacks: ((values: LatestPlcValue[]) => void)[] = [];
    private connectionCallbacks: ((state: signalR.HubConnectionState) => void)[] = [];
    private retryCount: number = 0;
    private maxRetryDelay: number = 30000;

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
            .configureLogging(signalR.LogLevel.Warning)
            .build();

        this.connection.on('ReceiveLatestValues', (values: LatestPlcValue[]) => {
            this.callbacks.forEach(cb => cb(values));
        });

        // Notify subscribers on reconnect/disconnect
        this.connection.onreconnected(() => {
            this.retryCount = 0;
            this.notifyConnectionChange();
        });
        this.connection.onreconnecting(() => this.notifyConnectionChange());
        this.connection.onclose(() => this.notifyConnectionChange());
    }

    private notifyConnectionChange() {
        const state = this.connection?.state ?? signalR.HubConnectionState.Disconnected;
        this.connectionCallbacks.forEach(cb => cb(state));
    }

    public async start() {
        if (this.isConnecting) return;
        if (this.connection?.state === signalR.HubConnectionState.Connected) return;

        try {
            this.isConnecting = true;
            await this.connection?.start();
            this.retryCount = 0;
            this.notifyConnectionChange();
        } catch (err) {
            this.retryCount++;
            const delay = Math.min(Math.pow(2, this.retryCount) * 1000, this.maxRetryDelay);
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

    public onConnectionChange(callback: (state: signalR.HubConnectionState) => void) {
        this.connectionCallbacks.push(callback);
    }

    public offConnectionChange(callback: (state: signalR.HubConnectionState) => void) {
        this.connectionCallbacks = this.connectionCallbacks.filter(cb => cb !== callback);
    }

    public getConnectionState() {
        return this.connection?.state ?? signalR.HubConnectionState.Disconnected;
    }

    public isConnected() {
        return this.connection?.state === signalR.HubConnectionState.Connected;
    }
}

export const signalRService = new SignalRService();

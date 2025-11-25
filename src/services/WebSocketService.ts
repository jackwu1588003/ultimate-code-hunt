type MessageHandler = (data: any) => void;

class WebSocketService {
    private ws: WebSocket | null = null;
    private url: string;
    private handlers: MessageHandler[] = [];
    private reconnectInterval: number = 3000;
    private shouldReconnect: boolean = true;

    constructor() {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = import.meta.env.VITE_API_URL
            ? new URL(import.meta.env.VITE_API_URL).host
            : "localhost:8000";
        this.url = `${protocol}//${host}/ws`;
    }

    connect(clientType: string) {
        if (this.ws) {
            this.ws.close();
        }
        this.shouldReconnect = true;
        this.ws = new WebSocket(`${this.url}/${clientType}`);

        this.ws.onopen = () => {
            console.log("WebSocket connected");
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handlers.forEach((handler) => handler(data));
            } catch (e) {
                console.error("Failed to parse WebSocket message", e);
            }
        };

        this.ws.onclose = () => {
            console.log("WebSocket disconnected");
            if (this.shouldReconnect) {
                setTimeout(() => this.connect(clientType), this.reconnectInterval);
            }
        };

        this.ws.onerror = (error) => {
            console.error("WebSocket error", error);
        };
    }

    disconnect() {
        this.shouldReconnect = false;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    subscribe(handler: MessageHandler) {
        this.handlers.push(handler);
        return () => {
            this.handlers = this.handlers.filter((h) => h !== handler);
        };
    }
}

export const webSocketService = new WebSocketService();

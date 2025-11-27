type MessageHandler = (data: any) => void;

type ConnectionEntry = {
    ws: WebSocket;
    handlers: MessageHandler[];
    shouldReconnect: boolean;
    reconnectInterval: number;
    refCount: number;
    debounceTimer: number | null;
    lastMessage: any | null;
};

class WebSocketService {
    private connections: Record<string, ConnectionEntry> = {};
    private baseUrl: string;

    constructor() {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = import.meta.env.VITE_API_URL
            ? new URL(import.meta.env.VITE_API_URL).host
            : "localhost:8000";
        this.baseUrl = `${protocol}//${host}/ws`;
    }

    connect(clientType: string, options?: { debounceMs?: number }) {
        // If already connected to this clientType, just increase refCount and return
        const key = clientType;
        if (this.connections[key]) {
            this.connections[key].refCount += 1;
            // update debounce if provided
            if (options && typeof options.debounceMs === 'number') {
                // @ts-ignore
                this.connections[key].debounceTimer = null; // reset timer
                // store debounce on the entry
                // @ts-ignore
                (this.connections[key] as any).debounceMs = options.debounceMs;
            }
            return;
        }

        const ws = new WebSocket(`${this.baseUrl}/${clientType}`);
        const entry: ConnectionEntry & { debounceMs?: number } = {
            ws,
            handlers: [],
            shouldReconnect: true,
            reconnectInterval: 3000,
            refCount: 1,
            debounceTimer: null,
            lastMessage: null,
        };

        // attach optional debounceMs
        if (options && typeof options.debounceMs === 'number') {
            (entry as any).debounceMs = options.debounceMs;
        }

        ws.onopen = () => {
            console.log(`WebSocket connected: ${clientType}`);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // Debounce/merge rapid messages: keep latest and dispatch after short delay
                entry.lastMessage = data;
                if (entry.debounceTimer) {
                    window.clearTimeout(entry.debounceTimer);
                }
                const debounceMs = (entry as any).debounceMs ?? 120;
                entry.debounceTimer = window.setTimeout(() => {
                    const msg = entry.lastMessage;
                    entry.lastMessage = null;
                    entry.debounceTimer = null;
                    entry.handlers.slice().forEach((h) => {
                        try {
                            h(msg);
                        } catch (e) {
                            console.error("WebSocket handler error", e);
                        }
                    });
                }, 120); // 120ms debounce to reduce UI thrash on mobile
            } catch (e) {
                console.error("Failed to parse WebSocket message", e);
            }
        };

        ws.onclose = () => {
            console.log(`WebSocket disconnected: ${clientType}`);
            if (entry.shouldReconnect) {
                setTimeout(() => {
                    // Clean up old entry before reconnect
                    delete this.connections[key];
                    this.connect(clientType);
                }, entry.reconnectInterval);
            } else {
                // normal close, remove entry
                if (this.connections[key]) delete this.connections[key];
            }
        };

        ws.onerror = (error) => {
            console.error(`WebSocket error (${clientType})`, error);
        };

        this.connections[key] = entry;
    }

    disconnect(clientType?: string) {
        if (clientType) {
            const entry = this.connections[clientType];
            if (!entry) return;
            entry.refCount = Math.max(0, entry.refCount - 1);
            if (entry.refCount === 0) {
                entry.shouldReconnect = false;
                try {
                    entry.ws.close();
                } catch (e) {
                    /* ignore */
                }
                delete this.connections[clientType];
            }
        } else {
            // disconnect all
            Object.keys(this.connections).forEach((k) => {
                const e = this.connections[k];
                e.shouldReconnect = false;
                try { e.ws.close(); } catch (err) {}
                delete this.connections[k];
            });
        }
    }

    subscribe(handler: MessageHandler, clientType?: string) {
        // If clientType provided, attach there. If not and only one connection exists, attach to it.
        let entry: ConnectionEntry | undefined;
        if (clientType) {
            entry = this.connections[clientType];
            if (!entry) {
                // auto connect if not present
                this.connect(clientType);
                entry = this.connections[clientType];
            }
        } else {
            const keys = Object.keys(this.connections);
            if (keys.length === 1) {
                entry = this.connections[keys[0]];
            } else if (keys.length === 0) {
                console.warn("No active WebSocket connection to subscribe to (no clientType provided)");
                return () => {};
            } else {
                console.warn("Multiple WebSocket connections active; please provide clientType to subscribe");
                return () => {};
            }
        }

        if (!entry) return () => {};

        entry.handlers.push(handler);

        return () => {
            entry!.handlers = entry!.handlers.filter((h) => h !== handler);
        };
    }

    // Allow adjusting debounce time for a given clientType after connection
    setDebounce(clientType: string, ms: number) {
        const entry = this.connections[clientType];
        if (!entry) {
            console.warn(`No websocket entry for ${clientType}`);
            return;
        }
        // @ts-ignore
        (entry as any).debounceMs = ms;
    }
}

export const webSocketService = new WebSocketService();

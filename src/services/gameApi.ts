import {
  StartGameRequest,
  StartGameResponse,
  CallNumberRequest,
  CallNumberResponse,
  PassRequest,
  PassResponse,
  ReverseRequest,
  ReverseResponse,
  GameState,
} from "@/types/game";

export interface Room {
  room_id: number;
  name: string;
  status: 'waiting' | 'playing' | 'full';
  player_count: number;
  max_players: number;
  players: any[]; // refined type later
  game_id?: string;
  has_password?: boolean;
  host_id?: number;
}

export interface JoinRoomResponse {
  success: boolean;
  player: any;
  room: Room;
}

// 自動處理 API base URL
let API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
// 如果環境變數沒有以 /api 結尾，自動添加
if (API_BASE_URL && !API_BASE_URL.endsWith('/api')) {
  API_BASE_URL = API_BASE_URL.replace(/\/$/, '') + '/api';
}

// Helper to get or generate player UUID
const getPlayerUUID = (): string => {
  let uuid = localStorage.getItem('player_uuid');
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem('player_uuid', uuid);
  }
  return uuid;
};

export const gameApi = {
  async startGame(request: StartGameRequest): Promise<StartGameResponse> {
    const response = await fetch(`${API_BASE_URL}/game/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to start game");
    return response.json();
  },

  async callNumbers(request: CallNumberRequest): Promise<CallNumberResponse> {
    const response = await fetch(`${API_BASE_URL}/game/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to call numbers");
    return response.json();
  },

  async pass(request: PassRequest): Promise<PassResponse> {
    console.log("Pass Request:", request);
    const response = await fetch(`${API_BASE_URL}/game/pass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Pass Error:", errorData);
      throw new Error("Failed to pass");
    }
    return response.json();
  },

  async reverse(request: ReverseRequest): Promise<ReverseResponse> {
    console.log("Reverse Request:", request);
    const response = await fetch(`${API_BASE_URL}/game/reverse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Reverse Error:", errorData);
      throw new Error("Failed to reverse");
    }
    return response.json();
  },

  async getGameStatus(gameId: string): Promise<GameState> {
    const response = await fetch(`${API_BASE_URL}/game/status?game_id=${gameId}`);
    if (!response.ok) throw new Error("Failed to get game status");
    return response.json();
  },

  async aiAction(gameId: string): Promise<CallNumberResponse | PassResponse | ReverseResponse> {
    const response = await fetch(`${API_BASE_URL}/game/ai-action?game_id=${gameId}`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to execute AI action");
    return response.json();
  },

  async getLeaderboard(limit: number = 10) {
    const response = await fetch(`${API_BASE_URL}/stats/leaderboard?limit=${limit}`);
    if (!response.ok) throw new Error("Failed to get leaderboard");
    return response.json();
  },

  async getPlayerStats(username: string) {
    const response = await fetch(`${API_BASE_URL}/stats/player/${username}`);
    if (!response.ok) throw new Error("Failed to get player stats");
    return response.json();
  },

  async getGameDetails(gameUuid: string) {
    const response = await fetch(`${API_BASE_URL}/stats/game/${gameUuid}`);
    if (!response.ok) throw new Error("Failed to get game details");
    return response.json();
  },

  // Room APIs
  async getRooms(): Promise<{ rooms: Room[] }> {
    const response = await fetch(`${API_BASE_URL}/rooms`);
    if (!response.ok) throw new Error("Failed to get rooms");
    return response.json();
  },

  async getRoom(roomId: number): Promise<Room> {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`);
    if (!response.ok) throw new Error("Failed to get room");
    return response.json();
  },

  async createRoom(maxPlayers: number = 5, password?: string, playerName: string = "Host"): Promise<{ room: Room; player: any }> {
    const response = await fetch(`${API_BASE_URL}/rooms/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        max_players: maxPlayers,
        password: password || null,
        player_name: playerName,
        player_uuid: getPlayerUUID()
      }),
    });
    if (!response.ok) throw new Error("Failed to create room");
    return response.json();
  },

  async joinRoom(roomId: number, playerName: string, isAi: boolean = false, password?: string): Promise<{ success: boolean; player: any; room: Room }> {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        player_name: playerName,
        is_ai: isAi,
        password: password || null,
        player_uuid: isAi ? undefined : getPlayerUUID()
      }),
    });
    if (!response.ok) {
      if (response.status === 403) throw new Error("密碼錯誤");
      throw new Error("Failed to join room");
    }
    return response.json();
  },

  async updateRoomSettings(roomId: number, hostId: number, maxPlayers: number): Promise<Room> {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        host_id: hostId,
        max_players: maxPlayers
      }),
    });
    if (!response.ok) throw new Error("Failed to update settings");
    return response.json();
  },

  async leaveRoom(roomId: number, playerId: number) {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/leave_action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId }),
    });
    if (!response.ok) throw new Error("Failed to leave room");
    return response.json();
  },

  async startRoomGame(roomId: number) {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/start`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to start game");
    return response.json();
  },
};

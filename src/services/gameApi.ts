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

const API_BASE_URL = "http://localhost:8000/api";

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
};

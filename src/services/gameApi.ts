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
    const response = await fetch(`${API_BASE_URL}/game/pass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to pass");
    return response.json();
  },

  async reverse(request: ReverseRequest): Promise<ReverseResponse> {
    const response = await fetch(`${API_BASE_URL}/game/reverse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error("Failed to reverse");
    return response.json();
  },

  async getGameStatus(gameId: string): Promise<GameState> {
    const response = await fetch(`${API_BASE_URL}/game/status?game_id=${gameId}`);
    if (!response.ok) throw new Error("Failed to get game status");
    return response.json();
  },
};

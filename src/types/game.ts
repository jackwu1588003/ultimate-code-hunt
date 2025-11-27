export interface Player {
  id: number;
  name: string;
  is_alive: boolean;
  is_ai: boolean;
  pass_available: boolean;
  reverse_available: boolean;
}

export interface GameState {
  game_id: string;
  current_round: number;
  current_player: number;
  number_range: [number, number];
  called_numbers: number[];
  players: Player[];
  direction: number;
  game_over: boolean;
  winner?: number;
  hints?: string[]; // 遊戲提示
}

export interface PlayerConfig {
  name: string;
  is_ai: boolean;
  difficulty?: "easy" | "medium" | "hard";
}

export interface StartGameRequest {
  players: PlayerConfig[];
}

export interface StartGameResponse {
  game_id: string;
  current_round: number;
  number_range: [number, number];
  players: Player[];
  called_numbers: number[];
  direction: number;
  game_over: boolean;
  winner?: number;
}

export interface CallNumberRequest {
  game_id: string;
  player_id: number;
  numbers: number[];
}

export interface CallNumberResponse {
  success: boolean;
  hit_secret: boolean;
  eliminated_player?: number;
  next_player: number;
  called_numbers: number[];
  new_range?: [number, number];
}

export interface PassRequest {
  game_id: string;
  player_id: number;
}

export interface PassResponse {
  success: boolean;
  next_player: number;
}

export interface ReverseRequest {
  game_id: string;
  player_id: number;
}

export interface ReverseResponse {
  success: boolean;
  new_direction: number;
}

from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import random
import uuid
import sqlite3
import json
from datetime import datetime
from enum import Enum
import asyncio

app = FastAPI(title="終極密碼遊戲 API v2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print(f"Validation Error: {exc}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
    )

# ===== 資料庫初始化 =====
def init_db():
    conn = sqlite3.connect('game_records.db')
    c = conn.cursor()
    
    # 玩家表
    c.execute('''
        CREATE TABLE IF NOT EXISTS players (
            player_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            nickname VARCHAR(50),
            is_ai BOOLEAN DEFAULT FALSE,
            ai_difficulty VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            total_games INTEGER DEFAULT 0,
            total_wins INTEGER DEFAULT 0,
            total_losses INTEGER DEFAULT 0,
            win_rate DECIMAL(5,2) DEFAULT 0.00
        )
    ''')
    
    # 遊戲記錄表
    c.execute('''
        CREATE TABLE IF NOT EXISTS games (
            game_id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_uuid VARCHAR(36) UNIQUE NOT NULL,
            start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            end_time TIMESTAMP,
            total_rounds INTEGER,
            winner_id INTEGER,
            game_duration INTEGER,
            FOREIGN KEY (winner_id) REFERENCES players(player_id)
        )
    ''')
    
    # 遊戲參與者表
    c.execute('''
        CREATE TABLE IF NOT EXISTS game_participants (
            participant_id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER NOT NULL,
            player_id INTEGER NOT NULL,
            player_order INTEGER,
            final_rank INTEGER,
            eliminated_round INTEGER,
            total_calls INTEGER DEFAULT 0,
            pass_used INTEGER DEFAULT 0,
            reverse_used INTEGER DEFAULT 0,
            FOREIGN KEY (game_id) REFERENCES games(game_id),
            FOREIGN KEY (player_id) REFERENCES players(player_id)
        )
    ''')
    
    # 行動記錄表
    c.execute('''
        CREATE TABLE IF NOT EXISTS actions (
            action_id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_uuid VARCHAR(36) NOT NULL,
            round_number INTEGER NOT NULL,
            player_id INTEGER NOT NULL,
            action_type VARCHAR(20) NOT NULL,
            numbers_called TEXT,
            hit_secret BOOLEAN DEFAULT FALSE,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

init_db()

# ===== AI 系統 (簡化版) =====
class AIDifficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class AIPlayer:
    def __init__(self, player_id: int, difficulty: str):
        self.player_id = player_id
        self.difficulty = difficulty
    
    def decide_action(self, game_state, available_numbers, 
                     pass_available, reverse_available):
        """AI 決策"""
        danger = len(game_state['called_numbers']) / \
                 (game_state['number_range'][1] - game_state['number_range'][0] + 1)
        
        # 簡單策略
        if danger > 0.75 and pass_available and random.random() < 0.6:
            return {'action': 'pass'}
        
        # 選擇號碼
        available_list = sorted(list(available_numbers))
        if not available_list:
            return {'action': 'pass'} if pass_available else None
        
        # 找連續號碼
        count = random.randint(1, min(3, len(available_list)))
        for i in range(len(available_list) - count + 1):
            group = available_list[i:i+count]
            if all(group[j+1] - group[j] == 1 for j in range(len(group)-1)):
                return {'action': 'call', 'numbers': group}
        
        return {'action': 'call', 'numbers': [available_list[0]]}

# ===== 資料模型 =====
class Player(BaseModel):
    id: int
    name: str
    is_ai: bool = False
    is_alive: bool = True
    pass_available: bool = True
    reverse_available: bool = True

class RoomStatus(str, Enum):
    WAITING = "waiting"
    PLAYING = "playing"
    FULL = "full"

class Room:
    def __init__(self, room_id: int):
        self.room_id = room_id
        self.name = self._generate_random_name()
        self.players: List[Player] = []
        self.status = RoomStatus.WAITING
        self.game_id: Optional[str] = None
        self.max_players = 5
        self.created_at = datetime.now()
        self.last_activity = datetime.now()
        self.password: Optional[str] = None
        self.host_id: Optional[int] = None

    def _generate_random_name(self):
        adjectives = ["快樂的", "勇敢的", "神秘的", "幸運的", "瘋狂的", "超級", "無敵", "閃亮", "傳奇", "終極"]
        nouns = ["老虎", "獅子", "老鷹", "鯊魚", "熊貓", "巨龍", "鳳凰", "戰士", "法師", "獵人"]
        return f"{random.choice(adjectives)}{random.choice(nouns)}"

    def add_player(self, player: Player):
        if len(self.players) >= self.max_players:
            raise HTTPException(400, "房間已滿")
        if self.status == RoomStatus.PLAYING:
            raise HTTPException(400, "遊戲進行中")
        
        # Check if player name exists
        if any(p.name == player.name for p in self.players):
             # Simple handle for duplicate names in same room, maybe append ID or reject
             # For now, let's just allow it or maybe reject? 
             # The original logic didn't strictly enforce unique names across system, but within a game it might be confusing.
             # Let's append a random suffix if duplicate
             pass

        self.players.append(player)
        if len(self.players) >= self.max_players:
            self.status = RoomStatus.FULL
            
    def remove_player(self, player_id: int):
        self.players = [p for p in self.players if p.id != player_id]
        if self.status == RoomStatus.FULL and len(self.players) < self.max_players:
            self.status = RoomStatus.WAITING
        
        # If host leaves, assign new host if players remain
        if self.host_id == player_id and self.players:
            self.host_id = self.players[0].id

    def to_dict(self):
        return {
            "room_id": self.room_id,
            "name": self.name,
            "status": self.status,
            "player_count": len(self.players),
            "max_players": self.max_players,
            "has_password": bool(self.password),
            "host_id": self.host_id,
            "players": [p.dict() for p in self.players],
            "game_id": self.game_id
        }

class GameState:
    def __init__(self, players: List[dict]):
        self.game_id = str(uuid.uuid4())
        self.players = []
        self.ai_manager = {}
        
        for i, p in enumerate(players):
            # Use provided ID or fallback to index
            p_id = p.get('id', i)
            self.players.append(Player(
                id=p_id, 
                name=p['name'],
                is_ai=p.get('is_ai', False)
            ))
            
            if p.get('is_ai'):
                difficulty = p.get('difficulty', 'medium')
                self.ai_manager[p_id] = AIPlayer(p_id, difficulty)

        self.current_round = 1
        self.current_player_index = 0
        self.direction = 1
        self.called_numbers = set()
        self.secret_number = None
        self.number_range = (1, 30)
        self.start_time = datetime.now()
        self.action_history = []
        
        self._start_round()
        self._save_game_to_db()
    
    def _save_game_to_db(self):
        """保存遊戲到資料庫"""
        conn = sqlite3.connect('game_records.db')
        c = conn.cursor()
        
        # 確保玩家存在
        for player in self.players:
            c.execute('''
                INSERT OR IGNORE INTO players (username, nickname, is_ai)
                VALUES (?, ?, ?)
            ''', (f"player_{player.id}", player.name, player.is_ai))
        
        # 創建遊戲記錄
        c.execute('''
            INSERT INTO games (game_uuid, start_time, total_rounds)
            VALUES (?, ?, ?)
        ''', (self.game_id, self.start_time, 0))
        
        game_db_id = c.lastrowid
        
        # 創建參與者記錄
        for i, player in enumerate(self.players):
            c.execute('SELECT player_id FROM players WHERE username = ?',
                     (f"player_{player.id}",))
            player_db_id = c.fetchone()[0]
            
            c.execute('''
                INSERT INTO game_participants 
                (game_id, player_id, player_order)
                VALUES (?, ?, ?)
            ''', (game_db_id, player_db_id, i))
        
        conn.commit()
        conn.close()
    
    def _save_action(self, player_id: int, action_type: str, 
                    numbers: List[int] = None, hit_secret: bool = False):
        """保存行動記錄"""
        conn = sqlite3.connect('game_records.db')
        c = conn.cursor()
        
        c.execute('''
            INSERT INTO actions 
            (game_uuid, round_number, player_id, action_type, 
             numbers_called, hit_secret)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            self.game_id, 
            self.current_round, 
            player_id,
            action_type,
            json.dumps(numbers) if numbers else None,
            hit_secret
        ))
        
        conn.commit()
        conn.close()
    
    def _update_game_end(self, winner_id: int):
        """更新遊戲結束資訊"""
        conn = sqlite3.connect('game_records.db')
        c = conn.cursor()
        
        end_time = datetime.now()
        duration = int((end_time - self.start_time).total_seconds())
        
        # 更新遊戲記錄
        c.execute('''
            UPDATE games 
            SET end_time = ?, total_rounds = ?, 
                winner_id = (SELECT player_id FROM players WHERE username = ?),
                game_duration = ?
            WHERE game_uuid = ?
        ''', (end_time, self.current_round, f"player_{winner_id}", 
              duration, self.game_id))
        
        # 更新參與者排名
        for i, player in enumerate(self.players):
            if player.is_alive:
                rank = 1
                eliminated_round = None
            else:
                rank = len([p for p in self.players if not p.is_alive])
                eliminated_round = self.current_round
            
            c.execute('''
                UPDATE game_participants
                SET final_rank = ?, eliminated_round = ?
                WHERE game_id = (SELECT game_id FROM games WHERE game_uuid = ?)
                  AND player_id = (SELECT player_id FROM players WHERE username = ?)
            ''', (rank, eliminated_round, self.game_id, f"player_{player.id}"))
        
        # 更新玩家統計
        for player in self.players:
            is_winner = player.id == winner_id
            c.execute('''
                UPDATE players
                SET total_games = total_games + 1,
                    total_wins = total_wins + ?,
                    total_losses = total_losses + ?,
                    win_rate = ROUND(CAST(total_wins + ? AS FLOAT) / 
                                    (total_games + 1) * 100, 2)
                WHERE username = ?
            ''', (1 if is_winner else 0, 
                  0 if is_winner else 1,
                  1 if is_winner else 0,
                  f"player_{player.id}"))
        
        conn.commit()
        conn.close()
    
    def _start_round(self):
        if self.current_round == 1:
            self.number_range = (1, 30)
        elif self.current_round == 2:
            self.number_range = (1, 20)
        else:
            self.number_range = (1, 15)
        
        self.secret_number = random.randint(*self.number_range)
        self.called_numbers.clear()
        
        for player in self.players:
            if player.is_alive:
                player.pass_available = True
                player.reverse_available = True
        
        print(f"[Round {self.current_round}] 密碼: {self.secret_number}")
    
    def get_current_player(self) -> Player:
        return self.players[self.current_player_index]
    
    def next_player(self):
        alive_count = sum(1 for p in self.players if p.is_alive)
        if alive_count <= 1:
            return
        
        steps = 0
        while steps < len(self.players):
            self.current_player_index = (
                self.current_player_index + self.direction
            ) % len(self.players)
            
            if self.players[self.current_player_index].is_alive:
                break
            steps += 1
    
    def eliminate_current_player(self):
        current = self.get_current_player()
        current.is_alive = False
        
        alive_players = [p for p in self.players if p.is_alive]
        
        if len(alive_players) == 1:
            winner = alive_players[0]
            self._update_game_end(winner.id)
            self.reset_room_status()
            return True
        
        if len(alive_players) > 1:
            self.current_round += 1
            self.direction = 1
            self.next_player()
            self._start_round()
        
        return False

    def reset_room_status(self):
        """Reset room status when game ends"""
        # Find which room this game belongs to
        # This is a bit inefficient, but works for now
        for room in rooms.values():
            if room.game_id == self.game_id:
                room.status = RoomStatus.WAITING
                room.game_id = None
                room.last_activity = datetime.now() # Update activity
                # Broadcast update
                # We need to run this async, but we are in a sync method.
                # In FastAPI, we can use background tasks or just fire and forget if we had the loop.
                # However, _update_game_end is called internally.
                # Let's just update the state for now. The polling/websocket will pick it up eventually?
                # No, we want real-time.
                # We can't easily await here without changing everything to async.
                # For now, let's just update the room state. The clients in the room will need to handle "game over" navigation.
                # When they navigate back to room, they will fetch status.
                # But for lobby, we want to show it's waiting again.
                # We can try to use the event loop if available.
                try:
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        loop.create_task(notify_room_update(room.room_id, room))
                except:
                    pass
                break


# ===== 請求模型 =====
class StartGameRequest(BaseModel):
    players: List[dict]  # [{"name": "Alice", "is_ai": False}, ...]

class CallNumbersRequest(BaseModel):
    game_id: str
    player_id: int
    numbers: List[int]

class UsePassRequest(BaseModel):
    game_id: str
    player_id: int

class UseReverseRequest(BaseModel):
    game_id: str
    player_id: int

# ===== 遊戲狀態 =====
games = {}
# Dynamic rooms dictionary
rooms: dict[int, "Room"] = {}

# ===== WebSocket 管理 =====
class ConnectionManager:
    def __init__(self):
        # active_connections: List[WebSocket] = []
        self.lobby_connections: List[WebSocket] = []
        self.room_connections: dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: int = None):
        await websocket.accept()
        if room_id is None:
            self.lobby_connections.append(websocket)
        else:
            if room_id not in self.room_connections:
                self.room_connections[room_id] = []
            self.room_connections[room_id].append(websocket)

    def disconnect(self, websocket: WebSocket, room_id: int = None):
        if room_id is None:
            if websocket in self.lobby_connections:
                self.lobby_connections.remove(websocket)
        else:
            if room_id in self.room_connections and websocket in self.room_connections[room_id]:
                self.room_connections[room_id].remove(websocket)

    async def broadcast_lobby(self, message: dict):
        for connection in self.lobby_connections:
            try:
                await connection.send_json(message)
            except:
                pass # Handle disconnected clients

    async def broadcast_room(self, room_id: int, message: dict):
        if room_id in self.room_connections:
            for connection in self.room_connections[room_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass

manager = ConnectionManager()

@app.websocket("/ws/{client_type}")
async def websocket_endpoint(websocket: WebSocket, client_type: str):
    # client_type can be "lobby" or "room_{id}"
    room_id = None
    if client_type.startswith("room_"):
        try:
            room_id = int(client_type.split("_")[1])
        except:
            await websocket.close()
            return
    
    await manager.connect(websocket, room_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming messages if needed, e.g. chat
            # For now we just keep connection open
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)

# Helper to broadcast updates
async def notify_lobby_update():
    # Broadcast simplified room list or just a "refresh" signal
    # Sending full list might be heavy if frequent, but for 100 rooms it's okay-ish.
    # Let's send a "rooms_updated" event and let frontend fetch, or send the changed room.
    # For simplicity, let's send the updated room info if possible, or just trigger fetch.
    # Let's send "refresh" for now to keep it simple and consistent.
    await manager.broadcast_lobby({"type": "refresh"})

async def notify_room_update(room_id: int, room: Room):
    await manager.broadcast_room(room_id, {"type": "room_update", "room": room.to_dict()})
    await notify_lobby_update() # Lobby also needs to know status changed

# ===== Background Tasks =====
async def cleanup_inactive_rooms():
    while True:
        await asyncio.sleep(60) # Check every minute
        now = datetime.now()
        rooms_to_delete = []
        for room_id, room in rooms.items():
            # If room is empty, it should have been deleted, but check just in case
            if len(room.players) == 0:
                rooms_to_delete.append(room_id)
                continue
            
            # Check inactivity (2 hours)
            if (now - room.last_activity).total_seconds() > 7200: # 2 hours
                rooms_to_delete.append(room_id)
        
        for room_id in rooms_to_delete:
            if room_id in rooms:
                del rooms[room_id]
                # Notify lobby?
                await notify_lobby_update()
                # Close websocket connections for this room
                if room_id in manager.room_connections:
                    for ws in manager.room_connections[room_id]:
                        await ws.close()
                    del manager.room_connections[room_id]

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(cleanup_inactive_rooms())

# ===== API 端點 =====
@app.get("/api/rooms")
async def get_rooms():
    return {
        "rooms": [room.to_dict() for room in rooms.values()]
    }

@app.get("/api/rooms/{room_id}")
async def get_room(room_id: int):
    if room_id not in rooms:
        raise HTTPException(404, "房間不存在")
    return rooms[room_id].to_dict()

from typing import Optional # Added for Optional type hint

class CreateRoomRequest(BaseModel):
    max_players: int = 5
    password: Optional[str] = None
    player_name: str

@app.post("/api/rooms/create")
async def create_room(request: CreateRoomRequest):
    try:
        # Generate a random room ID (6 digits)
        while True:
            room_id = random.randint(100000, 999999)
            if room_id not in rooms:
                break
        
        new_room = Room(room_id)
        # Validate max_players
        if request.max_players < 2 or request.max_players > 10:
            raise HTTPException(400, "玩家人數必須在 2 到 10 人之間")
            
        new_room.max_players = request.max_players
        new_room.password = request.password
        
        # Create host player
        player_id = int(datetime.now().timestamp() * 1000) % 100000 + random.randint(0, 1000)
        host_player = Player(
            id=player_id,
            name=request.player_name,
            is_ai=False
        )
        
        new_room.add_player(host_player)
        new_room.host_id = player_id
        
        rooms[room_id] = new_room
        
        await notify_lobby_update()
        
        return {
            "room": new_room.to_dict(),
            "player": host_player.dict()
        }
    except Exception as e:
        with open("backend_error.log", "a") as f:
            f.write(f"Error creating room: {str(e)}\n")
        raise e

class JoinRoomRequest(BaseModel):
    player_name: str
    is_ai: bool = False
    password: Optional[str] = None

@app.post("/api/rooms/{room_id}/join")
async def join_room(room_id: int, request: JoinRoomRequest):
    if room_id not in rooms:
        raise HTTPException(404, "房間不存在")
    
    room = rooms[room_id]
    
    # Check password
    if room.password and not request.is_ai: # AI bypass password? Or host adds AI so it's fine.
        if request.password != room.password:
             raise HTTPException(403, "密碼錯誤")
    
    # Generate a simple ID for the player within the room context
    # In a real app, this would be from a user session or DB
    player_id = int(datetime.now().timestamp() * 1000) % 100000 + random.randint(0, 1000)
    
    new_player = Player(
        id=player_id,
        name=request.player_name,
        is_ai=request.is_ai
    )
    
    room.add_player(new_player)
    room.last_activity = datetime.now() # Update activity
    
    # Broadcast update
    await notify_room_update(room_id, room)
    
    return {
        "success": True,
        "player": new_player.dict(),
        "room": room.to_dict()
    }

@app.post("/api/rooms/{room_id}/leave")
async def leave_room(room_id: int, player_id: int = 0): # simplified for now, ideally get from auth or body
    # Note: For simplicity, we might need to pass player_id in body or query
    # Let's update the request model or use a query param
    pass

class LeaveRoomRequest(BaseModel):
    player_id: int

@app.post("/api/rooms/{room_id}/leave_action") # Changed path to avoid conflict if any
async def leave_room_action(room_id: int, request: LeaveRoomRequest):
    if room_id not in rooms:
        raise HTTPException(404, "房間不存在")
    
    room = rooms[room_id]
    room.remove_player(request.player_id)
    room.last_activity = datetime.now() # Update activity
    
    # Check if room is empty
    if len(room.players) == 0:
        del rooms[room_id]
        await notify_lobby_update()
        return {"success": True, "message": "Room deleted"}

    # Broadcast update
    await notify_room_update(room_id, room)
    
    return {"success": True, "room": room.to_dict()}

@app.post("/api/rooms/{room_id}/start")
async def start_room_game(room_id: int):
    if room_id not in rooms:
        raise HTTPException(404, "房間不存在")
    
    room = rooms[room_id]
    if len(room.players) < 2:
        raise HTTPException(400, "玩家人數不足")
    
    # Create GameState from room players
    # We need to convert Room players (Pydantic models) to dicts expected by GameState
    player_dicts = [{"id": p.id, "name": p.name, "is_ai": p.is_ai, "difficulty": "medium"} for p in room.players]
    
    game = GameState(player_dicts)
    
    games[game.game_id] = game
    room.game_id = game.game_id
    room.status = RoomStatus.PLAYING
    
    # Broadcast update with game_started event
    await manager.broadcast_room(room_id, {
        "type": "game_started", 
        "game_id": game.game_id,
        "room": room.to_dict()
    })
    await notify_lobby_update()
    
    return {
        "success": True,
        "game_id": game.game_id,
        "room_id": room_id
    }

@app.post("/api/game/start")
async def start_game(request: StartGameRequest):
    if len(request.players) < 2 or len(request.players) > 5:
        raise HTTPException(400, "玩家數量必須在 2-5 人之間")
    
    game = GameState(request.players)
    games[game.game_id] = game
    
    return {
        "game_id": game.game_id,
        "current_round": game.current_round,
        "number_range": game.number_range,
        "current_player": game.players[game.current_player_index].id,
        "players": [p.dict() for p in game.players],
        "called_numbers": list(game.called_numbers),
        "direction": game.direction,
        "game_over": False,
        "winner": None
    }

@app.post("/api/game/call")
async def call_numbers(request: CallNumbersRequest):
    game = games.get(request.game_id)
    if not game:
        raise HTTPException(404, "遊戲不存在")
    
    numbers = request.numbers
    # Compare player id with the current player's id (not the index)
    current_player = game.get_current_player()
    print(f"Call Request: player={request.player_id}, current_player_id={current_player.id}, numbers={numbers}")
    if request.player_id != current_player.id:
        print(f"Turn Mismatch: req={request.player_id} != curr={current_player.id}")
        raise HTTPException(400, "不是你的回合")
    
    if len(numbers) < 1 or len(numbers) > 3:
        raise HTTPException(400, "必須喊 1-3 個號碼")
    
    numbers_sorted = sorted(numbers)
    for i in range(len(numbers_sorted) - 1):
        if numbers_sorted[i+1] - numbers_sorted[i] != 1:
            raise HTTPException(400, "號碼必須連續")
    
    if any(n < game.number_range[0] or n > game.number_range[1] for n in numbers):
        raise HTTPException(400, f"號碼必須在 {game.number_range[0]}-{game.number_range[1]} 之間")
    
    if any(n in game.called_numbers for n in numbers):
        raise HTTPException(400, "有號碼已經被喊過了")
    
    game.called_numbers.update(numbers)
    hit_secret = game.secret_number in numbers
    
    # Update Range
    if not hit_secret:
        lower, upper = game.number_range
        for n in numbers:
            if n < game.secret_number:
                lower = max(lower, n + 1)
            elif n > game.secret_number:
                upper = min(upper, n - 1)
        game.number_range = (lower, upper)
        print(f"Range Updated: {game.number_range}")
    
    # 保存行動
    game._save_action(request.player_id, 'call', numbers, hit_secret)
    
    if hit_secret:
        game_over = game.eliminate_current_player()
        return {
            "success": True,
            "hit_secret": True,
            "eliminated_player": request.player_id,
            "game_over": game_over,
            "next_player": game.players[game.current_player_index].id if not game_over else None,
            "called_numbers": list(game.called_numbers),
            "winner": next((p.id for p in game.players if p.is_alive), None) if game_over else None,
            "new_range": game.number_range
        }
    else:
        game.next_player()
        print(f"Next Player: {game.players[game.current_player_index].id}")
        return {
            "success": True,
            "hit_secret": False,
            "next_player": game.players[game.current_player_index].id,
            "called_numbers": list(game.called_numbers),
            "new_range": game.number_range
        }

@app.post("/api/game/pass")
async def use_pass(request: UsePassRequest):
    game = games.get(request.game_id)
    if not game:
        raise HTTPException(404, "遊戲不存在")
    
    # Ensure the request is from the current player (compare ids)
    current_player = game.get_current_player()
    if request.player_id != current_player.id:
        raise HTTPException(400, "不是你的回合")

    player = current_player
    if not player.pass_available:
        raise HTTPException(400, "Pass 已經使用過了")
    
    player.pass_available = False
    game._save_action(request.player_id, 'pass')
    game.next_player()
    
    return {
        "success": True,
        "next_player": game.players[game.current_player_index].id
    }

@app.post("/api/game/reverse")
async def use_reverse(request: UseReverseRequest):
    game = games.get(request.game_id)
    if not game:
        raise HTTPException(404, "遊戲不存在")
    
    # Ensure the request is from the current player (compare ids)
    current_player = game.get_current_player()
    if request.player_id != current_player.id:
        raise HTTPException(400, "不是你的回合")

    player = current_player
    if not player.reverse_available:
        raise HTTPException(400, "迴轉已經使用過了")
    
    player.reverse_available = False
    game.direction *= -1
    game._save_action(request.player_id, 'reverse')
    game.next_player()
    
    return {
        "success": True,
        "new_direction": game.direction,
        "next_player": game.players[game.current_player_index].id
    }

@app.get("/api/game/status")
async def get_status(game_id: str):
    game = games.get(game_id)
    if not game:
        raise HTTPException(404, "遊戲不存在")
    
    alive_players = [p for p in game.players if p.is_alive]
    game_over = len(alive_players) <= 1
    
    return {
        "game_id": game.game_id,
        "current_round": game.current_round,
        "current_player": game.players[game.current_player_index].id,
        "number_range": game.number_range,
        "called_numbers": list(game.called_numbers),
        "players": [p.dict() for p in game.players],
        "direction": game.direction,
        "game_over": game_over,
        "winner": alive_players[0].id if game_over else None
    }

@app.post("/api/game/ai-action")
async def get_ai_action(game_id: str):
    """讓 AI 執行行動"""
    game = games.get(game_id)
    if not game:
        raise HTTPException(404, "遊戲不存在")
    
    current_player = game.get_current_player()
    
    if not current_player.is_ai:
        raise HTTPException(400, "當前玩家不是 AI")
    
    # 獲取 AI 決策
    ai = game.ai_manager.get(current_player.id)
    if not ai:
        raise HTTPException(500, "AI 不存在")
    
    # 計算可用號碼
    available = set(range(game.number_range[0], game.number_range[1] + 1)) - game.called_numbers
    
    game_state = {
        'number_range': game.number_range,
        'called_numbers': list(game.called_numbers),
        'players': [p.dict() for p in game.players]
    }
    
    action = ai.decide_action(
        game_state,
        available,
        current_player.pass_available,
        current_player.reverse_available
    )
    
    # 執行 AI 行動
    if action['action'] == 'call':
        return await call_numbers(CallNumbersRequest(
            game_id=game_id,
            player_id=current_player.id,
            numbers=action['numbers']
        ))
    elif action['action'] == 'pass':
        return await use_pass(UsePassRequest(
            game_id=game_id,
            player_id=current_player.id
        ))
    elif action['action'] == 'reverse':
        return await use_reverse(UseReverseRequest(
            game_id=game_id,
            player_id=current_player.id
        ))

# ===== 統計 API =====
@app.get("/api/stats/leaderboard")
async def get_leaderboard(limit: int = 10):
    """獲取排行榜"""
    conn = sqlite3.connect('game_records.db')
    c = conn.cursor()
    
    c.execute('''
        SELECT username, nickname, total_games, total_wins, 
               total_losses, win_rate, is_ai
        FROM players
        WHERE total_games > 0
        ORDER BY win_rate DESC, total_wins DESC
        LIMIT ?
    ''', (limit,))
    
    results = c.fetchall()
    conn.close()
    
    return {
        "leaderboard": [
            {
                "rank": i + 1,
                "username": row[0],
                "nickname": row[1],
                "total_games": row[2],
                "total_wins": row[3],
                "total_losses": row[4],
                "win_rate": row[5],
                "is_ai": bool(row[6])
            }
            for i, row in enumerate(results)
        ]
    }

@app.get("/api/stats/player/{username}")
async def get_player_stats(username: str):
    """獲取玩家統計"""
    conn = sqlite3.connect('game_records.db')
    c = conn.cursor()
    
    c.execute('''
        SELECT username, nickname, total_games, total_wins, 
               total_losses, win_rate, is_ai, created_at
        FROM players
        WHERE username = ?
    ''', (username,))
    
    result = c.fetchone()
    
    if not result:
        conn.close()
        raise HTTPException(404, "玩家不存在")
    
    # 獲取最近遊戲記錄
    c.execute('''
        SELECT g.game_uuid, g.start_time, g.end_time, 
               gp.final_rank, gp.eliminated_round
        FROM games g
        JOIN game_participants gp ON g.game_id = gp.game_id
        JOIN players p ON gp.player_id = p.player_id
        WHERE p.username = ?
        ORDER BY g.start_time DESC
        LIMIT 10
    ''', (username,))
    
    recent_games = c.fetchall()
    conn.close()
    
    return {
        "username": result[0],
        "nickname": result[1],
        "total_games": result[2],
        "total_wins": result[3],
        "total_losses": result[4],
        "win_rate": result[5],
        "is_ai": bool(result[6]),
        "created_at": result[7],
        "recent_games": [
            {
                "game_id": game[0],
                "start_time": game[1],
                "end_time": game[2],
                "rank": game[3],
                "eliminated_round": game[4]
            }
            for game in recent_games
        ]
    }

@app.get("/api/stats/game/{game_uuid}")
async def get_game_details(game_uuid: str):
    """獲取遊戲詳細記錄"""
    conn = sqlite3.connect('game_records.db')
    c = conn.cursor()
    
    # 獲取遊戲基本資訊
    c.execute('''
        SELECT g.game_uuid, g.start_time, g.end_time, 
               g.total_rounds, g.game_duration,
               p.username as winner
        FROM games g
        LEFT JOIN players p ON g.winner_id = p.player_id
        WHERE g.game_uuid = ?
    ''', (game_uuid,))
    
    game_info = c.fetchone()
    
    if not game_info:
        conn.close()
        raise HTTPException(404, "遊戲不存在")
    
    # 獲取參與者
    c.execute('''
        SELECT p.username, p.nickname, gp.player_order, 
                 gp.final_rank, gp.eliminated_round,
                 gp.total_calls, gp.pass_used, gp.reverse_used
        FROM game_participants gp
        JOIN players p ON gp.player_id = p.player_id
        JOIN games g ON gp.game_id = g.game_id
        WHERE g.game_uuid = ?
        ORDER BY gp.player_order
    ''', (game_uuid,))
    
    participants = c.fetchall()
    
    # 獲取行動記錄
    c.execute('''
        SELECT round_number, player_id, action_type, 
               numbers_called, hit_secret, timestamp
        FROM actions
        WHERE game_uuid = ?
        ORDER BY timestamp
    ''', (game_uuid,))
    
    actions = c.fetchall()
    conn.close()
    
    return {
        "game_id": game_info[0],
        "start_time": game_info[1],
        "end_time": game_info[2],
        "total_rounds": game_info[3],
        "duration": game_info[4],
        "winner": game_info[5],
        "participants": [
            {
                "username": p[0],
                "nickname": p[1],
                "order": p[2],
                "rank": p[3],
                "eliminated_round": p[4],
                "total_calls": p[5],
                "pass_used": p[6],
                "reverse_used": p[7]
            }
            for p in participants
        ],
        "actions": [
            {
                "round": a[0],
                "player_id": a[1],
                "action": a[2],
                "numbers": json.loads(a[3]) if a[3] else None,
                "hit_secret": bool(a[4]),
                "timestamp": a[5]
            }
            for a in actions
        ]
    }

# ===== API 健康檢查 =====
@app.get("/")
async def root():
    return {
        "message": "終極密碼遊戲 API v2",
        "version": "2.0",
        "features": ["Database", "AI Players", "Statistics"]
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "2.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)






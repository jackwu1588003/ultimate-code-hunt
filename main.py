from fastapi import FastAPI, HTTPException, BackgroundTasks
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

class GameState:
    def __init__(self, players: List[dict]):
        self.game_id = str(uuid.uuid4())
        self.players = [
            Player(
                id=i, 
                name=p['name'],
                is_ai=p.get('is_ai', False)
            ) 
            for i, p in enumerate(players)
        ]
        self.current_round = 1
        self.current_player_index = 0
        self.direction = 1
        self.called_numbers = set()
        self.secret_number = None
        self.number_range = (1, 30)
        self.start_time = datetime.now()
        self.ai_manager = {}
        self.action_history = []
        
        # 創建 AI 玩家
        for i, p in enumerate(players):
            if p.get('is_ai'):
                difficulty = p.get('difficulty', 'medium')
                self.ai_manager[i] = AIPlayer(i, difficulty)
        
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
            return True
        
        if len(alive_players) > 1:
            self.current_round += 1
            self.direction = 1
            self.next_player()
            self._start_round()
        
        return False

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

# ===== API 端點 =====
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
        "current_player": game.current_player_index,
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
    
    print(f"Call Request: player={request.player_id}, current={game.current_player_index}, numbers={numbers}")
    
    if request.player_id != game.current_player_index:
        print(f"Turn Mismatch: req={request.player_id} != curr={game.current_player_index}")
        raise HTTPException(400, "不是你的回合")
    
    numbers = request.numbers
    
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
            "next_player": game.current_player_index if not game_over else None,
            "called_numbers": list(game.called_numbers),
            "winner": next((p.id for p in game.players if p.is_alive), None) if game_over else None,
            "new_range": game.number_range
        }
    else:
        game.next_player()
        print(f"Next Player: {game.current_player_index}")
        return {
            "success": True,
            "hit_secret": False,
            "next_player": game.current_player_index,
            "called_numbers": list(game.called_numbers),
            "new_range": game.number_range
        }

@app.post("/api/game/pass")
async def use_pass(request: UsePassRequest):
    game = games.get(request.game_id)
    if not game:
        raise HTTPException(404, "遊戲不存在")
    
    if request.player_id != game.current_player_index:
        raise HTTPException(400, "不是你的回合")
    
    player = game.get_current_player()
    if not player.pass_available:
        raise HTTPException(400, "Pass 已經使用過了")
    
    player.pass_available = False
    game._save_action(request.player_id, 'pass')
    game.next_player()
    
    return {
        "success": True,
        "next_player": game.current_player_index
    }

@app.post("/api/game/reverse")
async def use_reverse(request: UseReverseRequest):
    game = games.get(request.game_id)
    if not game:
        raise HTTPException(404, "遊戲不存在")
    
    if request.player_id != game.current_player_index:
        raise HTTPException(400, "不是你的回合")
    
    player = game.get_current_player()
    if not player.reverse_available:
        raise HTTPException(400, "迴轉已經使用過了")
    
    player.reverse_available = False
    game.direction *= -1
    game._save_action(request.player_id, 'reverse')
    game.next_player()
    
    return {
        "success": True,
        "new_direction": game.direction,
        "next_player": game.current_player_index
    }

@app.get("/api/game/status")
async def get_status(game_id: str):
    game = games.get(game_id)
    if not game:
        raise HTTPException(404, "遊戲不存在")
    
    alive_players = [p for p in game.players if p.is_alive]
    game_over = len(alive_players) <= 1
    
    return {
        "current_round": game.current_round,
        "current_player": game.current_player_index,
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

@app.get("/")
async def root():
    return {
        "message": "終極密碼遊戲 API v2",
        "version": "2.0",
        "features": ["Database", "AI Players", "Statistics"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

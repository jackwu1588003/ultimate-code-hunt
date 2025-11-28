import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { gameApi, Room } from "@/services/gameApi";
import { webSocketService } from "@/services/WebSocketService";
import { toast } from "sonner";
import { User, Bot, LogOut, Play, Dices, Copy } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const generateRandomName = () => {
    const adjectives = ["快樂的", "勇敢的", "神秘的", "幸運的", "瘋狂的", "超級", "無敵", "閃亮", "傳奇", "終極"];
    const nouns = ["玩家", "戰士", "法師", "獵人", "忍者", "騎士", "冒險者", "大師", "專家", "新手"];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}`;
};

const RoomWaiting = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [room, setRoom] = useState<Room | null>(null);
    const [playerName, setPlayerName] = useState(generateRandomName());
    const [isJoined, setIsJoined] = useState(false);
    const [currentPlayerId, setCurrentPlayerId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isHost, setIsHost] = useState(false);
    const location = useLocation();
    const [joinPasswordPrefill, setJoinPasswordPrefill] = useState<string | null>(null);

    // Refs for WebSocket callback to access current state
    const isJoinedRef = useRef(isJoined);
    const currentPlayerIdRef = useRef(currentPlayerId);

    useEffect(() => {
        isJoinedRef.current = isJoined;
        currentPlayerIdRef.current = currentPlayerId;
    }, [isJoined, currentPlayerId]);

    useEffect(() => {
        if (room && currentPlayerId) {
            setIsHost(room.host_id === currentPlayerId);
        }
    }, [room, currentPlayerId]);

    // If navigated with an initialPassword (from GameStart), prefill and open join dialog
    useEffect(() => {
        const state: any = location.state;
        if (state && state.initialPassword) {
            setJoinPasswordPrefill(state.initialPassword);
            setIsJoinDialogOpen(true);
        }
    }, [location]);

    const handleUpdateSettings = async (newMaxPlayers: number) => {
        if (!room || !isHost) return;
        try {
            await gameApi.updateRoomSettings(room.room_id, room.host_id!, newMaxPlayers);
            toast.success("已更新房間設定");
        } catch (error) {
            toast.error("更新設定失敗");
        }
    };

    // Poll room status
    useEffect(() => {
        if (!roomId) return;

        const fetchRoom = async () => {
            try {
                const data = await gameApi.getRoom(parseInt(roomId));
                setRoom(data);

                // Check for existing session
                const savedPlayerId = localStorage.getItem(`player_id_${roomId}`);
                if (savedPlayerId) {
                    const playerId = parseInt(savedPlayerId);
                    const playerExists = data.players.some((p: any) => p.id === playerId);
                    if (playerExists) {
                        setCurrentPlayerId(playerId);
                        setIsJoined(true);
                        // Find player name to restore
                        const player = data.players.find((p: any) => p.id === playerId);
                        if (player) setPlayerName(player.name);
                    } else {
                        // Player ID not in room (maybe kicked or room reset), clear storage
                        localStorage.removeItem(`player_id_${roomId}`);
                    }
                }

                // Initial check if game already playing
                if (data.status === 'playing' && data.game_id) {
                    const gameState = await gameApi.getGameStatus(data.game_id);
                    navigate(`/game/${roomId}`, { state: { gameState, roomId } }); // Pass roomId to game
                }
            } catch (error) {
                console.error("Failed to fetch room:", error);
            }
        };

        fetchRoom();

        // WebSocket connection
        webSocketService.connect(`room_${roomId}`);
        const unsubscribe = webSocketService.subscribe(async (data) => {
            if (data.type === "room_update") {
                setRoom(data.room);

                // Re-verify session on update (in case we were kicked)
                const savedPlayerId = localStorage.getItem(`player_id_${roomId}`);
                if (savedPlayerId) {
                    const playerId = parseInt(savedPlayerId);
                    const playerExists = data.room.players.some((p: any) => p.id === playerId);

                    // Use ref to check current joined state
                    if (!playerExists && isJoinedRef.current) {
                        // We were removed
                        setIsJoined(false);
                        setCurrentPlayerId(null);
                        localStorage.removeItem(`player_id_${roomId}`);
                        toast.error("你已被移除房間");
                    }
                }

            } else if (data.type === "game_started") {
                toast.success("遊戲開始！");
                const gameState = await gameApi.getGameStatus(data.game_id);
                navigate(`/game/${roomId}`, { state: { gameState, roomId } });
            }
        }, `room_${roomId}`);

        return () => {
            unsubscribe();
            webSocketService.disconnect();
        };
    }, [roomId, navigate]); // Removed isJoined from dependency to avoid loops, handled inside

    const handleJoin = async () => {
        if (!playerName.trim()) {
            toast.error("請輸入暱稱");
            return;
        }
        if (!roomId) return;
        setIsLoading(true);
        try {
            if (room.has_password && !(joinPasswordPrefill && joinPasswordPrefill.length > 0)) {
                toast.error("此房間需要密碼，請輸入密碼");
                setIsLoading(false);
                return;
            }

            const passwordToUse = joinPasswordPrefill ?? undefined;
            const response = await gameApi.joinRoom(parseInt(roomId), playerName, false, passwordToUse);
            setIsJoined(true);
            setCurrentPlayerId(response.player.id);
            setRoom(response.room);
            // Save session
            localStorage.setItem(`player_id_${roomId}`, response.player.id.toString());
            toast.success("成功加入房間！");
        } catch (error) {
            console.error("Failed to join:", error);
            toast.error(error.message || "加入房間失敗");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLeave = async () => {
        if (!roomId || !currentPlayerId) return;
        try {
            await gameApi.leaveRoom(parseInt(roomId), currentPlayerId);
            localStorage.removeItem(`player_id_${roomId}`);
            navigate("/lobby");
        } catch (error) {
            console.error("Failed to leave:", error);
            toast.error("離開失敗");
        }
    };

    const handleStartGame = async () => {
        if (!roomId) return;
        try {
            const response = await gameApi.startRoomGame(parseInt(roomId));
            // Navigation will be handled by polling effect when status changes to playing
            toast.success("遊戲開始！");
        } catch (error) {
            console.error("Failed to start:", error);
            toast.error("無法開始遊戲，請確認人數是否足夠 (2-5人)");
        }
    };

    const handleAddAI = async () => {
        if (!roomId) return;
        // For now, adding AI is just joining with is_ai=true
        // We might need a specific button or just use join logic with random name
        const aiName = `AI-${Math.floor(Math.random() * 1000)}`;
        try {
            await gameApi.joinRoom(parseInt(roomId), aiName, true);
            toast.success("已加入 AI 玩家");
        } catch (error) {
            toast.error("無法加入 AI");
        }
    };

    if (!room) return <div className="text-white text-center mt-20">Loading...</div>;

    return (
        <div className="min-h-screen bg-game-gradient p-4 flex items-center justify-center relative">
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>
            <Card className="w-full max-w-2xl bg-white/95 backdrop-blur dark:bg-card/95">
                <CardHeader>
                    <CardTitle className="text-3xl text-center flex flex-col items-center justify-center gap-2">
                        <span className="font-bold">{room.name}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground font-normal">Room #{roomId}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                    navigator.clipboard.writeText(roomId || "");
                                    toast.success("已複製房間號碼");
                                }}
                                title="複製房間號碼"
                            >
                                <Copy className="h-3 w-3" />
                            </Button>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-center">
                        <Badge variant="outline" className="text-lg px-4 py-1">
                            {room.players.length} / {room.max_players} 玩家
                        </Badge>
                    </div>

                    <div className="space-y-4">
                        {/* Player List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {room.players.map((player: any, idx: number) => (
                                <div key={player.id} className="flex items-center p-3 bg-gray-100 rounded-lg shadow-sm">
                                    {/* choose avatar filename from a small pool deterministically */}
                                    {(() => {
                                        const AVATAR_POOL = [
                                            '118725_0.jpg', '119365_0.jpg', '121298_0.jpg', '121299_0.jpg', '121300_0.jpg',
                                            '121301_0.jpg', '121302_0.jpg', '121303_0.jpg', '121304_0.jpg', '121307_0.jpg'
                                        ];
                                        const idNum = typeof player.id === 'number' ? Math.abs(player.id) : idx;
                                        const avatarFilename = AVATAR_POOL[idNum % AVATAR_POOL.length];

                                        return (
                                            <Avatar className="h-10 w-10 mr-3">
                                                <AvatarImage avatarFilename={avatarFilename} requestedSize={40} alt={player.name} />
                                                <AvatarFallback className={player.is_ai ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}>
                                                    {player.is_ai ? <Bot size={20} /> : <User size={20} />}
                                                </AvatarFallback>
                                            </Avatar>
                                        );
                                    })()}
                                    <div className="flex-1">
                                        <div className="font-semibold">{player.name}</div>
                                        <div className="text-xs text-gray-500">{player.is_ai ? "AI Player" : "Human"}</div>
                                    </div>
                                    {player.id === currentPlayerId && (
                                        <Badge variant="outline" className="ml-2">You</Badge>
                                    )}
                                </div>
                            ))}

                            {/* Empty Slots */}
                            {Array.from({ length: Math.max(0, room.max_players - room.player_count) }).map((_, i) => (
                                <div key={`empty-${i}`} className="flex items-center p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 justify-center">
                                    等待加入...
                                </div>
                            ))}
                        </div>

                    </div>

                    {/* Controls */}
                    {!isJoined ? (
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-4 border-t">
                            <div className="flex gap-2 w-full max-w-xs">
                                <Input
                                    placeholder="輸入你的暱稱..."
                                    value={playerName}
                                    onChange={(e) => setPlayerName(e.target.value)}
                                    className="flex-1"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setPlayerName(generateRandomName())}
                                    title="隨機名稱"
                                >
                                    <Dices className="w-4 h-4" />
                                </Button>
                            </div>
                            {/* If room has password, show password input (prefilled if provided) */}
                            {room.has_password && (
                                <div className="flex gap-2 w-full max-w-xs mt-2">
                                    <Input
                                        placeholder="房間密碼"
                                        type="password"
                                        value={joinPasswordPrefill ?? ''}
                                        onChange={(e) => setJoinPasswordPrefill(e.target.value)}
                                        className="flex-1"
                                    />
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Button onClick={handleJoin} disabled={isLoading || !playerName.trim()}>
                                    加入房間
                                </Button>
                                <Button variant="outline" onClick={() => navigate("/lobby")}>
                                    返回大廳
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4 pt-4 border-t">
                            <div className="flex justify-center gap-4">
                                {isHost && (
                                    <Button
                                        size="lg"
                                        className="w-full md:w-auto bg-green-600 hover:bg-green-700"
                                        onClick={handleStartGame}
                                        disabled={room.player_count < 2}
                                    >
                                        <Play className="mr-2 h-5 w-5" /> 開始遊戲
                                    </Button>
                                )}

                                {isHost && room.player_count < room.max_players && (
                                    <Button variant="secondary" onClick={handleAddAI}>
                                        + 加入 AI
                                    </Button>
                                )}
                            </div>

                            {/* {isHost && (
                                <div className="flex items-center justify-center gap-4 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <span className="text-sm font-medium">人數上限: {room.max_players}</span>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleUpdateSettings(Math.max(2, room.max_players - 1))}
                                            disabled={room.max_players <= 2 || room.max_players <= room.player_count}
                                        >
                                            -
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleUpdateSettings(Math.min(10, room.max_players + 1))}
                                            disabled={room.max_players >= 10}
                                        >
                                            +
                                        </Button>
                                    </div>
                                </div>
                            )} */}

                            <div className="flex justify-center">
                                <Button variant="ghost" onClick={handleLeave} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                    <LogOut className="mr-2 h-4 w-4" /> 離開房間
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div >
    );
};

export default RoomWaiting;

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { gameApi, Room } from "@/services/gameApi";
import { webSocketService } from "@/services/WebSocketService";
import { toast } from "sonner";
import { User, Bot, LogOut, Play } from "lucide-react";

const RoomWaiting = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [room, setRoom] = useState<Room | null>(null);
    const [playerName, setPlayerName] = useState("");
    const [isJoined, setIsJoined] = useState(false);
    const [currentPlayerId, setCurrentPlayerId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Poll room status
    useEffect(() => {
        if (!roomId) return;

        const fetchRoom = async () => {
            try {
                const data = await gameApi.getRoom(parseInt(roomId));
                setRoom(data);

                // Initial check if game already playing
                if (data.status === 'playing' && data.game_id) {
                    const gameState = await gameApi.getGameStatus(data.game_id);
                    navigate("/game", { state: { gameState, roomId } }); // Pass roomId to game
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
            } else if (data.type === "game_started") {
                toast.success("遊戲開始！");
                const gameState = await gameApi.getGameStatus(data.game_id);
                navigate("/game", { state: { gameState, roomId } });
            }
        });

        return () => {
            unsubscribe();
            webSocketService.disconnect();
        };
    }, [roomId, navigate]);

    const handleJoin = async () => {
        if (!playerName.trim()) {
            toast.error("請輸入暱稱");
            return;
        }
        if (!roomId) return;

        setIsLoading(true);
        try {
            const response = await gameApi.joinRoom(parseInt(roomId), playerName);
            setIsJoined(true);
            setCurrentPlayerId(response.player.id);
            setRoom(response.room);
            toast.success("成功加入房間！");
        } catch (error) {
            console.error("Failed to join:", error);
            toast.error("加入房間失敗");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLeave = async () => {
        if (!roomId || !currentPlayerId) return;
        try {
            await gameApi.leaveRoom(parseInt(roomId), currentPlayerId);
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
        <div className="min-h-screen bg-game-gradient p-4 flex items-center justify-center">
            <Card className="w-full max-w-2xl bg-white/95 backdrop-blur">
                <CardHeader>
                    <CardTitle className="text-3xl text-center flex items-center justify-center gap-4">
                        <span>Room {roomId}</span>
                        <Badge variant="secondary" className="text-lg">
                            {room.player_count} / {room.max_players} 人
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">

                    {/* Player List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {room.players.map((player: any) => (
                            <div key={player.id} className="flex items-center p-3 bg-gray-100 rounded-lg shadow-sm">
                                <Avatar className="h-10 w-10 mr-3">
                                    <AvatarFallback className={player.is_ai ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}>
                                        {player.is_ai ? <Bot size={20} /> : <User size={20} />}
                                    </AvatarFallback>
                                </Avatar>
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

                    {/* Controls */}
                    {!isJoined ? (
                        <div className="flex gap-4 items-center justify-center pt-4 border-t">
                            <Input
                                placeholder="輸入你的暱稱..."
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                className="max-w-xs"
                            />
                            <Button onClick={handleJoin} disabled={isLoading || !playerName.trim()}>
                                加入房間
                            </Button>
                            <Button variant="outline" onClick={() => navigate("/lobby")}>
                                返回大廳
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4 pt-4 border-t">
                            <div className="flex justify-center gap-4">
                                <Button
                                    size="lg"
                                    className="w-full md:w-auto bg-green-600 hover:bg-green-700"
                                    onClick={handleStartGame}
                                    disabled={room.player_count < 2}
                                >
                                    <Play className="mr-2 h-5 w-5" /> 開始遊戲
                                </Button>

                                {room.player_count < room.max_players && (
                                    <Button variant="secondary" onClick={handleAddAI}>
                                        + 加入 AI
                                    </Button>
                                )}
                            </div>

                            <div className="flex justify-center">
                                <Button variant="ghost" onClick={handleLeave} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                    <LogOut className="mr-2 h-4 w-4" /> 離開房間
                                </Button>
                            </div>
                        </div>
                    )}

                </CardContent>
            </Card>
        </div>
    );
};

export default RoomWaiting;

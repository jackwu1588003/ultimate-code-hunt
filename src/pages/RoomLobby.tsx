import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { gameApi, Room } from "@/services/gameApi";
import { webSocketService } from "@/services/WebSocketService";
import { Users, Play, Lock } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";

const RoomLobby = () => {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRooms = async () => {
        try {
            const data = await gameApi.getRooms();
            setRooms(data.rooms);
        } catch (error) {
            console.error("Failed to fetch rooms:", error);
            toast.error("無法獲取房間列表");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();

        // Connect to WebSocket lobby channel
        webSocketService.connect("lobby");
        const unsubscribe = webSocketService.subscribe((data) => {
            if (data.type === "refresh") {
                fetchRooms();
            }
        });

        return () => {
            unsubscribe();
            webSocketService.disconnect();
        };
    }, []);

    const handleJoinRoom = (roomId: number) => {
        navigate(`/room/${roomId}`);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "waiting": return "bg-green-500";
            case "playing": return "bg-yellow-500";
            case "full": return "bg-red-500";
            default: return "bg-gray-500";
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case "waiting": return "等待中";
            case "playing": return "遊戲中";
            case "full": return "已滿";
            default: return "未知";
        }
    };

    return (
        <div className="min-h-screen bg-game-gradient p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-4xl font-bold text-white drop-shadow-lg">遊戲大廳</h1>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <Button variant="outline" onClick={() => navigate("/")}>返回首頁</Button>
                    </div>
                </div>

                <Card className="bg-white/90 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>房間列表 (1-100)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[70vh] pr-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {rooms.map((room) => (
                                    <Card
                                        key={room.room_id}
                                        className={`cursor-pointer transition-all hover:scale-105 hover:shadow-lg border-2 ${room.status === 'waiting' ? 'border-green-200 hover:border-green-400' :
                                            room.status === 'playing' ? 'border-yellow-200 hover:border-yellow-400' :
                                                'border-red-200 hover:border-red-400'
                                            }`}
                                        onClick={() => room.status === 'waiting' && handleJoinRoom(room.room_id)}
                                    >
                                        <CardContent className="p-4 flex flex-col items-center justify-center space-y-3">
                                            <div className="text-2xl font-bold text-gray-700">Room {room.room_id}</div>

                                            <Badge className={`${getStatusColor(room.status)} text-white px-3 py-1`}>
                                                {getStatusText(room.status)}
                                            </Badge>

                                            <div className="flex items-center space-x-2 text-gray-600">
                                                <Users className="w-5 h-5" />
                                                <span className="font-medium">{room.player_count} / {room.max_players}</span>
                                            </div>

                                            {room.status === 'playing' && (
                                                <div className="text-xs text-yellow-600 flex items-center">
                                                    <Play className="w-3 h-3 mr-1" /> 進行中
                                                </div>
                                            )}
                                            {room.status === 'full' && (
                                                <div className="text-xs text-red-600 flex items-center">
                                                    <Lock className="w-3 h-3 mr-1" /> 已滿員
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default RoomLobby;

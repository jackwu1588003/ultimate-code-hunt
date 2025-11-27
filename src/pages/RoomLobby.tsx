import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { gameApi, Room } from "@/services/gameApi";
import { webSocketService } from "@/services/WebSocketService";
import { Users, Lock } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const RoomLobby = () => {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [password, setPassword] = useState("");
    const [playerName, setPlayerName] = useState("");
    const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const data = await gameApi.getRooms();
                // @ts-ignore
                setRooms(data.rooms || data);
            } catch (error) {
                console.error("Failed to fetch rooms:", error);
                toast.error("無法獲取房間列表");
            }
        };

        fetchRooms();

        webSocketService.connect("lobby");
        const unsubscribe = webSocketService.subscribe((data) => {
            if (data.type === "lobby_update") {
                fetchRooms();
            }
        }, "lobby");

        return () => {
            unsubscribe();
            webSocketService.disconnect();
        };
    }, []);

    const handleRoomClick = (room: Room) => {
        setSelectedRoom(room);
        setPassword("");
        setPlayerName("");
        setIsJoinDialogOpen(true);
    };

    const handleJoinConfirm = async () => {
        if (!selectedRoom) return;
        if (!playerName.trim()) {
            toast.error("請輸入暱稱");
            return;
        }

        try {
            const response = await gameApi.joinRoom(selectedRoom.room_id, playerName, false, password);
            localStorage.setItem(`player_id_${selectedRoom.room_id}`, response.player.id.toString());
            setIsJoinDialogOpen(false);
            navigate(`/room/${selectedRoom.room_id}`);
            toast.success("成功加入房間");
        } catch (error: any) {
            toast.error(error.message || "加入失敗");
        }
    };

    return (
        <div className="min-h-screen bg-game-gradient p-4 relative">
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-white drop-shadow-md">遊戲大廳</h1>
                    <Button variant="secondary" onClick={() => navigate("/")}>返回首頁</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rooms.map((room) => (
                        <Card
                            key={room.room_id}
                            className="hover:shadow-lg transition-all cursor-pointer bg-white/90 dark:bg-card/90 backdrop-blur"
                            onClick={() => handleRoomClick(room)}
                        >
                            <CardHeader className="pb-2">
                                <CardTitle className="flex justify-between items-center text-lg">
                                    <span className="truncate">{room.name}</span>
                                    {room.has_password && <Lock className="w-4 h-4 text-yellow-500" />}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
                                    <span>ID: {room.room_id}</span>
                                    <Badge variant={room.status === 'playing' ? "destructive" : "secondary"}>
                                        {room.status === 'playing' ? '遊戲中' : '等待中'}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Users className="w-4 h-4" />
                                    <span>{room.player_count} / {room.max_players}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {rooms.length === 0 && (
                        <div className="col-span-full text-center py-12 text-white/80">
                            目前沒有房間，快去創建一個吧！
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>加入房間: {selectedRoom?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>您的暱稱</Label>
                            <Input
                                placeholder="輸入暱稱..."
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                            />
                        </div>

                        {selectedRoom?.has_password && (
                            <div className="space-y-2">
                                <Label>房間密碼</Label>
                                <Input
                                    type="password"
                                    placeholder="輸入密碼..."
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <div className="w-full flex flex-col sm:flex-row gap-2">
                            <Button variant="outline" onClick={() => setIsJoinDialogOpen(false)} className="w-full sm:w-auto">取消</Button>
                            <Button onClick={handleJoinConfirm} className="w-full sm:w-auto">加入</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default RoomLobby;

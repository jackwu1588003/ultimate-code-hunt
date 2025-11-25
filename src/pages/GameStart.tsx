import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Play, Users, Search, Plus } from "lucide-react";
import { gameApi } from "@/services/gameApi";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";

const GameStart = () => {
  const navigate = useNavigate();
  const [joinRoomId, setJoinRoomId] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [maxPlayers, setMaxPlayers] = useState(5);
  const [roomPassword, setRoomPassword] = useState("");
  const [creatorName, setCreatorName] = useState("");

  const handleCreateRoom = async () => {
    if (!creatorName.trim()) {
      toast.error("請輸入您的暱稱");
      return;
    }
    setIsCreating(true);
    try {
      const response = await gameApi.createRoom(maxPlayers, roomPassword, creatorName);
      toast.success(`成功創立房間：${response.room.name}`);
      // Save session for creator
      localStorage.setItem(`player_id_${response.room.room_id}`, response.player.id.toString());
      navigate(`/room/${response.room.room_id}`);
    } catch (error) {
      console.error("Failed to create room:", error);
      toast.error("無法創立房間");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = () => {
    if (!joinRoomId.trim()) {
      toast.error("請輸入房間號碼");
      return;
    }
    navigate(`/room/${joinRoomId}`);
  };

  return (
    <div className="min-h-screen bg-game-gradient flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md animate-slide-up bg-white/95 backdrop-blur dark:bg-card/95">
        <CardHeader className="text-center space-y-2 pb-8">
          <CardTitle className="text-5xl font-bold text-primary animate-fade-in">
            終極密碼
          </CardTitle>
          <p className="text-muted-foreground">多人連線猜數字對決</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Create Room */}
          <div className="space-y-3 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <h3 className="font-semibold mb-2">創立新房間</h3>

            <div className="space-y-2">
              <Label>您的暱稱</Label>
              <Input
                placeholder="輸入您的暱稱..."
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>人數上限: {maxPlayers}</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setMaxPlayers(Math.max(2, maxPlayers - 1))}
                  disabled={maxPlayers <= 2}
                >
                  -
                </Button>
                <span className="w-4 text-center">{maxPlayers}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setMaxPlayers(Math.min(10, maxPlayers + 1))}
                  disabled={maxPlayers >= 10}
                >
                  +
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>房間密碼 (選填)</Label>
              <Input
                type="password"
                placeholder="留空則不設密碼"
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
              />
            </div>

            <Button
              size="lg"
              className="w-full mt-4 animate-pulse-glow"
              onClick={handleCreateRoom}
              disabled={isCreating || !creatorName.trim()}
            >
              <Plus className="w-6 h-6 mr-2" />
              {isCreating ? "創建中..." : "創立並加入"}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                或
              </span>
            </div>
          </div>

          {/* Join Room */}
          <div className="space-y-3">
            <Label className="text-lg">加入現有房間</Label>
            <div className="flex gap-2">
              <Input
                placeholder="輸入房間號碼"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                type="number"
                className="text-lg"
              />
              <Button size="lg" onClick={handleJoinRoom}>
                <Play className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Browse Rooms */}
          <Button
            variant="outline"
            size="lg"
            className="w-full text-lg py-6"
            onClick={() => navigate("/lobby")}
          >
            <Search className="w-5 h-5 mr-2" />
            瀏覽所有房間
          </Button>

          <div className="pt-4 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/stats")}
              className="text-muted-foreground"
            >
              查看戰績排行榜
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GameStart;

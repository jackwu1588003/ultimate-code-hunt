import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Play, Users, Search, Plus, Dices } from "lucide-react";
import { gameApi } from "@/services/gameApi";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";

const GameStart = () => {
  const navigate = useNavigate();
  const [joinRoomId, setJoinRoomId] = useState("");
  const [joinRoomPassword, setJoinRoomPassword] = useState("");
  const [showJoinPasswordField, setShowJoinPasswordField] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [maxPlayers, setMaxPlayers] = useState(5);
  const [roomPassword, setRoomPassword] = useState("");
  const [creatorName, setCreatorName] = useState("");

  const generateRandomName = () => {
    const adjectives = ["快樂的", "勇敢的", "神秘的", "幸運的", "瘋狂的", "超級", "無敵", "閃亮", "傳奇", "終極"];
    const nouns = ["玩家", "戰士", "法師", "獵人", "忍者", "騎士", "冒險者", "大師", "專家", "新手"];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}`;
  };

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

    const doJoin = async () => {
      setIsCreating(true);
      try {
        const room = await gameApi.getRoom(parseInt(joinRoomId));

        if (room.has_password && !joinRoomPassword) {
          // Ask user to input password first
          setShowJoinPasswordField(true);
          setIsCreating(false);
          return;
        }

        const playerName = creatorName.trim() || generateRandomName();
        const resp = await gameApi.joinRoom(parseInt(joinRoomId), playerName, false, joinRoomPassword || undefined);
        // Save session and navigate into room
        localStorage.setItem(`player_id_${joinRoomId}`, resp.player.id.toString());
        toast.success("成功加入房間");
        navigate(`/room/${joinRoomId}`);
      } catch (e: any) {
        console.error("Join failed:", e);
        toast.error(e?.message || "加入房間失敗");
      } finally {
        setIsCreating(false);
      }
    };

    doJoin();
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
              <div className="flex items-center gap-2">
                <Input
                  placeholder="輸入您的暱稱..."
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="icon"
                  title="隨機名稱"
                  onClick={() => setCreatorName(generateRandomName())}
                >
                  <Dices className="w-4 h-4" />
                </Button>
              </div>
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

            {/* <div className="space-y-2">
              <Label>房間密碼 (選填)</Label>
              <Input
                type="password"
                placeholder="留空則不設密碼"
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
              />
            </div> */}

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

            {/* Main input + button: stack on mobile, inline on sm+ */}
            <div className="flex flex-col sm:flex-row gap-2 w-full items-stretch">
              <Input
                placeholder="輸入房間號碼"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                type="number"
                className="text-lg flex-1"
              />

              <Button size="lg" className="w-full sm:w-auto" onClick={handleJoinRoom}>
                <Play className="w-5 h-5" />
              </Button>
            </div>

            {showJoinPasswordField && (
              <div className="mt-2">
                <Label>房間密碼</Label>
                <div className="flex flex-col sm:flex-row gap-2 w-full items-stretch">
                  <Input
                    type="password"
                    placeholder="輸入房間密碼"
                    value={joinRoomPassword}
                    onChange={(e) => setJoinRoomPassword(e.target.value)}
                    className="flex-1"
                  />
                  <Button size="lg" className="w-full sm:w-auto" onClick={handleJoinRoom}>確認</Button>
                </div>
              </div>
            )}
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

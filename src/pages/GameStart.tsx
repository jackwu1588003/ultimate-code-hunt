import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Minus, Plus, Play } from "lucide-react";
import { gameApi } from "@/services/gameApi";
import { toast } from "sonner";

const GameStart = () => {
  const navigate = useNavigate();
  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState<string[]>(["玩家 1", "玩家 2"]);
  const [isStarting, setIsStarting] = useState(false);

  const updatePlayerCount = (delta: number) => {
    const newCount = Math.max(2, Math.min(5, playerCount + delta));
    setPlayerCount(newCount);

    const newNames = [...playerNames];
    if (delta > 0) {
      newNames.push(`玩家 ${newCount}`);
    } else {
      newNames.pop();
    }
    setPlayerNames(newNames);
  };

  const updatePlayerName = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const startGame = async () => {
    // Validate all names are filled
    if (playerNames.some((name) => !name.trim())) {
      toast.error("請填寫所有玩家名稱");
      return;
    }

    setIsStarting(true);
    try {
      const response = await gameApi.startGame({ players: playerNames });
      toast.success("遊戲開始！");
      navigate("/game", { state: { gameState: response } });
    } catch (error) {
      console.error("Failed to start game:", error);
      toast.error("無法連接到遊戲伺服器，請確認後端是否運行");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-game-gradient flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl animate-slide-up">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-5xl font-bold text-primary animate-fade-in">
            終極密碼對決
          </CardTitle>
          <p className="text-muted-foreground">2-5 位玩家的刺激對決</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Player Count Selector */}
          <div className="space-y-3">
            <Label className="text-lg">玩家人數</Label>
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => updatePlayerCount(-1)}
                disabled={playerCount <= 2}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="text-4xl font-bold text-primary w-20 text-center">
                {playerCount}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => updatePlayerCount(1)}
                disabled={playerCount >= 5}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Player Names */}
          <div className="space-y-3">
            <Label className="text-lg">玩家名稱</Label>
            <div className="grid gap-3">
              {playerNames.map((name, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground w-16">
                    玩家 {index + 1}
                  </span>
                  <Input
                    value={name}
                    onChange={(e) => updatePlayerName(index, e.target.value)}
                    placeholder={`玩家 ${index + 1} 的名稱`}
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <Button
            size="lg"
            className="w-full text-xl py-6 animate-pulse-glow"
            onClick={startGame}
            disabled={isStarting}
          >
            <Play className="w-6 h-6 mr-2" />
            {isStarting ? "啟動中..." : "開始遊戲"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default GameStart;

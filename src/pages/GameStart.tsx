import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Minus, Plus, Play, Bot, User } from "lucide-react";
import { gameApi } from "@/services/gameApi";
import { toast } from "sonner";
import { PlayerConfig } from "@/types/game";

const GameStart = () => {
  const navigate = useNavigate();
  const [playerCount, setPlayerCount] = useState(2);
  const [players, setPlayers] = useState<PlayerConfig[]>([
    { name: "玩家 1", is_ai: false },
    { name: "玩家 2", is_ai: false },
  ]);
  const [isStarting, setIsStarting] = useState(false);

  const updatePlayerCount = (delta: number) => {
    const newCount = Math.max(2, Math.min(5, playerCount + delta));
    setPlayerCount(newCount);

    const newPlayers = [...players];
    if (delta > 0) {
      newPlayers.push({ name: `玩家 ${newCount}`, is_ai: false });
    } else {
      newPlayers.pop();
    }
    setPlayers(newPlayers);
  };

  const updatePlayer = (index: number, updates: Partial<PlayerConfig>) => {
    const newPlayers = [...players];
    newPlayers[index] = { ...newPlayers[index], ...updates };
    setPlayers(newPlayers);
  };

  const startGame = async () => {
    // Validate all names are filled
    if (players.some((p) => !p.name.trim())) {
      toast.error("請填寫所有玩家名稱");
      return;
    }

    setIsStarting(true);
    try {
      const response = await gameApi.startGame({ players });
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

          {/* Player Configuration */}
          <div className="space-y-3">
            <Label className="text-lg">玩家設定</Label>
            <div className="grid gap-3">
              {players.map((player, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 border rounded-lg bg-card/50"
                >
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-sm font-medium text-muted-foreground w-16">
                      玩家 {index + 1}
                    </span>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={player.is_ai}
                        onCheckedChange={(checked) =>
                          updatePlayer(index, {
                            is_ai: checked,
                            name: checked ? `AI-${index + 1}` : `玩家 ${index + 1}`,
                            difficulty: checked ? "medium" : undefined,
                          })
                        }
                      />
                      {player.is_ai ? (
                        <Bot className="w-4 h-4 text-primary" />
                      ) : (
                        <User className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 flex gap-2 w-full">
                    <Input
                      value={player.name}
                      onChange={(e) => updatePlayer(index, { name: e.target.value })}
                      placeholder={`玩家 ${index + 1} 的名稱`}
                      className="flex-1"
                    />

                    {player.is_ai && (
                      <Select
                        value={player.difficulty}
                        onValueChange={(value: "easy" | "medium" | "hard") =>
                          updatePlayer(index, { difficulty: value })
                        }
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue placeholder="難度" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">簡單</SelectItem>
                          <SelectItem value="medium">中等</SelectItem>
                          <SelectItem value="hard">困難</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full text-xl py-6 animate-pulse-glow"
              onClick={startGame}
              disabled={isStarting}
            >
              <Play className="w-6 h-6 mr-2" />
              {isStarting ? "啟動中..." : "開始遊戲"}
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => navigate("/stats")}
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

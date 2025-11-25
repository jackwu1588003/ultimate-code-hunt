import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, RotateCcw, Home } from "lucide-react";
import { GameState } from "@/types/game";

const GameResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const gameState = location.state?.gameState as GameState | null;
  const roomId = location.state?.roomId;

  useEffect(() => {
    if (!gameState || !gameState.game_over) {
      navigate("/");
    }
  }, [gameState, navigate]);

  if (!gameState) return null;

  const winner = gameState.players.find((p) => p.id === gameState.winner);
  const eliminatedPlayers = gameState.players.filter((p) => !p.is_alive);

  return (
    <div className="min-h-screen bg-game-gradient flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl animate-slide-up">
        <CardHeader className="text-center space-y-6 pb-8">
          {/* Trophy Animation */}
          <div className="flex justify-center">
            <div className="relative">
              <Trophy className="w-32 h-32 text-warning animate-bounce-in" />
              <div className="absolute inset-0 animate-pulse-glow" />
            </div>
          </div>

          {/* Winner Announcement */}
          <div className="space-y-2">
            <h1 className="text-6xl font-bold text-primary animate-fade-in">
              遊戲結束！
            </h1>
            <p className="text-3xl font-semibold text-foreground animate-fade-in delay-100">
              🎉 恭喜 {winner?.name} 獲勝！ 🎉
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Game Statistics */}
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-warning" />
                遊戲統計
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">總回合數</span>
                <Badge variant="default" className="text-lg">
                  {gameState.current_round} 輪
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">參賽人數</span>
                <Badge variant="default" className="text-lg">
                  {gameState.players.length} 人
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Elimination Order */}
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle>淘汰順序</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {eliminatedPlayers.reverse().map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-card rounded-lg animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-12 text-center">
                        #{eliminatedPlayers.length - index}
                      </Badge>
                      <span className="font-medium">{player.name}</span>
                    </div>
                    <Badge variant="destructive">已淘汰</Badge>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 bg-success/10 border-2 border-success rounded-lg animate-fade-in">
                  <div className="flex items-center gap-3">
                    <Badge className="w-12 text-center bg-warning">
                      #1
                    </Badge>
                    <span className="font-bold text-lg">{winner?.name}</span>
                  </div>
                  <Badge className="bg-success">勝利</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <Button
              size="lg"
              variant="default"
              onClick={() => roomId ? navigate(`/room/${roomId}`) : navigate("/lobby")}
              className="text-lg py-6"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              {roomId ? "返回房間" : "返回大廳"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/")}
              className="text-lg py-6"
            >
              <Home className="w-5 h-5 mr-2" />
              返回首頁
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GameResult;

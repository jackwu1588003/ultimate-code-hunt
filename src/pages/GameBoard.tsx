import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayerCard } from "@/components/PlayerCard";
import { NumberGrid } from "@/components/NumberGrid";
import { PlayerList } from "@/components/PlayerList";
import { CircleSlash, RotateCcw, ArrowRight } from "lucide-react";
import { gameApi } from "@/services/gameApi";
import { GameState } from "@/types/game";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const GameBoard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState | null>(
    location.state?.gameState || null
  );
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExploding, setIsExploding] = useState(false);

  useEffect(() => {
    if (!gameState) {
      navigate("/");
    }
  }, [gameState, navigate]);

  if (!gameState) return null;

  const currentPlayer = gameState.players.find((p) => p.id === gameState.current_player);
  const alivePlayers = gameState.players.filter((p) => p.is_alive);

  const handleNumberSelect = (number: number) => {
    if (selectedNumbers.includes(number)) {
      setSelectedNumbers(selectedNumbers.filter((n) => n !== number));
    } else if (selectedNumbers.length < 3) {
      // Check if consecutive
      if (selectedNumbers.length > 0) {
        const sorted = [...selectedNumbers, number].sort((a, b) => a - b);
        const isConsecutive = sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1);
        if (!isConsecutive) {
          toast.error("只能選擇連續的號碼！");
          return;
        }
      }
      setSelectedNumbers([...selectedNumbers, number].sort((a, b) => a - b));
    } else {
      toast.error("最多只能選擇 3 個號碼！");
    }
  };

  const handleCallNumbers = async () => {
    if (selectedNumbers.length === 0) {
      toast.error("請至少選擇一個號碼！");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await gameApi.callNumbers({
        game_id: gameState.game_id,
        player_id: gameState.current_player,
        numbers: selectedNumbers,
      });

      if (response.hit_secret) {
        // Explosion animation
        setIsExploding(true);
        toast.error(`💥 踩雷了！${currentPlayer?.name} 被淘汰！`, {
          duration: 3000,
        });

        setTimeout(() => {
          setIsExploding(false);
        }, 600);
      } else {
        toast.success("安全！");
      }

      // Update game state
      const updatedState = await gameApi.getGameStatus(gameState.game_id);
      setGameState(updatedState);
      setSelectedNumbers([]);

      // Check if game is over
      if (updatedState.game_over) {
        setTimeout(() => {
          navigate("/result", { state: { gameState: updatedState } });
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to call numbers:", error);
      toast.error("操作失敗，請重試");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePass = async () => {
    if (!currentPlayer?.pass_available) {
      toast.error("本輪 Pass 已使用！");
      return;
    }

    setIsProcessing(true);
    try {
      await gameApi.pass({
        game_id: gameState.game_id,
        player_id: gameState.current_player,
      });

      toast.success(`${currentPlayer?.name} 使用了 Pass！`);

      const updatedState = await gameApi.getGameStatus(gameState.game_id);
      setGameState(updatedState);
    } catch (error) {
      console.error("Failed to pass:", error);
      toast.error("操作失敗，請重試");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReverse = async () => {
    if (!currentPlayer?.reverse_available) {
      toast.error("本輪迴轉已使用！");
      return;
    }

    setIsProcessing(true);
    try {
      await gameApi.reverse({
        game_id: gameState.game_id,
        player_id: gameState.current_player,
      });

      toast.success(`${currentPlayer?.name} 使用了迴轉！順序反轉！`);

      const updatedState = await gameApi.getGameStatus(gameState.game_id);
      setGameState(updatedState);
    } catch (error) {
      console.error("Failed to reverse:", error);
      toast.error("操作失敗，請重試");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-game-gradient p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top Info Bar */}
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <Badge variant="default" className="text-lg px-4 py-2">
                第 {gameState.current_round} 輪
              </Badge>
              <Badge variant="outline" className="text-lg px-4 py-2">
                範圍：{gameState.number_range[0]} - {gameState.number_range[1]}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">剩餘玩家：</span>
              <span className="text-xl font-bold text-success">{alivePlayers.length}</span>
            </div>
          </CardContent>
        </Card>

        {/* Current Player Card */}
        {currentPlayer && (
          <div className="animate-slide-up">
            <PlayerCard player={currentPlayer} isActive={true} isLarge={true} />
          </div>
        )}

        {/* Number Grid */}
        <Card className={cn(isExploding && "animate-shake")}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>選擇號碼（最多 3 個連續號碼）</span>
              {selectedNumbers.length > 0 && (
                <Badge variant="default" className="text-lg animate-bounce-in">
                  已選：{selectedNumbers.join(", ")}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NumberGrid
              range={gameState.number_range}
              calledNumbers={gameState.called_numbers}
              selectedNumbers={selectedNumbers}
              onNumberSelect={handleNumberSelect}
              disabled={isProcessing}
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            size="lg"
            onClick={handleCallNumbers}
            disabled={isProcessing || selectedNumbers.length === 0}
            className="text-lg py-6"
          >
            <ArrowRight className="w-5 h-5 mr-2" />
            確認喊號 {selectedNumbers.length > 0 && `(${selectedNumbers.length}個)`}
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={handlePass}
            disabled={isProcessing || !currentPlayer?.pass_available}
            className="text-lg py-6"
          >
            <CircleSlash className="w-5 h-5 mr-2" />
            使用 Pass
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={handleReverse}
            disabled={isProcessing || !currentPlayer?.reverse_available}
            className="text-lg py-6"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            使用迴轉
          </Button>
        </div>

        {/* Player List */}
        <PlayerList players={gameState.players} currentPlayerId={gameState.current_player} />

        {/* Explosion Effect Overlay */}
        {isExploding && (
          <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
            <div className="text-9xl animate-explode">💥</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBoard;

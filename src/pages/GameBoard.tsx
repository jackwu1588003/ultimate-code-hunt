import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayerCard } from "@/components/PlayerCard";
import { NumberGrid } from "@/components/NumberGrid";
import { PlayerList } from "@/components/PlayerList";
import { CircleSlash, RotateCcw, ArrowRight } from "lucide-react";
import { gameApi } from "@/services/gameApi";
import { GameState } from "@/types/game";
import { webSocketService } from "@/services/WebSocketService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

const GameBoard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams(); // Get roomId from URL
  const [gameState, setGameState] = useState<GameState | null>(
    location.state?.gameState || null
  );
  // const roomId = location.state?.roomId; // No longer needed from state

  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExploding, setIsExploding] = useState(false);

  useEffect(() => {
    const initializeGame = async () => {
      if (!gameState && roomId) {
        try {
          // 1. Get room info to find game_id
          const roomData = await gameApi.getRoom(parseInt(roomId));
          if (roomData.game_id) {
            // 2. Get game state
            const state = await gameApi.getGameStatus(roomData.game_id);
            setGameState(state);
          } else {
            // Room exists but no game? Redirect to lobby or room waiting
            navigate(`/room/${roomId}`);
          }
        } catch (error) {
          console.error("Failed to recover game state:", error);
          navigate("/");
        }
      } else if (!gameState && !roomId) {
        navigate("/");
      }
    };

    initializeGame();
  }, [gameState, roomId, navigate]);

  if (!gameState) return null;

  useEffect(() => {
    if (!gameState) return;

    const currentPlayer = gameState.players.find((p) => p.id === gameState.current_player);

    if (currentPlayer?.is_ai && !gameState.game_over) {
      const performAiAction = async () => {
        setIsProcessing(true);
        // Simulate thinking time
        await new Promise((resolve) => setTimeout(resolve, 1500));

        try {
          const response = await gameApi.aiAction(gameState.game_id);

          // Handle response similar to human action
          if ('hit_secret' in response && response.hit_secret) {
            setIsExploding(true);
            toast.error(`💥 踩雷了！${currentPlayer.name} 被淘汰！`, {
              duration: 3000,
            });
            setTimeout(() => setIsExploding(false), 600);
          } else if ('action' in response && response.action === 'pass') { // Note: Backend response might need normalization or check specific fields
            toast.success(`${currentPlayer.name} 使用了 Pass！`);
          } else if ('new_direction' in response) {
            toast.success(`${currentPlayer.name} 使用了迴轉！`);
          } else {
            const callResponse = response as any; // Type assertion if needed, or better check
            if (callResponse.called_numbers) {
              const numbers = callResponse.called_numbers.filter((n: number) => !gameState.called_numbers.includes(n));
              // This logic is a bit complex because response returns ALL called numbers. 
              // Better to just say AI acted.
              toast.success(`${currentPlayer.name} 完成了行動`);
            }
          }

          const updatedState = await gameApi.getGameStatus(gameState.game_id);
          setGameState(updatedState);

          if (updatedState.game_over) {
            setTimeout(() => {
              navigate("/result", { state: { gameState: updatedState, roomId } });
            }, 2000);
          }
        } catch (error) {
          console.error("AI Action failed:", error);
          toast.error("AI 發生錯誤");
        } finally {
          setIsProcessing(false);
        }
      };

      performAiAction();
    }
  }, [gameState?.current_player, gameState?.game_id]); // Only trigger when current player changes

  // Subscribe to room WebSocket updates so this board updates in real-time
  useEffect(() => {
    if (!roomId) return;
    webSocketService.connect(`room_${roomId}`);
    const unsubscribe = webSocketService.subscribe(async (data) => {
      try {
        if (data.type === "room_update" && data.game) {
          const incoming = data.game as GameState;

          // Partial merge: only update state if there are real differences
          setGameState((prev) => {
            if (!prev) return incoming;

            const shallowEqual = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

            const calledEqual = shallowEqual(prev.called_numbers, incoming.called_numbers);
            const playersEqual = shallowEqual(prev.players, incoming.players);
            const rangeEqual = shallowEqual(prev.number_range, incoming.number_range);
            const roundEqual = prev.current_round === incoming.current_round;
            const currentPlayerEqual = prev.current_player === incoming.current_player;
            const directionEqual = prev.direction === incoming.direction;
            const gameOverEqual = prev.game_over === incoming.game_over;

            if (calledEqual && playersEqual && rangeEqual && roundEqual && currentPlayerEqual && directionEqual && gameOverEqual) {
              // No effective changes
              return prev;
            }

            // Merge selectively to avoid wholesale replace where not needed
            const merged: GameState = {
              ...prev,
              ...incoming,
              // prefer arrays from incoming
              called_numbers: incoming.called_numbers,
              players: incoming.players,
            };

            // If incoming indicates game over, navigate after state update
            if (incoming.game_over) {
              setTimeout(() => {
                navigate("/result", { state: { gameState: merged, roomId } });
              }, 800);
            }

            return merged;
          });

        } else if (data.type === "game_started") {
          if (data.game_id) {
            const s = await gameApi.getGameStatus(data.game_id);
            setGameState(s as GameState);
          }
        }
      } catch (e) {
        console.error("Failed to handle WS message in GameBoard:", e);
      }
    });

    return () => {
      unsubscribe();
      webSocketService.disconnect();
    };
  }, [roomId]);

  if (!gameState) return null;

  const currentPlayer = gameState.players.find((p) => p.id === gameState.current_player);
  const alivePlayers = gameState.players.filter((p) => p.is_alive);

  // Get local player ID
  const localPlayerId = parseInt(localStorage.getItem(`player_id_${roomId}`) || "0");
  const isMyTurn = currentPlayer?.id === localPlayerId;

  console.log("Debug GameBoard:", {
    roomId,
    localPlayerId,
    currentPlayerId: currentPlayer?.id,
    isMyTurn,
    localStorageKey: `player_id_${roomId}`,
    localStorageValue: localStorage.getItem(`player_id_${roomId}`)
  });

  // Calculate the last called number to enforce consecutive selection
  const lastCalledNumber = gameState.called_numbers.length > 0
    ? Math.max(...gameState.called_numbers)
    : gameState.number_range[0] - 1;

  const isNumberDisabled = (number: number) => {
    // If already called, it's disabled (handled by NumberGrid internally too, but good for completeness)
    if (gameState.called_numbers.includes(number)) return true;

    // If no numbers selected yet, only allow the next consecutive number
    if (selectedNumbers.length === 0) {
      return number !== lastCalledNumber + 1;
    }

    // If numbers are selected, enforce LIFO selection/deselection
    const maxSelected = Math.max(...selectedNumbers);

    // Allow selecting the next number in sequence
    if (number === maxSelected + 1) return false;

    // Allow deselecting the LAST selected number (LIFO)
    if (number === maxSelected) return false;

    return true;
  };

  const handleNumberSelect = (number: number) => {
    if (currentPlayer?.is_ai || !isMyTurn) return;

    if (selectedNumbers.includes(number)) {
      // Deselect logic: Only allow deselecting the last one
      const maxSelected = Math.max(...selectedNumbers);
      if (number === maxSelected) {
        setSelectedNumbers(selectedNumbers.filter((n) => n !== number));
      } else {
        toast.error("只能取消選擇最後一個號碼！");
      }
    } else if (selectedNumbers.length < 3) {
      // Select logic: Must be consecutive
      const maxSelected = selectedNumbers.length > 0 ? Math.max(...selectedNumbers) : lastCalledNumber;

      if (number === maxSelected + 1) {
        setSelectedNumbers([...selectedNumbers, number].sort((a, b) => a - b));
      } else {
        toast.error("只能選擇連續的號碼！");
      }
    } else {
      toast.error("最多只能選擇 3 個號碼！");
    }
  };

  const handleCallNumbers = async () => {
    if (currentPlayer?.is_ai || !isMyTurn) return;
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
          navigate("/result", { state: { gameState: updatedState, roomId } });
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
    if (currentPlayer?.is_ai || !isMyTurn) return;
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
    if (currentPlayer?.is_ai || !isMyTurn) return;
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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">剩餘玩家：</span>
                <span className="text-xl font-bold text-success">{alivePlayers.length}</span>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        {/* Hints Section */}
        {gameState.hints && gameState.hints.length > 0 && (
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-2 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="text-2xl">💡</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-muted-foreground mb-2">遊戲提示</div>
                  <div className="flex flex-wrap gap-2">
                    {gameState.hints.map((hint, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-base px-3 py-1.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm"
                      >
                        {hint}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Player Card */}
        {currentPlayer && (
          <div className="animate-slide-up">
            <PlayerCard
              player={currentPlayer}
              isActive={true}
              isLarge={true}
              status={isProcessing && currentPlayer.is_ai ? "AI 思考中..." : (!isMyTurn && !currentPlayer.is_ai ? "等待對手行動..." : undefined)}
            />
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
              disabled={isProcessing || currentPlayer?.is_ai || !isMyTurn}
              isNumberDisabled={isNumberDisabled}
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            size="lg"
            onClick={handleCallNumbers}
            disabled={isProcessing || selectedNumbers.length === 0 || currentPlayer?.is_ai || !isMyTurn}
            className="text-lg py-6"
          >
            <ArrowRight className="w-5 h-5 mr-2" />
            確認喊號 {selectedNumbers.length > 0 && `(${selectedNumbers.length}個)`}
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={handlePass}
            disabled={isProcessing || !currentPlayer?.pass_available || currentPlayer?.is_ai || !isMyTurn}
            className="text-lg py-6"
          >
            <CircleSlash className="w-5 h-5 mr-2" />
            使用 Pass
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={handleReverse}
            disabled={isProcessing || !currentPlayer?.reverse_available || currentPlayer?.is_ai || !isMyTurn}
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

import { Player } from "@/types/game";
import { ChevronDown, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerListProps {
  players: Player[];
  currentPlayerId: number;
}

export const PlayerList = ({ players, currentPlayerId }: PlayerListProps) => {
  return (
    <div className="flex items-center justify-center gap-4 p-4 bg-card/50 rounded-lg overflow-x-auto">
      {players.map((player) => {
        const isActive = player.id === currentPlayerId;

        return (
          <div key={player.id} className="flex flex-col items-center gap-2 min-w-[80px]">
            {/* Active Indicator */}
            {isActive && (
              <ChevronDown className="w-6 h-6 text-primary animate-bounce" />
            )}

            {/* Player Avatar */}
            <div
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300",
                player.is_alive
                  ? "bg-success/20 border-2 border-success"
                  : "bg-danger/20 border-2 border-danger grayscale",
                isActive && "scale-125 ring-4 ring-primary shadow-lg shadow-primary/50"
              )}
            >
              <User className={cn("w-7 h-7", player.is_alive ? "text-success" : "text-danger")} />
            </div>

            {/* Player Name */}
            <span
              className={cn(
                "text-sm font-medium text-center",
                !player.is_alive && "line-through opacity-50"
              )}
            >
              {player.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};

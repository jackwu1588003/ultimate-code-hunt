import { Player } from "@/types/game";
import { ChevronDown, User } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
            {(() => {
              const AVATAR_POOL = [
                '118725_0.jpg','119365_0.jpg','121298_0.jpg','121299_0.jpg','121300_0.jpg',
                '121301_0.jpg','121302_0.jpg','121303_0.jpg','121304_0.jpg','121307_0.jpg'
              ];
              const idNum = typeof player.id === 'number' ? Math.abs(player.id) : 0;
              const avatarFilename = AVATAR_POOL[idNum % AVATAR_POOL.length];

              return (
                <Avatar className={cn(
                  "w-14 h-14 rounded-full overflow-hidden flex items-center justify-center transition-all duration-300",
                  player.is_alive
                    ? "bg-success/20 border-2 border-success"
                    : "bg-danger/20 border-2 border-danger grayscale",
                  isActive && "scale-125 ring-4 ring-primary shadow-lg shadow-primary/50"
                )}>
                  <AvatarImage avatarFilename={avatarFilename} requestedSize={56} alt={player.name} />
                  <AvatarFallback>
                    <User className={cn("w-7 h-7", player.is_alive ? "text-success" : "text-danger")} />
                  </AvatarFallback>
                </Avatar>
              );
            })()}

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

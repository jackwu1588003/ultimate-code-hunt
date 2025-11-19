import { Player } from "@/types/game";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, CircleSlash, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerCardProps {
  player: Player;
  isActive: boolean;
  isLarge?: boolean;
}

export const PlayerCard = ({ player, isActive, isLarge = false }: PlayerCardProps) => {
  return (
    <Card
      className={cn(
        "relative transition-all duration-300",
        isLarge ? "p-6" : "p-4",
        isActive && "ring-4 ring-primary shadow-lg shadow-primary/50",
        !player.is_alive && "opacity-50 grayscale"
      )}
    >
      {/* Status Indicator */}
      <div
        className={cn(
          "absolute top-2 right-2 w-3 h-3 rounded-full",
          player.is_alive ? "bg-success animate-pulse" : "bg-danger"
        )}
      />

      {/* Player Avatar */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className={cn(
            "rounded-full bg-primary/20 flex items-center justify-center",
            isLarge ? "w-16 h-16" : "w-12 h-12"
          )}
        >
          <User className={cn(isLarge ? "w-8 h-8" : "w-6 h-6", "text-primary")} />
        </div>
        <div>
          <h3 className={cn("font-bold", isLarge ? "text-2xl" : "text-lg")}>
            {player.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {player.is_alive ? "存活中" : "已淘汰"}
          </p>
        </div>
      </div>

      {/* Available Actions */}
      {player.is_alive && (
        <div className="flex gap-2">
          <Badge
            variant={player.pass_available ? "default" : "secondary"}
            className="flex items-center gap-1"
          >
            <CircleSlash className="w-3 h-3" />
            Pass {player.pass_available ? "✓" : "✗"}
          </Badge>
          <Badge
            variant={player.reverse_available ? "default" : "secondary"}
            className="flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            迴轉 {player.reverse_available ? "✓" : "✗"}
          </Badge>
        </div>
      )}

      {/* Eliminated Overlay */}
      {!player.is_alive && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/90 rounded-lg">
          <span className="text-4xl font-bold text-danger animate-bounce-in">OUT</span>
        </div>
      )}
    </Card>
  );
};

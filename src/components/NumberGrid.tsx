import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NumberGridProps {
  range: [number, number];
  calledNumbers: number[];
  selectedNumbers: number[];
  onNumberSelect: (number: number) => void;
  disabled?: boolean;
  isNumberDisabled?: (number: number) => boolean;
  recentCallNumbers?: number[];
  recentCallPlayerId?: number;
  numberOwners?: Record<number, number>; // Map of number -> player_id
  players?: { id: number; name: string }[]; // List of players to look up names/colors
}

export const NumberGrid = ({
  range = [1, 100],
  calledNumbers = [],
  selectedNumbers = [],
  onNumberSelect,
  disabled = false,
  isNumberDisabled,
  recentCallNumbers = [],
  numberOwners = {},
  players = [],
}: NumberGridProps) => {
  // console.log("NumberGrid Render:", { range, calledNumbers, selectedNumbers });
  const [min, max] = range || [1, 100];
  const numbers = Array.from({ length: (max || 100) - (min || 1) + 1 }, (_, i) => (min || 1) + i);

  const isNumberCalled = (num: number) => Array.isArray(calledNumbers) && calledNumbers.includes(num);
  const isNumberSelected = (num: number) => Array.isArray(selectedNumbers) && selectedNumbers.includes(num);

  // Helper to get player color/info
  const getOwnerInfo = (num: number) => {
    const ownerId = numberOwners[num];
    if (ownerId === undefined) return null;
    const player = players.find(p => p.id === ownerId);
    return player;
  };

  // Generate a consistent color based on player ID (simplified)
  const getPlayerColorClass = (playerId: number) => {
    const colors = [
      "border-red-500 text-red-600 bg-red-50 dark:bg-red-900/20",
      "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20",
      "border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20",
      "border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20",
      "border-purple-500 text-purple-600 bg-purple-50 dark:bg-purple-900/20",
      "border-pink-500 text-pink-600 bg-pink-50 dark:bg-pink-900/20",
      "border-indigo-500 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20",
      "border-cyan-500 text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20",
    ];
    return colors[Math.abs(playerId) % colors.length];
  };

  return (
    <div className="grid grid-cols-6 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 p-3">
      {numbers.map((num) => {
        const isCalled = isNumberCalled(num);
        const isSelected = isNumberSelected(num);
        const isDisabled = disabled || isCalled || (isNumberDisabled ? isNumberDisabled(num) : false);
        const isRecent = Array.isArray(recentCallNumbers) && recentCallNumbers.includes(num);

        const owner = isCalled ? getOwnerInfo(num) : null;
        const ownerColorClass = owner ? getPlayerColorClass(owner.id) : "";

        return (
          <div key={num} className="relative group">
            <Button
              variant={isSelected ? "default" : isCalled ? "secondary" : "outline"}
              size="icon"
              disabled={isDisabled}
              onClick={() => onNumberSelect(num)}
              className={cn(
                // Fixed square sizes per breakpoint
                "h-12 w-12 text-sm sm:h-14 sm:w-14 sm:text-base font-bold rounded-xl transition-all duration-200 transform",
                // Selected / called / default visual tweaks
                isSelected && "bg-warning hover:bg-warning/90 animate-bounce-in ring-2 ring-warning",
                // isCalled && "cursor-not-allowed opacity-50 bg-muted/10", // Original
                isCalled && !owner && "cursor-not-allowed opacity-50 bg-muted/10", // Fallback if no owner
                isCalled && owner && cn("cursor-not-allowed opacity-80 border-2", ownerColorClass), // Owner style

                isRecent && !isCalled && "ring-2 ring-primary/60 bg-primary/10 animate-pulse",
                !isCalled && !isSelected && !isRecent && "bg-white/60 dark:bg-gray-800/60 hover:scale-105",
                !isCalled && !isSelected && "border border-white/10"
              )}
            >
              {num}
            </Button>
            {/* Tooltip for owner name */}
            {owner && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {owner.name}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

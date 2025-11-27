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
}

export const NumberGrid = ({
  range = [1, 100],
  calledNumbers = [],
  selectedNumbers = [],
  onNumberSelect,
  disabled = false,
  isNumberDisabled,
  recentCallNumbers = [],
}: NumberGridProps) => {
  console.log("NumberGrid Render:", { range, calledNumbers, selectedNumbers });
  const [min, max] = range || [1, 100];
  const numbers = Array.from({ length: (max || 100) - (min || 1) + 1 }, (_, i) => (min || 1) + i);

  const isNumberCalled = (num: number) => Array.isArray(calledNumbers) && calledNumbers.includes(num);
  const isNumberSelected = (num: number) => Array.isArray(selectedNumbers) && selectedNumbers.includes(num);

  return (
    <div className="grid grid-cols-6 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 p-3">
      {numbers.map((num) => {
        const isCalled = isNumberCalled(num);
        const isSelected = isNumberSelected(num);
        const isDisabled = disabled || isCalled || (isNumberDisabled ? isNumberDisabled(num) : false);
        const isRecent = Array.isArray(recentCallNumbers) && recentCallNumbers.includes(num);

        return (
          <Button
            key={num}
            variant={isSelected ? "default" : isCalled ? "secondary" : "outline"}
            size="icon"
            disabled={isDisabled}
            onClick={() => onNumberSelect(num)}
            className={cn(
              // Fixed square sizes per breakpoint to avoid oversized frames on mobile
              "h-12 w-12 text-sm sm:h-14 sm:w-14 sm:text-base font-bold rounded-xl transition-all duration-200 transform",
              // Selected / called / default visual tweaks for better mobile appearance
              isSelected && "bg-warning hover:bg-warning/90 animate-bounce-in ring-2 ring-warning",
              isCalled && "cursor-not-allowed opacity-50 bg-muted/10",
              isRecent && !isCalled && "ring-2 ring-primary/60 bg-primary/10 animate-pulse",
              !isCalled && !isSelected && !isRecent && "bg-white/60 dark:bg-gray-800/60 hover:scale-105",
              "border border-white/10"
            )}
          >
            {num}
          </Button>
        );
      })}
    </div>
  );
};

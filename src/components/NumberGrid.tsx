import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NumberGridProps {
  range: [number, number];
  calledNumbers: number[];
  selectedNumbers: number[];
  onNumberSelect: (number: number) => void;
  disabled?: boolean;
}

export const NumberGrid = ({
  range,
  calledNumbers,
  selectedNumbers,
  onNumberSelect,
  disabled = false,
}: NumberGridProps) => {
  const [min, max] = range;
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  const isNumberCalled = (num: number) => calledNumbers.includes(num);
  const isNumberSelected = (num: number) => selectedNumbers.includes(num);

  return (
    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 p-4">
      {numbers.map((num) => {
        const isCalled = isNumberCalled(num);
        const isSelected = isNumberSelected(num);

        return (
          <Button
            key={num}
            variant={isSelected ? "default" : isCalled ? "secondary" : "outline"}
            size="lg"
            disabled={disabled || isCalled}
            onClick={() => onNumberSelect(num)}
            className={cn(
              "aspect-square text-lg font-bold transition-all duration-200",
              isSelected && "bg-warning hover:bg-warning/90 animate-bounce-in ring-2 ring-warning",
              isCalled && "cursor-not-allowed opacity-50",
              !isCalled && !isSelected && "hover:scale-110"
            )}
          >
            {num}
          </Button>
        );
      })}
    </div>
  );
};

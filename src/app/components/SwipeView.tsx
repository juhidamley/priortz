import { useState, useMemo } from 'react';
import { Trophy, ArrowLeft } from 'lucide-react';
import { Task } from '../types';
import { Button } from './ui/button';
import { Progress } from './ui/progress';

interface SwipeViewProps {
  tasks: Task[];
  queueId: string;
  onComplete: (orderedTasks: Task[]) => void;
  onCancel: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function SwipeView({ tasks, onComplete, onCancel }: SwipeViewProps) {
  // Shuffle once on mount — useMemo with empty deps is stable across parent re-renders
  const shuffled = useMemo(() => shuffle(tasks), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Lazy initializers so state is set once and never reset by parent re-renders
  const [sortedTasks, setSortedTasks] = useState<Task[]>(() => (shuffled.length > 0 ? [shuffled[0]] : []));
  const [unsortedTasks, setUnsortedTasks] = useState<Task[]>(() => shuffled.slice(1));
  const [currentItem, setCurrentItem] = useState<Task | null>(() => shuffled[1] ?? null);
  const [low, setLow] = useState(0);
  const [high, setHigh] = useState(0);
  const [isComplete, setIsComplete] = useState(() => tasks.length <= 1);

  const handleFinish = () => onComplete(tasks.length <= 1 ? tasks : sortedTasks);

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-10 h-10 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">All ranked!</h2>
          <p className="text-gray-500 mb-6">
            {tasks.length} tasks sorted by priority.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={onCancel}>Discard</Button>
            <Button onClick={handleFinish}>Apply Order</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentItem) return null;

  const mid = Math.floor((low + high) / 2);
  const compareItem = sortedTasks[mid];
  const compareRank = mid + 1;

  const handleChoice = (currentIsHigher: boolean) => {
    let newLow = low;
    let newHigh = high;

    if (currentIsHigher) {
      newHigh = mid - 1;
    } else {
      newLow = mid + 1;
    }

    if (newLow > newHigh) {
      const newSorted = [...sortedTasks];
      newSorted.splice(newLow, 0, currentItem);
      setSortedTasks(newSorted);

      const newUnsorted = unsortedTasks.slice(1);
      setUnsortedTasks(newUnsorted);

      if (newUnsorted.length > 0) {
        setCurrentItem(newUnsorted[0]);
        setLow(0);
        setHigh(newSorted.length - 1);
      } else {
        setIsComplete(true);
      }
    } else {
      setLow(newLow);
      setHigh(newHigh);
    }
  };

  const rankedCount = tasks.length - unsortedTasks.length - 1;
  const progress = (rankedCount / (tasks.length - 1)) * 100;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="p-4 flex flex-col gap-3 border-b bg-white">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Exit
          </Button>
          <span className="text-sm text-gray-500 font-medium">
            {rankedCount} of {tasks.length - 1} ranked
          </span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 max-w-2xl mx-auto w-full">
        <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">
          Which is higher priority?
        </p>

        <div className="flex flex-col md:flex-row gap-4 w-full">
          {/* Current item — being ranked */}
          <button
            onClick={() => handleChoice(true)}
            className="flex-1 bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg active:scale-[0.98] transition-all p-8 flex flex-col items-start gap-3 text-left group"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-500">
              New
            </span>
            <h3 className="text-xl font-semibold group-hover:text-blue-600 transition-colors">
              {currentItem.title}
            </h3>
            {currentItem.description && (
              <p className="text-sm text-gray-400 line-clamp-2">{currentItem.description}</p>
            )}
          </button>

          <div className="flex md:flex-col items-center justify-center gap-2 shrink-0">
            <div className="w-px h-8 md:w-8 md:h-px bg-gray-200" />
            <span className="text-xs text-gray-300 font-medium uppercase tracking-widest">vs</span>
            <div className="w-px h-8 md:w-8 md:h-px bg-gray-200" />
          </div>

          {/* Compare item — already ranked */}
          <button
            onClick={() => handleChoice(false)}
            className="flex-1 bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg active:scale-[0.98] transition-all p-8 flex flex-col items-start gap-3 text-left group"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Ranked #{compareRank}
            </span>
            <h3 className="text-xl font-semibold group-hover:text-blue-600 transition-colors">
              {compareItem.title}
            </h3>
            {compareItem.description && (
              <p className="text-sm text-gray-400 line-clamp-2">{compareItem.description}</p>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

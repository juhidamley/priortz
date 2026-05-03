import { useState, useEffect } from 'react';
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

export function SwipeView({ tasks, queueId, onComplete, onCancel }: SwipeViewProps) {
  // Binary Insertion Sort State
  const [sortedTasks, setSortedTasks] = useState<Task[]>([]);
  const [unsortedTasks, setUnsortedTasks] = useState<Task[]>([]);
  const [currentItem, setCurrentItem] = useState<Task | null>(null);

  // Binary Search Bounds
  const [low, setLow] = useState(0);
  const [high, setHigh] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (tasks.length > 1) {
      // Start with the first item sorted, everything else unsorted
      setSortedTasks([tasks[0]]);
      setUnsortedTasks(tasks.slice(1));
      setCurrentItem(tasks[1]);
      setLow(0);
      setHigh(0);
    } else {
      setIsComplete(true);
    }
  }, [tasks]);

  const handleFinish = () => {
    onComplete(sortedTasks);
  };

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-10 h-10 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Prioritization Complete!</h2>
          <p className="text-gray-600 mb-6">
            You've successfully ranked all {tasks.length} tasks via pairwise comparison.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={onCancel}>
              Discard
            </Button>
            <Button onClick={handleFinish}>
              Apply Order
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentItem) return null;

  const mid = Math.floor((low + high) / 2);
  const compareItem = sortedTasks[mid];

  const handleChoice = (winner: 'current' | 'compare') => {
    let newLow = low;
    let newHigh = high;

    // If current is higher priority, it belongs at a lower index (shift bounds left)
    if (winner === 'current') {
      newHigh = mid - 1;
    } else {
      newLow = mid + 1;
    }

    if (newLow > newHigh) {
      // Found the exact insertion point
      const newSorted = [...sortedTasks];
      newSorted.splice(newLow, 0, currentItem);
      setSortedTasks(newSorted);

      const newUnsorted = unsortedTasks.slice(1);
      setUnsortedTasks(newUnsorted);

      if (newUnsorted.length > 0) {
        // Reset bounds for the next unsorted item
        setCurrentItem(newUnsorted[0]);
        setLow(0);
        setHigh(newSorted.length - 1);
      } else {
        setIsComplete(true);
      }
    } else {
      // Continue searching with new bounds
      setLow(newLow);
      setHigh(newHigh);
    }
  };

  const progress = ((tasks.length - unsortedTasks.length) / tasks.length) * 100;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="p-4 flex flex-col gap-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Exit
          </Button>
          <span className="text-sm text-gray-500 font-medium">
            Ranking Task {tasks.length - unsortedTasks.length + 1} of {tasks.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8 overflow-hidden max-w-2xl mx-auto w-full">
        <h2 className="text-xl font-medium text-gray-700 text-center">Which is higher priority?</h2>
        
        <div className="flex flex-col md:flex-row gap-6 w-full h-[50vh] min-h-[300px]">
          {/* Current Item Button */}
          <button 
            onClick={() => handleChoice('current')}
            className="flex-1 bg-white rounded-2xl shadow-sm border-2 border-gray-200 hover:border-blue-500 hover:shadow-md transition-all p-8 flex flex-col items-center justify-center gap-4 group"
          >
            <h3 className="text-2xl font-semibold text-center group-hover:text-blue-600 transition-colors">
              {currentItem.title}
            </h3>
            {currentItem.description && (
              <p className="text-gray-500 text-center line-clamp-3">
                {currentItem.description}
              </p>
            )}
          </button>

          <div className="flex items-center justify-center md:flex-col gap-2">
            <div className="w-px h-12 md:w-12 md:h-px bg-gray-300" />
            <span className="text-gray-400 font-medium text-sm uppercase tracking-widest">OR</span>
            <div className="w-px h-12 md:w-12 md:h-px bg-gray-300" />
          </div>

          {/* Compare Item Button */}
          <button 
            onClick={() => handleChoice('compare')}
            className="flex-1 bg-white rounded-2xl shadow-sm border-2 border-gray-200 hover:border-blue-500 hover:shadow-md transition-all p-8 flex flex-col items-center justify-center gap-4 group"
          >
            <h3 className="text-2xl font-semibold text-center group-hover:text-blue-600 transition-colors">
              {compareItem.title}
            </h3>
            {compareItem.description && (
              <p className="text-gray-500 text-center line-clamp-3">
                {compareItem.description}
              </p>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
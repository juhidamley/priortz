import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import type { Identifier, XYCoord } from 'dnd-core';
import { ChevronRight, Trash2, FolderOpen, GripVertical, Edit } from 'lucide-react';
import { Task } from '../types';
import { Button } from './ui/button';

interface TaskCardProps {
  task: Task;
  index: number;
  queueId: string;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  onDelete: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onOpenSubQueue: (taskId: string) => void;
  hasSubQueue: boolean;
}

const ITEM_TYPE = 'TASK';

interface DragItem {
  index: number;
  id: string;
  type: string;
}

function isColorDark(hexColor: string): boolean {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

export function TaskCard({ 
  task, 
  index, 
  queueId,
  onMove, 
  onDelete,
  onEdit,
  onOpenSubQueue,
  hasSubQueue 
}: TaskCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  
  const [{ handlerId }, drop] = useDrop<DragItem, void, { handlerId: Identifier | null }>({
    accept: ITEM_TYPE,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: DragItem, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: () => {
      return { id: task.id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  const backgroundColor = task.color || '#ffffff';
  const textColor = task.color && isColorDark(task.color) ? '#ffffff' : '#000000';
  const buttonColor = task.color && isColorDark(task.color) ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
  const buttonHoverColor = task.color && isColorDark(task.color) ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)';

  return (
    <div
      ref={ref}
      data-handler-id={handlerId}
      className={`group relative rounded-lg border-2 transition-all ${
        isDragging ? 'opacity-30 scale-95 border-blue-400 shadow-lg' : 'border-gray-200'
      } hover:shadow-md`}
      style={{ backgroundColor }}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Drag Handle */}
        <div 
          className="flex items-center cursor-grab active:cursor-grabbing opacity-40 group-hover:opacity-100 transition-opacity pt-1"
        >
          <GripVertical className="w-5 h-5" style={{ color: textColor }} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium" style={{ color: textColor }}>{task.title}</h3>
          {task.description && (
            <p className="text-sm mt-1" style={{ color: textColor, opacity: 0.8 }}>{task.description}</p>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-transparent"
            style={{ color: buttonColor }}
            onMouseEnter={(e) => e.currentTarget.style.color = buttonHoverColor}
            onMouseLeave={(e) => e.currentTarget.style.color = buttonColor}
          >
            <Edit className="w-4 h-4" />
          </Button>
          {task.subQueueId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSubQueue(task.id);
              }}
              className="opacity-70 group-hover:opacity-100 transition-opacity hover:bg-transparent"
              style={{ color: buttonColor }}
              onMouseEnter={(e) => e.currentTarget.style.color = buttonHoverColor}
              onMouseLeave={(e) => e.currentTarget.style.color = buttonColor}
            >
              <FolderOpen className="w-4 h-4" />
            </Button>
          )}
          {!task.subQueueId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSubQueue(task.id);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-transparent"
              style={{ color: buttonColor }}
              onMouseEnter={(e) => e.currentTarget.style.color = buttonHoverColor}
              onMouseLeave={(e) => e.currentTarget.style.color = buttonColor}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-transparent"
            style={{ color: '#ef4444' }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
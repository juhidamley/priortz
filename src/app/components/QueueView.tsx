import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { MultiBackend, TouchTransition, MouseTransition } from 'react-dnd-multi-backend';
import { ArrowLeft, Plus, Shuffle, Trash2, Settings } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { TaskCard } from './TaskCard';
import { SwipeView } from './SwipeView';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Task } from '../types';

const multiBackendOptions = {
  backends: [
    { id: 'html5', backend: HTML5Backend, transition: MouseTransition },
    { id: 'touch', backend: TouchBackend, options: { enableMouseEvents: true }, preview: true, transition: TouchTransition },
  ],
};

export function QueueView() {
  const { queueId } = useParams<{ queueId: string }>();
  const navigate = useNavigate();
  const { store } = useStore();
  
  const [isSwipeMode, setIsSwipeMode] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskColor, setNewTaskColor] = useState('');

  const queue = queueId ? store.getQueue(queueId) : undefined;

  if (!queue) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-xl text-gray-600">Queue not found</p>
          <Button onClick={() => navigate('/')} className="mt-4">Go Back</Button>
        </div>
      </div>
    );
  }

  const handleMove = (dragIndex: number, hoverIndex: number) => {
    store.reorderTasks(queue.id, dragIndex, hoverIndex);
  };

  const handleDelete = (taskId: string) => {
    store.deleteTask(queue.id, taskId);
  };

  const handleOpenSubQueue = (taskId: string) => {
    const task = queue.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.subQueueId) {
      navigate(`/queue/${task.subQueueId}`);
    } else {
      const subQueue = store.createSubQueue(taskId, queue.id);
      if (subQueue) navigate(`/queue/${subQueue.id}`);
    }
  };

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      store.addTask(queue.id, newTaskTitle, newTaskDescription || undefined);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setIsAddDialogOpen(false);
    }
  };

  const handleEditTask = () => {
    if (editingTask && newTaskTitle.trim()) {
      store.updateTask(queue.id, editingTask.id, {
        title: newTaskTitle,
        description: newTaskDescription || undefined,
        color: newTaskColor || undefined,
      });
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskColor('');
      setEditingTask(null);
      setIsEditDialogOpen(false);
    }
  };

  const handleOpenEditDialog = (taskId: string) => {
    const task = queue.tasks.find(t => t.id === taskId);
    if (task) {
      setEditingTask(task);
      setNewTaskTitle(task.title);
      setNewTaskDescription(task.description || '');
      setNewTaskColor(task.color || queue.palette?.[0] || '');
      setIsEditDialogOpen(true);
    }
  };

  const handleSwipeComplete = (orderedTasks: Task[]) => {
    store.updateQueue(queue.id, { tasks: orderedTasks });
    setIsSwipeMode(false);
  };

  const handleDeleteQueue = () => {
    if (confirm(`Are you sure you want to delete "${queue.name}"?`)) {
      store.deleteQueue(queue.id);
      if (queue.parentTaskId) {
        const parentQueue = store.getState().queues.find(q => q.tasks.some(t => t.id === queue.parentTaskId));
        if (parentQueue) navigate(`/queue/${parentQueue.id}`);
        else navigate('/');
      } else navigate('/');
    }
  };

  if (isSwipeMode && queue.tasks.length >= 2) {
    return (
      <SwipeView tasks={queue.tasks} queueId={queue.id} onComplete={handleSwipeComplete} onCancel={() => setIsSwipeMode(false)} />
    );
  }

  return (
    <DndProvider backend={MultiBackend} options={multiBackendOptions}>
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="bg-white border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" size="sm"
              onClick={() => {
                if (queue.parentTaskId) {
                  const parentQueue = store.getState().queues.find(q => q.tasks.some(t => t.id === queue.parentTaskId));
                  if (parentQueue) navigate(`/queue/${parentQueue.id}`);
                  else navigate('/');
                } else navigate('/');
              }}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold truncate">{queue.name}</h1>
              <p className="text-sm text-gray-500">
                {queue.tasks.length} {queue.tasks.length === 1 ? 'task' : 'tasks'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsSwipeMode(true)} disabled={queue.tasks.length < 2}>
              <Shuffle className="w-4 h-4 mr-2" />
              Prioritize
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDeleteQueue}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {queue.tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
              <div className="w-20 h-20 rounded-full mb-4 flex items-center justify-center" style={{ backgroundColor: queue.color + '20' }}>
                <Settings className="w-10 h-10" style={{ color: queue.color }} />
              </div>
              <p className="text-lg">No tasks yet</p>
              <p className="text-sm mb-4">Add your first task to get started</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Task
              </Button>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-3">
              {queue.tasks.map((task, index) => (
                <TaskCard
                  key={task.id} task={task} index={index} queueId={queue.id}
                  onMove={handleMove} onDelete={handleDelete} onEdit={handleOpenEditDialog}
                  onOpenSubQueue={handleOpenSubQueue} hasSubQueue={!!task.subQueueId}
                />
              ))}
            </div>
          )}
        </div>

        {queue.tasks.length > 0 && (
          <div className="p-4 bg-white border-t">
            <Button onClick={() => setIsAddDialogOpen(true)} className="w-full" style={{ backgroundColor: queue.color }}>
              <Plus className="w-4 h-4 mr-2" /> Add Task
            </Button>
          </div>
        )}

        {/* Add Task Dialog - Auto assigns color */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="task-title">Task Title</Label>
                <Input id="task-title" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Enter task title" onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddTask()} />
              </div>
              <div>
                <Label htmlFor="task-description">Description (Optional)</Label>
                <Textarea id="task-description" value={newTaskDescription} onChange={(e) => setNewTaskDescription(e.target.value)} placeholder="Enter task description" rows={3} />
              </div>
              <Button onClick={handleAddTask} className="w-full">Add Task</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Task Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-task-title">Task Title</Label>
                <Input id="edit-task-title" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Enter task title" onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleEditTask()} />
              </div>
              <div>
                <Label htmlFor="edit-task-description">Description (Optional)</Label>
                <Textarea id="edit-task-description" value={newTaskDescription} onChange={(e) => setNewTaskDescription(e.target.value)} placeholder="Enter task description" rows={3} />
              </div>
              
              {queue.palette && (
                <div>
                  <Label>Change Color</Label>
                  <div className="flex gap-2 mt-2">
                    {queue.palette.map((color) => (
                      <button
                        key={color} type="button"
                        className={`w-8 h-8 rounded-full transition-transform ${newTaskColor === color ? 'scale-110 ring-2 ring-offset-2 ring-gray-400' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewTaskColor(color)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleEditTask} className="w-full">Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DndProvider>
  );
}
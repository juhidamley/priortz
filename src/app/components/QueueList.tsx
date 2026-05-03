import { useState } from 'react';
import { Plus, Folder } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useStore } from '../hooks/useStore';
import { ColorPicker } from './ColorPicker';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { DEFAULT_QUEUE_COLORS } from '../constants';

export function QueueList() {
  const { state, store } = useStore();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newQueueName, setNewQueueName] = useState('');
  const [selectedColor, setSelectedColor] = useState(DEFAULT_QUEUE_COLORS[0]);
  
  // Custom 6-color palette state
  const [palette, setPalette] = useState<string[]>([
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'
  ]);
  const [editingColorIndex, setEditingColorIndex] = useState<number>(0);

  const mainQueues = store.getMainQueues();

  const handleCreateQueue = async () => {
    if (newQueueName.trim()) {
      // Wait for the cloud to create the queue
      const newQueue = await store.addQueue(newQueueName, selectedColor, palette);
      
      setNewQueueName('');
      setSelectedColor(DEFAULT_QUEUE_COLORS[0]);
      setIsDialogOpen(false);
      
      // Navigate using the ID returned from the database
      if (newQueue) {
        navigate(`/queue/${newQueue.id}`);
      }
    }
  };

  return (
    <div className="p-6 border-b bg-white">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Queues</h1>
          <div className="flex items-center gap-3">
            {!state.user ? (
              <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
                Sign in to sync
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => store.signOut()}>
                Sign out
              </Button>
            )}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New Queue
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Queue</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="queue-name">Queue Name</Label>
                  <Input
                    id="queue-name"
                    value={newQueueName}
                    onChange={(e) => setNewQueueName(e.target.value)}
                    placeholder="Enter queue name"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateQueue()}
                  />
                </div>
                
                <div className="pt-4 border-t border-gray-100">
                  <Label className="mb-2 block">Queue Folder Icon Color</Label>
                  <div className="grid grid-cols-8 gap-2 mt-2">
                    {DEFAULT_QUEUE_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full transition-transform ${
                          selectedColor === color ? 'scale-110 ring-2 ring-offset-2 ring-gray-400' : ''
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setSelectedColor(color)}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <Label className="mb-2 block">Task Palette (6 Colors)</Label>
                  <p className="text-xs text-gray-500 mb-3">Tasks in this queue will automatically cycle through these colors.</p>
                  
                  <div className="flex gap-2 mb-4">
                    {palette.map((color, index) => (
                      <button
                        key={index}
                        type="button"
                        className={`w-10 h-10 rounded-md transition-transform border-2 ${
                          editingColorIndex === index ? 'scale-110 border-gray-400 shadow-md ring-2 ring-offset-1 ring-gray-300' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setEditingColorIndex(index)}
                      />
                    ))}
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg border">
                    <ColorPicker
                      selectedColor={palette[editingColorIndex]}
                      onColorSelect={(newColor) => {
                        if (!newColor) return;
                        const newPalette = [...palette];
                        newPalette[editingColorIndex] = newColor;
                        setPalette(newPalette);
                      }}
                      label={`Change Color ${editingColorIndex + 1}`}
                    />
                  </div>
                </div>

                <Button onClick={handleCreateQueue} className="w-full mt-4">
                  Create Queue
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {mainQueues.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <Folder className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg">No queues yet</p>
            <p className="text-sm">Create your first queue to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {mainQueues.map((queue) => (
              <button
                key={queue.id}
                onClick={() => navigate(`/queue/${queue.id}`)}
                className="group relative p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all hover:shadow-lg text-left"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: queue.color + '20' }}
                  >
                    <Folder
                      className="w-6 h-6"
                      style={{ color: queue.color }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{queue.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {queue.tasks.length} {queue.tasks.length === 1 ? 'task' : 'tasks'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
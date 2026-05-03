import { useState } from 'react';
import { Plus, Folder, Users } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useStore } from '../hooks/useStore';
import { Badge } from './ui/badge';
import { ColorPicker } from './ColorPicker';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Label } from './ui/label';
import { DEFAULT_QUEUE_COLORS, DEFAULT_TASK_COLORS } from '../constants';

export function QueueList() {
  const { state, store } = useStore();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newQueueName, setNewQueueName] = useState('');
  const [selectedColor, setSelectedColor] = useState(DEFAULT_QUEUE_COLORS[0]);
  
  // Custom 6-color palette state
  const [palette, setPalette] = useState<string[]>(DEFAULT_TASK_COLORS);
  const [openPopoverIndex, setOpenPopoverIndex] = useState<number | null>(null);

  const mainQueues = store.getMainQueues().filter((queue) => !queue.isShared);
  const sharedQueues = state.queues.filter((queue) => queue.isShared);

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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.href = 'https://juhi.studio'}
            >
              ← Back to juhi.studio
            </Button>
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
                  <ColorPicker
                    selectedColor={selectedColor}
                    onColorSelect={setSelectedColor}
                    label="Queue Folder Icon Color"
                  />
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <Label className="mb-2 block">Task Palette (6 Colors)</Label>
                  <p className="text-xs text-gray-500 mb-3">Tasks in this queue will automatically cycle through these colors.</p>
                  
                  <div className="flex gap-2">
                    {palette.map((color, index) => (
                      <Popover
                        key={index}
                        open={openPopoverIndex === index}
                        onOpenChange={(open) => setOpenPopoverIndex(open ? index : null)}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={`w-10 h-10 rounded-md transition-transform border-2 ${
                              openPopoverIndex === index ? 'scale-110 border-gray-400 shadow-md ring-2 ring-offset-1 ring-gray-300' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-3" side="bottom" align="start">
                          <ColorPicker
                            selectedColor={palette[index]}
                            onColorSelect={(newColor) => {
                              if (!newColor) return;
                              const newPalette = [...palette];
                              newPalette[index] = newColor;
                              setPalette(newPalette);
                            }}
                            label={`Color ${index + 1}`}
                          />
                        </PopoverContent>
                      </Popover>
                    ))}
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

      <div className="flex-1 overflow-auto p-6 space-y-8">
        {mainQueues.length === 0 && sharedQueues.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <Folder className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg">No queues yet</p>
            <p className="text-sm">Create your first queue to get started</p>
          </div>
        ) : (
          <>
            {mainQueues.length > 0 && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Your Queues</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {mainQueues.map((queue) => {
                    const collaboratorCount = state.queueMemberCounts?.[queue.id] ?? 0;
                    return (
                      <button
                        key={queue.id}
                        onClick={() => navigate(`/queue/${queue.id}`)}
                        className="group relative p-6 rounded-xl border-2 transition-all hover:shadow-lg text-left bg-white border-gray-200 hover:border-gray-300"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: queue.color + '20' }}
                          >
                            <Folder className="w-6 h-6" style={{ color: queue.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{queue.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {queue.tasks.length} {queue.tasks.length === 1 ? 'task' : 'tasks'}
                            </p>
                            {collaboratorCount > 0 && (
                              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {collaboratorCount} {collaboratorCount === 1 ? 'collaborator' : 'collaborators'}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Shared with You</h2>
              </div>
              {sharedQueues.length === 0 ? (
                <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/20 p-6 text-sm text-blue-700">
                  No shared queues yet. Once someone invites this account, the queue will appear here.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sharedQueues.map((queue) => (
                    <button
                      key={queue.id}
                      onClick={() => navigate(`/queue/${queue.id}`)}
                      className="group relative p-6 rounded-xl border-2 transition-all hover:shadow-lg text-left bg-blue-50/30 border-blue-200 hover:border-blue-300"
                    >
                      <div className="absolute top-3 right-3">
                        <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">
                          Shared
                        </Badge>
                      </div>
                      <div className="flex items-start gap-3">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: queue.color + '20' }}
                        >
                          <Folder className="w-6 h-6" style={{ color: queue.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{queue.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {queue.tasks.length} {queue.tasks.length === 1 ? 'task' : 'tasks'}
                          </p>
                          {queue.sharedByEmail && (
                            <p className="text-xs text-blue-500 mt-1 truncate">
                              from {queue.sharedByEmail}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
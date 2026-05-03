import { useState } from 'react';
import { X } from 'lucide-react';
import { Queue, QueueMember } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queue: Queue;
  members: QueueMember[];
  currentUserId: string;
  onInvite: (email: string) => Promise<{ error: string | null }>;
  onRemove: (memberId: string) => void;
}

export function ShareDialog({ open, onOpenChange, queue, members, currentUserId, onInvite, onRemove }: ShareDialogProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isOwner = queue.ownerId === currentUserId;

  const handleInvite = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setError(null);
    const result = await onInvite(trimmed);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setEmail('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share "{queue.name}"</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {isOwner && (
            <div className="space-y-2">
              <Label htmlFor="invite-email">Invite by email</Label>
              <div className="flex gap-2">
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  disabled={isLoading}
                />
                <Button onClick={handleInvite} disabled={isLoading || !email.trim()}>
                  {isLoading ? 'Inviting…' : 'Invite'}
                </Button>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          )}

          {members.length > 0 && (
            <div className="space-y-2">
              <Label>People with access</Label>
              <ul className="space-y-2">
                {members.map((member) => (
                  <li key={member.id} className="flex items-center justify-between gap-3 py-1">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600 shrink-0">
                        {member.email[0].toUpperCase()}
                      </div>
                      <span className="text-sm truncate">{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={member.status === 'active' ? 'default' : 'outline'} className={member.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'text-yellow-600 border-yellow-300'}>
                        {member.status === 'active' ? 'Member' : 'Pending'}
                      </Badge>
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => onRemove(member.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          aria-label="Remove member"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {members.length === 0 && !isOwner && (
            <p className="text-sm text-gray-500">No other collaborators yet.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

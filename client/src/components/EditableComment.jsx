import React, { useState } from 'react';
import { format } from 'date-fns';
import { Edit3, Save, X } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import RichTextEditor from './RichTextEditor';
import { useAuth } from '../hooks/useAuth';

const EditableComment = ({ comment, bugStatus, onUpdate }) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [loading, setLoading] = useState(false);

  const canEdit = user && user.name === comment.author && bugStatus !== 'resolved';

  const handleSave = async () => {
    if (!editContent.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/bugs/${comment.bug_id}/comments/${comment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ content: editContent }),
      });

      if (response.ok) {
        const updatedComment = await response.json();
        onUpdate(updatedComment);
        setIsEditing(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update comment');
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('Failed to update comment');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-900">{comment.author}</span>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {format(new Date(comment.created_at), 'MMM d, yyyy HH:mm')}
            {comment.updated_at && comment.updated_at !== comment.created_at && (
              <span className="ml-1">(edited)</span>
            )}
          </span>
          {canEdit && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-gray-400 hover:text-gray-600 p-1"
              title="Edit comment"
            >
              <Edit3 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      
      {isEditing ? (
        <div className="space-y-3">
          <RichTextEditor
            name="editContent"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Edit your comment..."
            rows={3}
          />
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              disabled={loading || !editContent.trim()}
              className="btn-primary flex items-center space-x-1 text-sm px-3 py-1"
            >
              <Save className="h-3 w-3" />
              <span>{loading ? 'Saving...' : 'Save'}</span>
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="btn-secondary text-sm px-3 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="text-gray-700">
          <MarkdownRenderer content={comment.content} />
        </div>
      )}
    </div>
  );
};

export default EditableComment;
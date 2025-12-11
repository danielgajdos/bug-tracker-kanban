import React, { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { X, User, Clock, MessageSquare, Send, AlertCircle, Edit3 } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import RichTextEditor from './RichTextEditor';
import EditableComment from './EditableComment';
import InlineEditText from './InlineEditText';
import InlineEditSelect from './InlineEditSelect';
import DescriptionEditor from './DescriptionEditor';

const priorityColors = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-red-100 text-red-800 border-red-200',
  critical: 'bg-purple-100 text-purple-800 border-purple-200'
};

const statusColors = {
  'reported': 'bg-red-100 text-red-800',
  'in-progress': 'bg-yellow-100 text-yellow-800',
  'testing': 'bg-blue-100 text-blue-800',
  'resolved': 'bg-green-100 text-green-800'
};

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
];

const BugModal = ({ bug, onClose, onUpdate, onAddComment, onDelete, onUpdateComment }) => {
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState(bug.comments || []);
  const [showDescriptionEditor, setShowDescriptionEditor] = useState(false);

  const handleAddComment = (e) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(bug.id, {
        content: newComment
      });
      setNewComment('');
    }
  };

  // Update comments when bug.comments changes
  React.useEffect(() => {
    setComments(bug.comments || []);
  }, [bug.comments]);

  const handleDelete = () => {
    const confirmMessage = `Are you sure you want to delete this bug?\n\nTitle: "${bug.title}"\n\nThis action cannot be undone and will permanently remove the bug and all its comments.`;
    if (window.confirm(confirmMessage)) {
      onDelete(bug.id);
    }
  };

  const handleCommentUpdate = (updatedComment) => {
    setComments(prev => prev.map(comment => 
      comment.id === updatedComment.id ? updatedComment : comment
    ));
    if (onUpdateComment) {
      onUpdateComment(updatedComment);
    }
  };

  const handleFieldUpdate = (field, value) => {
    const updates = {
      title: bug.title,
      description: bug.description,
      status: bug.status,
      priority: bug.priority,
      assignee: bug.assignee || '',
      [field]: value
    };
    onUpdate(bug.id, updates);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3 flex-1">
            <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              {bug.bug_number && (
                <div className="text-sm text-gray-500 font-mono mb-1">{bug.bug_number}</div>
              )}
              <h2 className="text-xl font-semibold text-gray-900">{bug.title}</h2>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <InlineEditSelect
              value={bug.priority}
              options={priorityOptions}
              onSave={(value) => handleFieldUpdate('priority', value)}
              canEdit={bug.status !== 'resolved'}
              renderValue={(value) => (
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${priorityColors[value]}`}>
                  {value.charAt(0).toUpperCase() + value.slice(1)}
                </span>
              )}
            />
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            {/* Description */}
            <div className="group relative">
              {bug.description ? (
                <div className="text-gray-700 relative">
                  <MarkdownRenderer content={bug.description} />
                  {bug.status !== 'resolved' && (
                    <button
                      onClick={() => setShowDescriptionEditor(true)}
                      className="absolute right-0 top-0 text-gray-400 hover:text-gray-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded"
                      title="Edit description"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-gray-500 italic relative">
                  No description provided
                  {bug.status !== 'resolved' && (
                    <button
                      onClick={() => setShowDescriptionEditor(true)}
                      className="absolute right-0 top-0 text-gray-400 hover:text-gray-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded"
                      title="Add description"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Description Editor Modal */}
            {showDescriptionEditor && (
              <DescriptionEditor
                bug={bug}
                onSave={(description) => handleFieldUpdate('description', description)}
                onClose={() => setShowDescriptionEditor(false)}
              />
            )}



            {/* Comments Section */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <span>Comments ({comments.length})</span>
              </h4>

              <div className="space-y-4 mb-6">
                {comments.map(comment => (
                  <EditableComment
                    key={comment.id}
                    comment={comment}
                    bugStatus={bug.status}
                    onUpdate={handleCommentUpdate}
                  />
                ))}
              </div>

              <form onSubmit={handleAddComment} className="space-y-3">
                <RichTextEditor
                  name="comment"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment... You can paste images directly here!"
                  rows={2}
                />
                <button
                  type="submit"
                  className="btn-primary flex items-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>Add Comment</span>
                </button>
              </form>
            </div>
          </div>
        </div>
        
        {/* Delete Button */}
        {bug.status === 'reported' && (
          <div className="px-6 py-4 border-t bg-gray-50">
            <button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-1"
            >
              <X className="h-4 w-4" />
              <span>Delete Bug</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BugModal;
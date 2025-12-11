import React, { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { X, User, Clock, MessageSquare, Send, Edit3, Save, AlertCircle } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import RichTextEditor from './RichTextEditor';
import EditableComment from './EditableComment';

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

const BugModal = ({ bug, onClose, onUpdate, onAddComment, onDelete, onUpdateComment }) => {
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: bug.title,
    description: bug.description,
    status: bug.status,
    priority: bug.priority,
    assignee: bug.assignee || ''
  });
  const [comments, setComments] = useState(bug.comments || []);

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

  const handleSaveEdit = () => {
    onUpdate(bug.id, editData);
    setIsEditing(false);
  };

  const handleEditChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Priority:</label>
                  <select
                    value={editData.priority}
                    onChange={(e) => handleEditChange('priority', e.target.value)}
                    className="input text-sm py-1 px-2 w-24"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="btn-secondary flex items-center space-x-1"
              >
                <Edit3 className="h-4 w-4" />
                <span>Edit</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className={`grid gap-6 ${isEditing ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
            {/* Main Content */}
            <div className={`space-y-6 ${!isEditing ? 'lg:col-span-2' : ''}`}>
              <div>
                {isEditing && bug.status !== 'resolved' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Title
                      </label>
                      <input
                        type="text"
                        value={editData.title}
                        onChange={(e) => handleEditChange('title', e.target.value)}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <RichTextEditor
                        name="description"
                        value={editData.description}
                        onChange={(e) => handleEditChange('description', e.target.value)}
                        placeholder="Bug description..."
                        rows={6}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {bug.title}
                    </h3>
                    {bug.description && (
                      <div className="text-gray-700">
                        <MarkdownRenderer content={bug.description} />
                      </div>
                    )}
                  </>
                )}
              </div>



              {/* Comments Section */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Comments ({bug.comments?.length || 0})</span>
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

            {/* Sidebar */}
            {!isEditing && (
              <div className="space-y-6">
                <div className="card">
                <h4 className="font-medium text-gray-900 mb-4">Bug Information</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    {isEditing ? (
                      <select
                        value={editData.status}
                        onChange={(e) => handleEditChange('status', e.target.value)}
                        className="input text-sm py-1 px-2 w-32"
                      >
                        <option value="reported">Reported</option>
                        <option value="in-progress">In Progress</option>
                        <option value="testing">Testing</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    ) : (
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${statusColors[bug.status]}`}>
                        {bug.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Priority:</span>
                    {isEditing ? (
                      <select
                        value={editData.priority}
                        onChange={(e) => handleEditChange('priority', e.target.value)}
                        className="input text-sm py-1 px-2 w-32"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    ) : (
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${priorityColors[bug.priority]}`}>
                        {bug.priority.charAt(0).toUpperCase() + bug.priority.slice(1)}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reporter
                    </label>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{bug.reporter_name}</div>
                        <div className="text-xs text-gray-500">{bug.reporter_email}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Created
                    </label>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{formatDistanceToNow(new Date(bug.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>

                  {bug.updated_at !== bug.created_at && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Updated
                      </label>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>{formatDistanceToNow(new Date(bug.updated_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Bottom Actions */}
        {isEditing && (
          <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
            {bug.status === 'reported' && (
              <button
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-1"
              >
                <X className="h-4 w-4" />
                <span>Delete Bug</span>
              </button>
            )}
            <div className="flex-1"></div>
            <button
              onClick={handleSaveEdit}
              className="btn-primary flex items-center space-x-1"
            >
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BugModal;
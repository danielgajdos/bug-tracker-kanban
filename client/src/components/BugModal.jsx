import React, { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { X, User, Clock, MessageSquare, Send, Edit3, Save, AlertCircle } from 'lucide-react';

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

const BugModal = ({ bug, onClose, onUpdate, onAddComment }) => {
  const [newComment, setNewComment] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    status: bug.status,
    priority: bug.priority,
    assignee: bug.assignee || ''
  });

  const handleAddComment = (e) => {
    e.preventDefault();
    if (newComment.trim() && commentAuthor.trim()) {
      onAddComment(bug.id, {
        author: commentAuthor,
        content: newComment
      });
      setNewComment('');
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
            <h2 className="text-xl font-semibold text-gray-900">Bug Details</h2>
          </div>
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="btn-primary flex items-center space-x-1"
                >
                  <Save className="h-4 w-4" />
                  <span>Save</span>
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {bug.title}
                </h3>
                {bug.description && (
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {bug.description}
                  </p>
                )}
              </div>

              {bug.screenshots && bug.screenshots.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Screenshots</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {bug.screenshots.map((screenshot, index) => (
                      <img
                        key={index}
                        src={screenshot}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-90"
                        onClick={() => window.open(screenshot, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Comments ({bug.comments?.length || 0})</span>
                </h4>

                <div className="space-y-4 mb-6">
                  {bug.comments?.map(comment => (
                    <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{comment.author}</span>
                        <span className="text-sm text-gray-500">
                          {format(new Date(comment.created_at), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddComment} className="space-y-3">
                  <input
                    type="text"
                    value={commentAuthor}
                    onChange={(e) => setCommentAuthor(e.target.value)}
                    placeholder="Your name"
                    className="input"
                    required
                  />
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={3}
                    className="textarea"
                    required
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
            <div className="space-y-6">
              <div className="card">
                <h4 className="font-medium text-gray-900 mb-4">Bug Information</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    {isEditing ? (
                      <select
                        value={editData.status}
                        onChange={(e) => handleEditChange('status', e.target.value)}
                        className="input"
                      >
                        <option value="reported">Reported</option>
                        <option value="in-progress">In Progress</option>
                        <option value="testing">Testing</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    ) : (
                      <span className={`inline-block px-2 py-1 text-sm font-medium rounded-full ${statusColors[bug.status]}`}>
                        {bug.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    {isEditing ? (
                      <select
                        value={editData.priority}
                        onChange={(e) => handleEditChange('priority', e.target.value)}
                        className="input"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    ) : (
                      <span className={`inline-block px-2 py-1 text-sm font-medium rounded-full border ${priorityColors[bug.priority]}`}>
                        {bug.priority.charAt(0).toUpperCase() + bug.priority.slice(1)}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assignee
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.assignee}
                        onChange={(e) => handleEditChange('assignee', e.target.value)}
                        placeholder="Assign to developer"
                        className="input"
                      />
                    ) : (
                      <span className="text-gray-900">
                        {bug.assignee || 'Unassigned'}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default BugModal;
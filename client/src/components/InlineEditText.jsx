import React, { useState } from 'react';
import { Edit3, Save, X } from 'lucide-react';

const InlineEditText = ({ 
  value, 
  onSave, 
  placeholder = "Enter text...", 
  className = "",
  multiline = false,
  canEdit = true,
  disabled = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isHovered, setIsHovered] = useState(false);

  const handleSave = () => {
    if (editValue.trim() !== value) {
      onSave(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!canEdit || disabled) {
    return <span className={className}>{value}</span>;
  }

  if (isEditing) {
    return (
      <div className="flex items-start space-x-2">
        {multiline ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            rows={3}
            autoFocus
          />
        ) : (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
          />
        )}
        <button
          onClick={handleSave}
          className="text-green-600 hover:text-green-700 p-1"
          title="Save"
        >
          <Save className="h-4 w-4" />
        </button>
        <button
          onClick={handleCancel}
          className="text-gray-400 hover:text-gray-600 p-1"
          title="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`group relative ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className={multiline ? "whitespace-pre-wrap" : ""}>{value}</span>
      {isHovered && (
        <button
          onClick={() => setIsEditing(true)}
          className="absolute right-0 top-0 text-gray-400 hover:text-gray-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded"
          title="Edit"
        >
          <Edit3 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

export default InlineEditText;
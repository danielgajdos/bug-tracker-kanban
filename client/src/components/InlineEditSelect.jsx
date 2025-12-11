import React, { useState } from 'react';
import { Edit3, Save, X } from 'lucide-react';

const InlineEditSelect = ({ 
  value, 
  options, 
  onSave, 
  className = "",
  canEdit = true,
  disabled = false,
  renderValue = null
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isHovered, setIsHovered] = useState(false);

  const handleSave = () => {
    if (editValue !== value) {
      onSave(editValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (!canEdit || disabled) {
    return renderValue ? renderValue(value) : <span className={className}>{value}</span>;
  }

  if (isEditing) {
    return (
      <div className="flex items-center space-x-2">
        <select
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          autoFocus
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleSave}
          className="text-green-600 hover:text-green-700 p-1"
          title="Save"
        >
          <Save className="h-3 w-3" />
        </button>
        <button
          onClick={handleCancel}
          className="text-gray-400 hover:text-gray-600 p-1"
          title="Cancel"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`group relative inline-block ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {renderValue ? renderValue(value) : <span>{value}</span>}
      {isHovered && (
        <button
          onClick={() => setIsEditing(true)}
          className="absolute -right-5 top-0 text-gray-400 hover:text-gray-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Edit"
        >
          <Edit3 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

export default InlineEditSelect;
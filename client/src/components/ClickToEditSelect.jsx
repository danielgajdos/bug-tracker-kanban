import React, { useState } from 'react';
import { Save, X } from 'lucide-react';

const ClickToEditSelect = ({ 
  value, 
  options,
  onSave, 
  className = "",
  canEdit = true,
  disabled = false,
  renderValue,
  children
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleClick = () => {
    if (canEdit && !disabled) {
      setIsEditing(true);
    }
  };

  if (!canEdit || disabled) {
    return children || (renderValue ? renderValue(value) : <span className={className}>{value}</span>);
  }

  if (isEditing) {
    return (
      <div className="flex items-center space-x-2">
        <select
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
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
      className={`cursor-pointer ${className}`}
      onClick={handleClick}
      title={canEdit ? "Click to edit" : ""}
    >
      {children || (renderValue ? renderValue(value) : <span>{value}</span>)}
    </div>
  );
};

export default ClickToEditSelect;
import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

const DescriptionEditor = ({ bug, onSave, onClose }) => {
  const [description, setDescription] = useState(bug.description || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(description);
      onClose();
    } catch (error) {
      console.error('Error saving description:', error);
      alert('Failed to save description. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Edit Description</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bug Description
            </label>
            <RichTextEditor
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the bug, steps to reproduce, expected vs actual behavior...

You can paste images directly here or use Markdown formatting:
- **bold text**
- *italic text*
- `code`"
              rows={12}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary flex items-center space-x-2"
              disabled={loading}
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Saving...' : 'Save Description'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DescriptionEditor;
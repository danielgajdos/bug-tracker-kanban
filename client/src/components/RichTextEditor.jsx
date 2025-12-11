import React, { useState, useRef } from 'react';
import { Image, Loader } from 'lucide-react';

const RichTextEditor = ({ value, onChange, placeholder, rows = 4, name }) => {
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef(null);

  const handlePaste = async (e) => {
    const items = e.clipboardData.items;
    let hasImage = false;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.indexOf('image') !== -1) {
        hasImage = true;
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await uploadImage(file);
        }
      }
    }
    
    // If no image was found, let the default paste behavior happen
    if (!hasImage) {
      // Allow normal text paste
      return;
    }
  };

  const uploadImage = async (file) => {
    if (!file) return;
    
    setUploading(true);
    console.log('Uploading image:', file.name, file.type);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      console.log('Upload response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Upload result:', result);
        const { url } = result;
        
        // Insert image markdown at cursor position
        const textarea = textareaRef.current;
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const imageMarkdown = `\n![Image](${url})\n`;
        console.log('Inserting image markdown:', imageMarkdown);
        
        const newValue = value.substring(0, start) + imageMarkdown + value.substring(end);
        console.log('New value:', newValue);
        
        onChange({ target: { name: name, value: newValue } });
        
        // Force a re-render by triggering the change event
        const event = new Event('input', { bubbles: true });
        textarea.dispatchEvent(event);
        
        // Move cursor after the inserted image
        setTimeout(() => {
          if (textarea) {
            textarea.selectionStart = textarea.selectionEnd = start + imageMarkdown.length;
            textarea.focus();
          }
        }, 100);
      } else {
        const errorText = await response.text();
        console.error('Upload failed:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      alert(`Failed to upload image: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        await uploadImage(file);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        name={name}
        value={value}
        onChange={onChange}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        placeholder={placeholder}
        rows={rows}
        className="textarea pr-10"
        disabled={uploading}
      />
      
      {uploading && (
        <div className="absolute top-2 right-2 flex items-center space-x-1 text-sm text-gray-500">
          <Loader className="h-4 w-4 animate-spin" />
          <span>Uploading...</span>
        </div>
      )}
      
      <div className="mt-2 text-xs text-gray-500 flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <Image className="h-3 w-3" />
          <span>Paste or drag images directly into the text</span>
        </div>
        <span>Supports Markdown formatting</span>
      </div>
    </div>
  );
};

export default RichTextEditor;
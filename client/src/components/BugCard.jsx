import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, Clock, User, Image } from 'lucide-react';

const priorityColors = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-red-100 text-red-800 border-red-200',
  critical: 'bg-purple-100 text-purple-800 border-purple-200'
};

const BugCard = ({ bug, onClick }) => {
  return (
    <div 
      className="card hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${priorityColors[bug.priority]}`}>
            {bug.priority}
          </span>
        </div>
        {bug.screenshots && bug.screenshots.length > 0 && (
          <Image className="h-4 w-4 text-gray-400" />
        )}
      </div>
      
      <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
        {bug.title}
      </h4>
      
      {bug.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {bug.description}
        </p>
      )}
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-1">
          <User className="h-3 w-3" />
          <span>{bug.reporter_name}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Clock className="h-3 w-3" />
          <span>{formatDistanceToNow(new Date(bug.created_at), { addSuffix: true })}</span>
        </div>
      </div>
      
      {bug.assignee && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center space-x-1 text-xs text-gray-600">
            <span>Assigned to:</span>
            <span className="font-medium">{bug.assignee}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BugCard;
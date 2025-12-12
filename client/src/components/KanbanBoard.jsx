import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import BugCard from './BugCard';

const columns = [
  { id: 'returned', title: 'Returned', color: 'bg-orange-100 border-orange-200' },
  { id: 'reported', title: 'Reported', color: 'bg-red-100 border-red-200' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-yellow-100 border-yellow-200' },
  { id: 'testing', title: 'Testing', color: 'bg-blue-100 border-blue-200' },
  { id: 'resolved', title: 'Resolved', color: 'bg-green-100 border-green-200' }
];

const KanbanBoard = ({ bugs, onBugClick, onBugUpdate }) => {
  const [optimisticBugs, setOptimisticBugs] = React.useState(bugs);

  // Update optimistic state when bugs prop changes
  React.useEffect(() => {
    setOptimisticBugs(bugs);
  }, [bugs]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { draggableId, source, destination } = result;
    const sourceStatus = source.droppableId;
    const destStatus = destination.droppableId;
    
    const bug = bugs.find(b => b.id === draggableId);
    if (!bug) return;

    // If moving within the same column, just reorder locally
    if (sourceStatus === destStatus) {
      const columnBugs = optimisticBugs.filter(b => b.status === sourceStatus);
      const reorderedBugs = Array.from(columnBugs);
      const [removed] = reorderedBugs.splice(source.index, 1);
      reorderedBugs.splice(destination.index, 0, removed);
      
      // Update optimistic state with new order
      setOptimisticBugs(prev => {
        const otherBugs = prev.filter(b => b.status !== sourceStatus);
        return [...otherBugs, ...reorderedBugs];
      });
      return;
    }

    // If moving to different column, update status
    if (bug.status !== destStatus) {
      // Optimistically update the UI immediately
      setOptimisticBugs(prev => prev.map(b => 
        b.id === draggableId ? { ...b, status: destStatus } : b
      ));

      // Then update the server
      onBugUpdate(draggableId, { 
        title: bug.title,
        description: bug.description,
        status: destStatus,
        assignee: bug.assignee,
        priority: bug.priority
      });
    }
  };

  const getBugsByStatus = (status) => {
    return optimisticBugs.filter(bug => bug.status === status);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {columns.map(column => (
          <div key={column.id} className="flex flex-col">
            <div className={`${column.color} rounded-lg p-4 mb-4`}>
              <h3 className="font-semibold text-gray-800 mb-2">{column.title}</h3>
              <span className="text-sm text-gray-600">
                {getBugsByStatus(column.id).length} issues
              </span>
            </div>
            
            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 space-y-3 min-h-[200px] p-2 rounded-lg transition-colors ${
                    snapshot.isDraggingOver ? 'bg-gray-100' : ''
                  }`}
                >
                  {getBugsByStatus(column.id).map((bug, index) => (
                    <Draggable key={bug.id} draggableId={bug.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`${snapshot.isDragging ? 'rotate-2 scale-105' : ''} transition-transform`}
                        >
                          <BugCard bug={bug} onClick={() => onBugClick(bug)} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;
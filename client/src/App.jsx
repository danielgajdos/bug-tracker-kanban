import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import KanbanBoard from './components/KanbanBoard';
import BugForm from './components/BugForm';
import BugModal from './components/BugModal';
import Login from './components/Login';
import { useAuth } from './hooks/useAuth';
import { Plus, Bug, LogOut, User } from 'lucide-react';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001');

function App() {
  const { user, loading: authLoading, logout, isAuthenticated } = useAuth();
  const [bugs, setBugs] = useState([]);
  const [showBugForm, setShowBugForm] = useState(false);
  const [selectedBug, setSelectedBug] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBugs();

    // Socket event listeners
    socket.on('bugCreated', (newBug) => {
      setBugs(prev => [newBug, ...prev]);
    });

    socket.on('bugUpdated', (updatedBug) => {
      setBugs(prev => prev.map(bug => 
        bug.id === updatedBug.id ? updatedBug : bug
      ));
    });

    socket.on('commentAdded', (comment) => {
      // Refresh the selected bug if it's open
      if (selectedBug && selectedBug.id === comment.bug_id) {
        fetchBugDetails(comment.bug_id);
      }
    });

    return () => {
      socket.off('bugCreated');
      socket.off('bugUpdated');
      socket.off('commentAdded');
    };
  }, [selectedBug]);

  const fetchBugs = async () => {
    try {
      const response = await fetch('/api/bugs', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setBugs(data);
      } else if (response.status === 401) {
        // User not authenticated, will be handled by useAuth
        setBugs([]);
      }
    } catch (error) {
      console.error('Error fetching bugs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBugDetails = async (bugId) => {
    try {
      const [bugResponse, commentsResponse] = await Promise.all([
        fetch(`/api/bugs`, { credentials: 'include' }),
        fetch(`/api/bugs/${bugId}/comments`, { credentials: 'include' })
      ]);
      
      if (bugResponse.ok && commentsResponse.ok) {
        const bugsData = await bugResponse.json();
        const commentsData = await commentsResponse.json();
        
        const bug = bugsData.find(b => b.id === bugId);
        if (bug) {
          setSelectedBug({ ...bug, comments: commentsData });
        }
      }
    } catch (error) {
      console.error('Error fetching bug details:', error);
    }
  };

  const handleBugClick = (bug) => {
    fetchBugDetails(bug.id);
  };

  const handleBugUpdate = async (bugId, updates) => {
    try {
      const response = await fetch(`/api/bugs/${bugId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      
      if (response.ok) {
        const updatedBug = await response.json();
        setBugs(prev => prev.map(bug => 
          bug.id === bugId ? updatedBug : bug
        ));
        
        if (selectedBug && selectedBug.id === bugId) {
          setSelectedBug(prev => ({ ...prev, ...updatedBug }));
        }
      }
    } catch (error) {
      console.error('Error updating bug:', error);
    }
  };

  const handleAddComment = async (bugId, comment) => {
    try {
      const response = await fetch(`/api/bugs/${bugId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(comment),
      });
      
      if (response.ok) {
        // Comment will be added via socket event
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Bug className="h-8 w-8 text-primary-500" />
              <h1 className="text-xl font-semibold text-gray-900">Bug Tracker</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{user.name}</span>
              </div>
              <button
                onClick={() => setShowBugForm(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Report Bug</span>
              </button>
              <button
                onClick={logout}
                className="btn-secondary flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <KanbanBoard 
          bugs={bugs} 
          onBugClick={handleBugClick}
          onBugUpdate={handleBugUpdate}
        />
      </main>

      {showBugForm && (
        <BugForm 
          onClose={() => setShowBugForm(false)}
          onSubmit={() => {
            setShowBugForm(false);
            fetchBugs();
          }}
        />
      )}

      {selectedBug && (
        <BugModal
          bug={selectedBug}
          onClose={() => setSelectedBug(null)}
          onUpdate={handleBugUpdate}
          onAddComment={handleAddComment}
        />
      )}
    </div>
  );
}

export default App;
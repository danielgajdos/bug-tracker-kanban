# Bug Tracker - Kanban Board

A modern, intuitive bug tracking system with a Kanban board interface. Perfect for teams who need a simple yet powerful way to manage bug reports and track their resolution progress.

## Features

### 🎯 Core Functionality
- **Kanban Board**: Visual workflow with 4 columns (Reported → In Progress → Testing → Resolved)
- **Drag & Drop**: Easily move bugs between stages
- **Real-time Updates**: Live synchronization across all users using WebSockets
- **Screenshot Support**: Upload up to 5 screenshots per bug report

### 👥 User Roles
- **Testers**: Submit detailed bug reports with screenshots
- **Developers**: Take ownership, ask questions, and track progress
- **Team**: Collaborate through comments and status updates

### 🎨 Design & UX
- Clean, modern interface built with Tailwind CSS
- Responsive design works on desktop and mobile
- Intuitive drag-and-drop interactions
- Priority-based color coding
- Real-time notifications

## Tech Stack

- **Frontend**: React 18, Tailwind CSS, React Beautiful DnD
- **Backend**: Node.js, Express, Socket.io
- **Database**: SQLite (easily upgradeable to PostgreSQL)
- **File Upload**: Multer for screenshot handling
- **Deployment**: Railway-ready configuration

## Quick Start

### Local Development

1. **Clone and install dependencies**:
   ```bash
   npm run install:all
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   cp client/.env.example client/.env
   ```

3. **Start development servers**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

### Railway Deployment

1. **Connect your repository** to Railway
2. **Set environment variables** in Railway dashboard:
   ```
   NODE_ENV=production
   CLIENT_URL=https://your-app.railway.app
   ```
3. **Deploy** - Railway will automatically build and deploy

## Usage Guide

### Reporting a Bug
1. Click "Report Bug" button
2. Fill in title, description, and priority
3. Add your contact information
4. Drag & drop screenshots (optional)
5. Submit the report

### Managing Bugs (Developer)
1. Drag bugs from "Reported" to "In Progress" to claim them
2. Click on any bug card to view details
3. Add comments to ask questions or provide updates
4. Update assignee and priority as needed
5. Move to "Testing" when ready for QA
6. Move to "Resolved" when complete

### Testing & Closure
1. Testers review bugs in "Testing" column
2. Add comments with test results
3. Move back to "In Progress" if issues found
4. Move to "Resolved" when satisfied

## API Endpoints

- `GET /api/bugs` - List all bugs
- `POST /api/bugs` - Create new bug (with file upload)
- `PUT /api/bugs/:id` - Update bug status/assignee
- `GET /api/bugs/:id/comments` - Get bug comments
- `POST /api/bugs/:id/comments` - Add comment

## Database Schema

### Bugs Table
- `id` - Unique identifier
- `title` - Bug title
- `description` - Detailed description
- `status` - Current stage (reported/in-progress/testing/resolved)
- `priority` - Priority level (low/medium/high/critical)
- `reporter_name` - Reporter's name
- `reporter_email` - Reporter's email
- `assignee` - Assigned developer
- `screenshots` - JSON array of image paths
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### Comments Table
- `id` - Unique identifier
- `bug_id` - Reference to bug
- `author` - Comment author
- `content` - Comment text
- `created_at` - Creation timestamp

## Customization

### Adding New Columns
Edit `client/src/components/KanbanBoard.jsx` and update the `columns` array:

```javascript
const columns = [
  { id: 'reported', title: 'Reported', color: 'bg-red-100 border-red-200' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-yellow-100 border-yellow-200' },
  { id: 'code-review', title: 'Code Review', color: 'bg-purple-100 border-purple-200' },
  { id: 'testing', title: 'Testing', color: 'bg-blue-100 border-blue-200' },
  { id: 'resolved', title: 'Resolved', color: 'bg-green-100 border-green-200' }
];
```

### Upgrading to PostgreSQL
Replace SQLite with PostgreSQL for production:

1. Install `pg` package: `npm install pg`
2. Update database connection in `server/index.js`
3. Add `DATABASE_URL` environment variable in Railway

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this for your projects!

---

Built with ❤️ for better bug tracking
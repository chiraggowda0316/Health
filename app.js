const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

let nextId = 4;
let tasks = [
  {
    id: 1,
    title: 'Set up repository',
    description: 'Create GitHub repo and push starter code',
    priority: 'high',
    status: 'done',
    owner: 'fresher-1',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    title: 'Create Docker image',
    description: 'Write Dockerfile and test locally',
    priority: 'medium',
    status: 'in-progress',
    owner: 'fresher-1',
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    title: 'Configure Jenkins pipeline',
    description: 'Add Jenkinsfile and run first pipeline',
    priority: 'high',
    status: 'todo',
    owner: 'fresher-1',
    createdAt: new Date().toISOString()
  }
];

const validPriority = ['low', 'medium', 'high'];
const validStatus = ['todo', 'in-progress', 'done'];

function validateTaskInput(body, partial = false) {
  const errors = [];

  if (!partial || body.title !== undefined) {
    if (!body.title || String(body.title).trim().length < 3) {
      errors.push('title must be at least 3 characters long');
    }
  }

  if (!partial || body.priority !== undefined) {
    if (!validPriority.includes(body.priority)) {
      errors.push('priority must be one of low, medium, high');
    }
  }

  if (!partial || body.status !== undefined) {
    if (!validStatus.includes(body.status)) {
      errors.push('status must be one of todo, in-progress, done');
    }
  }

  if (body.description !== undefined && String(body.description).trim().length > 200) {
    errors.push('description must be 200 characters or less');
  }

  return errors;
}

function findTask(id) {
  return tasks.find(task => task.id === Number(id));
}

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: Math.round(process.uptime()),
    taskCount: tasks.length,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/tasks', (req, res) => {
  const { status, priority, search } = req.query;
  let result = [...tasks];

  if (status) {
    result = result.filter(task => task.status === status);
  }

  if (priority) {
    result = result.filter(task => task.priority === priority);
  }

  if (search) {
    const keyword = String(search).toLowerCase();
    result = result.filter(task =>
      task.title.toLowerCase().includes(keyword) ||
      task.description.toLowerCase().includes(keyword) ||
      task.owner.toLowerCase().includes(keyword)
    );
  }

  res.json({ count: result.length, tasks: result });
});

app.get('/api/tasks/:id', (req, res) => {
  const task = findTask(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'task not found' });
  }
  res.json(task);
});

app.post('/api/tasks', (req, res) => {
  const errors = validateTaskInput(req.body);
  if (errors.length) {
    return res.status(400).json({ errors });
  }

  const task = {
    id: nextId++,
    title: String(req.body.title).trim(),
    description: String(req.body.description || '').trim(),
    priority: req.body.priority,
    status: req.body.status,
    owner: String(req.body.owner || 'unassigned').trim(),
    createdAt: new Date().toISOString()
  };

  tasks.push(task);
  res.status(201).json(task);
});

app.put('/api/tasks/:id', (req, res) => {
  const task = findTask(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'task not found' });
  }

  const errors = validateTaskInput(req.body, true);
  if (errors.length) {
    return res.status(400).json({ errors });
  }

  if (req.body.title !== undefined) task.title = String(req.body.title).trim();
  if (req.body.description !== undefined) task.description = String(req.body.description).trim();
  if (req.body.priority !== undefined) task.priority = req.body.priority;
  if (req.body.status !== undefined) task.status = req.body.status;
  if (req.body.owner !== undefined) task.owner = String(req.body.owner).trim();
  task.updatedAt = new Date().toISOString();

  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  const task = findTask(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'task not found' });
  }

  tasks = tasks.filter(item => item.id !== Number(req.params.id));
  res.json({ message: 'task deleted successfully', id: Number(req.params.id) });
});

app.get('/', (req, res) => {
  const rows = tasks.map(task => `
    <tr>
      <td>${task.id}</td>
      <td>${task.title}</td>
      <td>${task.priority}</td>
      <td>${task.status}</td>
      <td>${task.owner}</td>
    </tr>
  `).join('');

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Task Tracker</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 32px; background: #f5f7fb; color: #1f2937; }
        .wrap { max-width: 1000px; margin: 0 auto; }
        .card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); margin-bottom: 24px; }
        h1 { margin-top: 0; }
        .meta { display: flex; gap: 16px; flex-wrap: wrap; margin: 16px 0; }
        .pill { background: #e5eefc; padding: 8px 12px; border-radius: 999px; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; background: white; }
        th, td { padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: left; }
        th { background: #f9fafb; }
        code { background: #111827; color: #f9fafb; padding: 2px 6px; border-radius: 6px; }
        ul { line-height: 1.8; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="card">
          <h1>Task Tracker Dashboard</h1>
          <p>A beginner-friendly Node.js application for Jenkins and Docker assignments.</p>
          <div class="meta">
            <span class="pill">Total Tasks: ${tasks.length}</span>
            <span class="pill">Health Endpoint: /health</span>
            <span class="pill">API Base: /api/tasks</span>
          </div>
          <h3>Available Operations</h3>
          <ul>
            <li><code>GET /api/tasks</code></li>
            <li><code>GET /api/tasks/:id</code></li>
            <li><code>POST /api/tasks</code></li>
            <li><code>PUT /api/tasks/:id</code></li>
            <li><code>DELETE /api/tasks/:id</code></li>
            <li><code>GET /health</code></li>
          </ul>
        </div>
        <div class="card">
          <h3>Seed Tasks</h3>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.use((req, res) => {
  res.status(404).json({ error: 'route not found' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Task Tracker app running on port ${PORT}`);
  });
}

module.exports = app;

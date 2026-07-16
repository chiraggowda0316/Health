const test = require('node:test');
const assert = require('node:assert');
const app = require('../app');

let server;
let baseUrl;

test.before(() => {
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(() => {
  server.close();
});

test('GET /health should return healthy status', async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.strictEqual(response.status, 200);
  const data = await response.json();
  assert.strictEqual(data.status, 'healthy');
});

test('GET /api/tasks should return seeded tasks', async () => {
  const response = await fetch(`${baseUrl}/api/tasks`);
  assert.strictEqual(response.status, 200);
  const data = await response.json();
  assert.ok(Array.isArray(data.tasks));
  assert.ok(data.tasks.length >= 3);
});

test('POST /api/tasks should create a new task', async () => {
  const response = await fetch(`${baseUrl}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Write assignment notes',
      description: 'Document Jenkins pipeline stages',
      priority: 'medium',
      status: 'todo',
      owner: 'student'
    })
  });

  assert.strictEqual(response.status, 201);
  const data = await response.json();
  assert.strictEqual(data.title, 'Write assignment notes');
  assert.strictEqual(data.owner, 'student');
});

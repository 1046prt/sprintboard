// Optional demo data: `npm run seed` (wipes the collections first).
import { assertEnv, env } from './config/env.js';

assertEnv();

const { connectDB, disconnectDB } = await import('./config/db.js');
const { default: User } = await import('./models/User.js');
const { default: Project } = await import('./models/Project.js');
const { default: Issue } = await import('./models/Issue.js');
const { default: Activity } = await import('./models/Activity.js');

await connectDB();
await Promise.all([User.deleteMany(), Project.deleteMany(), Issue.deleteMany(), Activity.deleteMany()]);

const admin = await User.create({ name: 'Ava Admin', email: 'admin@sprintboard.dev', password: 'Password123', role: 'admin' });
const member = await User.create({ name: 'Hritik Member', email: 'member@sprintboard.dev', password: 'Password123' });

const website = await Project.create({
  name: 'Website Redesign',
  description: 'Refresh the marketing site and fix the slow pages.',
  createdBy: admin._id,
});
const mobile = await Project.create({
  name: 'Mobile App v2',
  description: 'Offline mode, push notifications and a new onboarding flow.',
  createdBy: member._id,
});

const samples = [
  [website, 'Audit page load times', 'high', 'in-progress', admin],
  [website, 'Replace hero image with optimised WebP', 'medium', 'todo', admin],
  [website, 'Fix broken footer links', 'low', 'done', member],
  [mobile, 'Design offline sync strategy', 'high', 'todo', member],
  [mobile, 'Add push notification opt-in screen', 'medium', 'in-progress', member],
  [mobile, 'Crash on Android 12 when rotating', 'high', 'done', admin],
];

for (const [project, title, priority, status, user] of samples) {
  const issue = await Issue.create({ title, priority, status, project: project._id, createdBy: user._id });
  await Activity.create({
    user: user._id,
    issue: issue._id,
    project: project._id,
    type: 'created',
    action: `${user.name} created issue "${title}"`,
  });
}

console.log('Seeded. Log in with admin@sprintboard.dev or member@sprintboard.dev (password: Password123)');
await disconnectDB();

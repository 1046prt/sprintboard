import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';

const dataDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data');
const dbPath = process.env.SQLITE_PATH || path.join(dataDirectory, 'sprintboard.db');
let database;
let ready;

function persist() {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, Buffer.from(database.export()));
}

export async function connectDB() {
  if (!ready) {
    ready = initSqlJs({
      locateFile: (file) => path.join(path.dirname(fileURLToPath(import.meta.url)), '../../node_modules/sql.js/dist', file),
    }).then((SQL) => {
      const source = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;
      database = source ? new SQL.Database(source) : new SQL.Database();
      database.run(`
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS users (
          _id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member',
          managerId TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS projects (
          _id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '',
          createdBy TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS issues (
          _id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT DEFAULT '',
          status TEXT NOT NULL, priority TEXT NOT NULL, project TEXT NOT NULL,
          createdBy TEXT NOT NULL, assignedTo TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS activities (
          _id TEXT PRIMARY KEY, user TEXT NOT NULL, issue TEXT NOT NULL,
          project TEXT NOT NULL, type TEXT NOT NULL, action TEXT NOT NULL, createdAt TEXT NOT NULL
        );
      `);
      persist();
      return database;
    });
  }
  await ready;
  console.log(`SQLite database ready (${dbPath})`);
}

export async function disconnectDB() {
  if (database) persist();
}

export async function getDatabase() {
  await connectDB();
  return database;
}

export function saveDatabase() {
  if (database) persist();
}

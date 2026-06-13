import sqlite3 from 'sqlite3';
import path from 'path';
import { promisify } from 'util';

const dbPath = path.join(process.cwd(), 'homework.db');
const db = new sqlite3.Database(dbPath);

export const dbRun = promisify(db.run.bind(db));
export const dbAll = promisify(db.all.bind(db));
export const dbGet = promisify(db.get.bind(db));

// Initialize tables
export async function initDB() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS homework_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start_date TEXT NOT NULL,
      subject TEXT NOT NULL,
      day TEXT NOT NULL,
      status TEXT NOT NULL,
      UNIQUE(week_start_date, subject, day)
    )
  `);
}

initDB().catch(console.error);

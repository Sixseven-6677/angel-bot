/**
 * AngelDB — طبقة قاعدة البيانات
 * SQLite عبر better-sqlite3 (متزامن، سريع، موثوق)
 */

"use strict";

const Database = require("better-sqlite3");
const path     = require("path");
const fs       = require("fs");

class AngelDB {
  constructor() {
    const dataDir = path.join(__dirname, "../data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    this.db = new Database(path.join(dataDir, "angel_tasks.db"));
    this.db.pragma("journal_mode = WAL");
    this._init();
  }

  _init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS angel_tasks (
        threadID     TEXT    PRIMARY KEY,
        message      TEXT    NOT NULL DEFAULT 'مرحبا بالجميع ❤️',
        minTime      INTEGER NOT NULL DEFAULT 30,
        maxTime      INTEGER NOT NULL DEFAULT 120,
        nextSendTime INTEGER NOT NULL DEFAULT 0,
        isActive     INTEGER NOT NULL DEFAULT 1,
        sentCount    INTEGER NOT NULL DEFAULT 0,
        createdAt    INTEGER NOT NULL,
        updatedAt    INTEGER NOT NULL
      )
    `);
  }

  getTask(threadID) {
    return this.db
      .prepare("SELECT * FROM angel_tasks WHERE threadID = ?")
      .get(String(threadID));
  }

  getAllActive() {
    return this.db
      .prepare("SELECT * FROM angel_tasks WHERE isActive = 1")
      .all();
  }

  getAll() {
    return this.db
      .prepare("SELECT * FROM angel_tasks ORDER BY createdAt DESC")
      .all();
  }

  createTask(threadID, message, minTime, maxTime) {
    const now = Date.now();
    this.db
      .prepare(`
        INSERT OR REPLACE INTO angel_tasks
          (threadID, message, minTime, maxTime, nextSendTime, isActive, sentCount, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?)
      `)
      .run(String(threadID), message, minTime, maxTime, now + minTime * 1000, now, now);
    return this.getTask(threadID);
  }

  updateTask(threadID, updates) {
    const task = this.getTask(threadID);
    if (!task) return null;
    const merged = { ...task, ...updates, updatedAt: Date.now() };
    this.db
      .prepare(`
        UPDATE angel_tasks
        SET message = ?, minTime = ?, maxTime = ?, nextSendTime = ?,
            isActive = ?, sentCount = ?, updatedAt = ?
        WHERE threadID = ?
      `)
      .run(
        merged.message, merged.minTime, merged.maxTime, merged.nextSendTime,
        merged.isActive ? 1 : 0, merged.sentCount, merged.updatedAt,
        String(threadID)
      );
    return this.getTask(threadID);
  }

  incrementSent(threadID) {
    this.db
      .prepare(`
        UPDATE angel_tasks
        SET sentCount = sentCount + 1, updatedAt = ?
        WHERE threadID = ?
      `)
      .run(Date.now(), String(threadID));
  }

  deleteTask(threadID) {
    this.db
      .prepare("DELETE FROM angel_tasks WHERE threadID = ?")
      .run(String(threadID));
  }
}

module.exports = new AngelDB();

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { recordQuery, getQueryHistory, getHistoryEntry, clearHistory, type HistoryEntry } from '../src/db/index.js';

describe('Query History', () => {
  let db: Database.Database;

  beforeEach(() => {
    // Create in-memory database
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    
    // Create the history table
    db.exec(`
      CREATE TABLE IF NOT EXISTS query_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        budget INTEGER NOT NULL,
        format TEXT NOT NULL,
        mode TEXT DEFAULT 'full',
        sources TEXT,
        tokens_used INTEGER,
        chunks_found INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_history_created ON query_history(created_at);
    `);
  });

  afterEach(() => {
    db.close();
  });

  describe('recordQuery', () => {
    it('should record a basic query', () => {
      recordQuery(db, {
        query: 'how does auth work?',
        budget: 8000,
        format: 'markdown',
      });

      const history = getQueryHistory(db);
      expect(history).toHaveLength(1);
      expect(history[0].query).toBe('how does auth work?');
      expect(history[0].budget).toBe(8000);
      expect(history[0].format).toBe('markdown');
      expect(history[0].mode).toBe('full');
    });

    it('should record query with all options', () => {
      recordQuery(db, {
        query: 'find user service',
        budget: 4000,
        format: 'xml',
        mode: 'map',
        sources: ['src', 'lib'],
        tokensUsed: 2500,
        chunksFound: 5,
      });

      const history = getQueryHistory(db);
      expect(history).toHaveLength(1);
      expect(history[0].query).toBe('find user service');
      expect(history[0].format).toBe('xml');
      expect(history[0].mode).toBe('map');
      expect(history[0].sources).toBe('src,lib');
      expect(history[0].tokensUsed).toBe(2500);
      expect(history[0].chunksFound).toBe(5);
    });

    it('should record multiple queries in order', () => {
      recordQuery(db, { query: 'first', budget: 1000, format: 'markdown' });
      recordQuery(db, { query: 'second', budget: 2000, format: 'json' });
      recordQuery(db, { query: 'third', budget: 3000, format: 'plain' });

      const history = getQueryHistory(db);
      expect(history).toHaveLength(3);
      // Most recent first
      expect(history[0].query).toBe('third');
      expect(history[1].query).toBe('second');
      expect(history[2].query).toBe('first');
    });
  });

  describe('getQueryHistory', () => {
    it('should return empty array when no history', () => {
      const history = getQueryHistory(db);
      expect(history).toEqual([]);
    });

    it('should respect limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        recordQuery(db, { query: `query ${i}`, budget: 1000, format: 'markdown' });
      }

      const limited = getQueryHistory(db, 3);
      expect(limited).toHaveLength(3);
    });

    it('should default to 20 entries', () => {
      for (let i = 0; i < 25; i++) {
        recordQuery(db, { query: `query ${i}`, budget: 1000, format: 'markdown' });
      }

      const history = getQueryHistory(db);
      expect(history).toHaveLength(20);
    });
  });

  describe('getHistoryEntry', () => {
    it('should return null for non-existent ID', () => {
      const entry = getHistoryEntry(db, 999);
      expect(entry).toBeNull();
    });

    it('should return specific entry by ID', () => {
      recordQuery(db, { query: 'first', budget: 1000, format: 'markdown' });
      recordQuery(db, { query: 'second', budget: 2000, format: 'json' });

      const entry = getHistoryEntry(db, 1);
      expect(entry).not.toBeNull();
      expect(entry!.query).toBe('first');
    });
  });

  describe('clearHistory', () => {
    it('should clear all history entries', () => {
      recordQuery(db, { query: 'one', budget: 1000, format: 'markdown' });
      recordQuery(db, { query: 'two', budget: 2000, format: 'json' });

      const count = clearHistory(db);
      expect(count).toBe(2);

      const history = getQueryHistory(db);
      expect(history).toHaveLength(0);
    });

    it('should return 0 when no history to clear', () => {
      const count = clearHistory(db);
      expect(count).toBe(0);
    });
  });
});

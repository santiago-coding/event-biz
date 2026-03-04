/**
 * Simple JSON file database for event tracking.
 * Stores all discovered events with status, scores, and notes.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'events.json');

function ensureDir() {
  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function load() {
  ensureDir();
  if (!existsSync(DB_PATH)) return { events: [], lastUpdated: null };
  return JSON.parse(readFileSync(DB_PATH, 'utf-8'));
}

function save(db) {
  db.lastUpdated = new Date().toISOString();
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

/**
 * Get all events, optionally filtered by status.
 */
export function getEvents(status = null) {
  const db = load();
  if (!status) return db.events;
  return db.events.filter(e => e.status === status);
}

/**
 * Add a new event (deduplicates by name + date).
 */
export function addEvent(event) {
  const db = load();
  const key = `${event.name}|${event.startDate}`;
  const existing = db.events.find(e => `${e.name}|${e.startDate}` === key);
  if (existing) {
    Object.assign(existing, event, { id: existing.id });
    save(db);
    return existing;
  }
  const newEvent = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    status: 'discovered',
    score: 0,
    notes: '',
    appliedDate: null,
    acceptedDate: null,
    ...event,
    createdAt: new Date().toISOString(),
  };
  db.events.push(newEvent);
  save(db);
  return newEvent;
}

/**
 * Update an existing event by ID.
 */
export function updateEvent(id, updates) {
  const db = load();
  const event = db.events.find(e => e.id === id);
  if (!event) return null;
  Object.assign(event, updates, { updatedAt: new Date().toISOString() });
  save(db);
  return event;
}

/**
 * Get event stats summary.
 */
export function getStats() {
  const events = getEvents();
  return {
    total: events.length,
    discovered: events.filter(e => e.status === 'discovered').length,
    researching: events.filter(e => e.status === 'researching').length,
    applied: events.filter(e => e.status === 'applied').length,
    accepted: events.filter(e => e.status === 'accepted').length,
    rejected: events.filter(e => e.status === 'rejected').length,
    scheduled: events.filter(e => e.status === 'scheduled').length,
    completed: events.filter(e => e.status === 'completed').length,
  };
}

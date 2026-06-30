// In-app event/error log. Standalone builds have no Metro console and no easy
// adb access, so the record pipeline writes its major events and errors here and
// the floating DebugLogPanel renders them on-device. Also mirrors to console for
// dev builds / `adb logcat`.

import { useSyncExternalStore } from 'react';

export type LogLevel = 'info' | 'event' | 'warn' | 'error';

export interface LogEntry {
  id: number;
  ts: number;
  level: LogLevel;
  msg: string;
  detail?: string;
}

const MAX_ENTRIES = 300;
let entries: LogEntry[] = [];
let nextId = 1;

type Listener = () => void;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((l) => l());
}

function stringify(detail: unknown): string {
  if (detail instanceof Error) return detail.message;
  if (typeof detail === 'string') return detail;
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

export function log(level: LogLevel, msg: string, detail?: unknown): void {
  const entry: LogEntry = {
    id: nextId++,
    ts: Date.now(),
    level,
    msg,
    detail: detail === undefined ? undefined : stringify(detail),
  };
  // Reassign (don't mutate) so getSnapshot returns a stable reference between
  // changes — required by useSyncExternalStore.
  entries = [...entries, entry].slice(-MAX_ENTRIES);

  const line = `[EduBand] ${msg}${entry.detail ? ` — ${entry.detail}` : ''}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);

  emit();
}

export const logInfo = (msg: string, detail?: unknown) => log('info', msg, detail);
export const logEvent = (msg: string, detail?: unknown) => log('event', msg, detail);
export const logWarn = (msg: string, detail?: unknown) => log('warn', msg, detail);
export const logError = (msg: string, detail?: unknown) => log('error', msg, detail);

export function clearLogs(): void {
  entries = [];
  emit();
}

export function getLogs(): LogEntry[] {
  return entries;
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Hook for the panel. Re-renders whenever a new entry is logged.
export function useLogs(): LogEntry[] {
  return useSyncExternalStore(subscribe, getLogs, getLogs);
}

// Wrap an await so a hung native call (AsyncStorage, Audio permission, etc.)
// surfaces as a visible error instead of an infinite spinner. Logs which step
// stalled so the on-device panel pinpoints exactly where the flow is stuck.
export function withTimeout<T>(label: string, promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => {
      logError(`Timed out: ${label}`, `no response after ${ms}ms`);
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      }
    );
  });
}

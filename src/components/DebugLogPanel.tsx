// Floating on-device log viewer. Mounted once at the app root so the record →
// transcribe → analyse → export pipeline's events and errors are visible on a
// standalone build where there's no Metro console. Tap the pill to expand.

import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { LogEntry, LogLevel, clearLogs, useLogs } from '@/services/logger';

const LEVEL_COLOR: Record<LogLevel, string> = {
  info: '#9AA0A6',
  event: '#34D399',
  warn: '#FBBF24',
  error: '#F87171',
};

function timeOf(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export default function DebugLogPanel() {
  const logs = useLogs();
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  // Keep the newest line in view as logs stream in.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
      return () => clearTimeout(t);
    }
  }, [logs, open]);

  const errorCount = logs.filter((l) => l.level === 'error').length;

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.pill, errorCount > 0 && styles.pillError]}
        accessibilityRole="button"
        accessibilityLabel="Open debug logs"
      >
        <Text style={styles.pillText}>
          🐞 Logs{logs.length ? ` ${logs.length}` : ''}
          {errorCount > 0 ? ` · ${errorCount}⚠` : ''}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.panel} pointerEvents="box-none">
      <View style={styles.header}>
        <Text style={styles.title}>Event log ({logs.length})</Text>
        <View style={styles.headerBtns}>
          <Pressable onPress={() => clearLogs()} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Clear</Text>
          </Pressable>
          <Pressable onPress={() => setOpen(false)} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Close ✕</Text>
          </Pressable>
        </View>
      </View>
      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.scrollBody}>
        {logs.length === 0 ? (
          <Text style={styles.empty}>No events yet. Tap record to start.</Text>
        ) : (
          logs.map((entry: LogEntry) => (
            <View key={entry.id} style={styles.row}>
              <Text style={styles.time}>{timeOf(entry.ts)}</Text>
              <View style={styles.lineBody}>
                <Text style={[styles.msg, { color: LEVEL_COLOR[entry.level] }]}>
                  {entry.level === 'error' ? '✖ ' : entry.level === 'warn' ? '⚠ ' : '• '}
                  {entry.msg}
                </Text>
                {entry.detail ? <Text style={styles.detail}>{entry.detail}</Text> : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    right: 10,
    bottom: 88,
    backgroundColor: 'rgba(20,20,22,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    zIndex: 9999,
    elevation: 12,
  },
  pillError: { borderColor: '#F87171' },
  pillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  panel: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 80,
    maxHeight: 320,
    backgroundColor: 'rgba(16,16,18,0.96)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    zIndex: 9999,
    elevation: 14,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  title: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  headerBtns: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  headerBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  scroll: { flexGrow: 0 },
  scrollBody: { padding: 10 },
  empty: { color: '#9AA0A6', fontSize: 12, fontStyle: 'italic' },
  row: { flexDirection: 'row', marginBottom: 6 },
  time: {
    color: '#6B7280',
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    width: 56,
    marginTop: 1,
  },
  lineBody: { flex: 1 },
  msg: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
  detail: { color: '#C4C7CC', fontSize: 11, lineHeight: 15, marginTop: 1 },
});

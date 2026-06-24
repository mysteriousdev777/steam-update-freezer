import { app } from 'electron';

import fs from 'fs';
import path from 'path';

// Daily log files older than this are pruned on write.
const RETENTION_DAYS = 10;

// Append-only daily log (main-<YYYY-MM-DD>.log) in <userData>/logs. Outside services/ since it
// needs Electron paths. Sync write so the line flushes before an uncaught exception exits.
export function logToFile(scope: string, message: string): void {
  try {
    const dir = app.getPath('logs');
    fs.mkdirSync(dir, { recursive: true });

    const now = new Date();
    const day = now.toISOString().slice(0, 10); // YYYY-MM-DD (UTC), matching the line timestamp

    fs.appendFileSync(
      path.join(dir, `main-${day}.log`),
      `${now.toISOString()} [${scope}] ${message}\n\n`,
    );

    pruneOldLogs(dir);
  } catch {
    // Never throw from a crash handler — fall back to console.
    console.error(`[${scope}] ${message}`);
  }
}

// Drop daily files past the retention window. Own try/catch so a prune failure can't lose the
// just-written line.
function pruneOldLogs(dir: string): void {
  try {
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    for (const name of fs.readdirSync(dir)) {
      const match = /^main-(\d{4}-\d{2}-\d{2})\.log$/.exec(name);

      if (match && Date.parse(match[1]) < cutoff) {
        fs.rmSync(path.join(dir, name));
      }
    }
  } catch {
    // Non-critical — ignore failures.
  }
}

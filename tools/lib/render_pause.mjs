// Which processes to stop to pause renders (tools/render_pause.mjs). Pure: works on a process table, so it can be tested.
// A render is: a queue script (render_queue.sh, queue_*.sh), tools/record.mjs, and everything under them (the
// parallel render workers and their ffmpeg encoders). Encoders already orphaned by an earlier stop (still writing a
// chunk into a <slug>/parts folder) are caught too.

const QUEUE = /^(\S*\/)?(zsh|bash|sh)\s+(\S+\/)?(render_queue|queue_[a-z0-9_]+)\.sh\b/; // a shell running a queue script
const RECORD = /^(\S*\/)?node\s+(\S+\/)?tools\/record\.mjs\b/;
const PART_ENCODER = /^(\S*\/)?ffmpeg\b.*\/parts\/part_\d+\.mp4/;
const CAFFEINATE = /^caffeinate\b/;

/** `ps -axo pid=,ppid=,command=` output → [{ pid, ppid, command }]. */
export function parsePs(text) {
  return text.split("\n").map((l) => l.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/)).filter(Boolean)
    .map(([, pid, ppid, command]) => ({ pid: Number(pid), ppid: Number(ppid), command }));
}

/** Every descendant of the given pids (children, grandchildren, ...). */
function descendants(procs, roots) {
  const out = new Set();
  let frontier = [...roots];
  while (frontier.length) {
    const next = procs.filter((p) => frontier.includes(p.ppid) && !out.has(p.pid)).map((p) => p.pid);
    for (const pid of next) out.add(pid);
    frontier = next;
  }
  return out;
}

/**
 * What to stop, in order: queues first (so they cannot start the next episode), then renders with their workers
 * and encoders, then caffeinate processes that only wait on one of those.
 * @param {{pid:number, ppid:number, command:string}[]} procs
 * @param {number} self  this tool's own pid (never stopped)
 * @returns {{ queues: object[], renders: object[], helpers: object[] }}
 */
export function renderProcesses(procs, self = -1) {
  const mine = (p) => p.pid !== self;
  const queues = procs.filter((p) => mine(p) && QUEUE.test(p.command) && !RECORD.test(p.command));
  const records = procs.filter((p) => mine(p) && RECORD.test(p.command));
  const under = descendants(procs, records.map((p) => p.pid));
  const encoders = procs.filter((p) => mine(p) && PART_ENCODER.test(p.command));
  const renders = [...new Map([...records, ...procs.filter((p) => under.has(p.pid)), ...encoders].map((p) => [p.pid, p])).values()];
  const watched = new Set([...queues, ...records].map((p) => String(p.pid)));
  const helpers = procs.filter((p) => mine(p) && CAFFEINATE.test(p.command) && (p.command.match(/-w\s+(\d+)/) || [])[1] && watched.has(p.command.match(/-w\s+(\d+)/)[1]));
  return { queues, renders, helpers };
}

/** The --slug and --out-dir of a record.mjs command line (to say what was paused), or null. */
export function recordTarget(command) {
  const slug = command.match(/--slug\s+(\S+)/)?.[1];
  if (!slug) return null;
  const script = command.match(/tools\/record\.mjs\s+(\S+)/)?.[1] ?? null;
  return { slug, script };
}

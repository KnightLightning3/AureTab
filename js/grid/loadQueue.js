/** Visible groups receive priority. Obsolete queued jobs do no work. */
export function createLoadQueue(limit = 4) {
  let active = 0;
  const pending = [];
  const drain = () => {
    while (active < limit && pending.length) {
      const job = pending.shift();
      if (!job.enabled()) { job.skipped?.(); continue; }
      active++;
      Promise.resolve().then(job.task).catch(() => {}).finally(() => { active--; drain(); });
    }
  };
  return {
    add(task, enabled = () => true, skipped) { pending.push({ task, enabled, skipped }); drain(); },
  };
}

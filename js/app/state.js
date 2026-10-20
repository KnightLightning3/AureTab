import { validateData, validatePrefs } from '../io/schema.js';
import { withWriteLock } from '../storage/writeLock.js';

/** The only application read-modify-write entry point. Callbacks run once and
 * must not acquire the write lock again. Read failures always abort the write. */
export function createStateController({ store, readPrefs, writePrefs, lock = withWriteLock }) {
  return {
    exclusive: lock,
    updateData(mutate) {
      return lock(async () => {
        const base = await store.load({ locked: true });
        const draft = structuredClone(base);
        if (await mutate(draft) === false) return base;
        const next = validateData({ ...draft, revision: base.revision + 1 });
        await store.save(next);
        return next;
      });
    },
    updatePrefs(mutate) {
      return lock(async () => {
        const next = await readPrefs();
        await mutate(next);
        const valid = validatePrefs(next);
        await writePrefs(valid);
        return valid;
      });
    },
  };
}

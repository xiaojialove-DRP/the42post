/* ═══════════════════════════════════════════════════════
   THE 42 POST — SkillStore
   Single source of truth for all skill data.

   Replaces three separate arrays (SHARED_SKILLS, DB_SKILLS,
   ALL_SKILLS) with a Map-backed store for O(1) lookups and
   guaranteed consistency across every UI layer.

   Usage:
     SkillStore.load(arrayOfSkills)   // merge into store
     SkillStore.find(id)              // O(1) lookup
     SkillStore.update(id, patch)     // partial update
     SkillStore.all()                 // ordered array (starlight desc)
     SkillStore.sample(n)             // random n skills
     SkillStore.size()                // total count
   ═══════════════════════════════════════════════════════ */

const SkillStore = (() => {
  // Internal Map: id (string) → skill object
  const _map = new Map();

  // Insertion-order list for stable iteration (newest DB skills first)
  // We rebuild this lazily when .all() is called.
  let _sorted = null;

  function _invalidate() { _sorted = null; }

  return {
    /**
     * Merge an array of skills into the store.
     * DB skills loaded later win over static fallbacks because
     * they carry live starlight_score, soul_hash, etc.
     * @param {Array} skills
     */
    load(skills) {
      if (!Array.isArray(skills)) return;
      skills.forEach(s => {
        if (!s || !s.id) return;
        const existing = _map.get(s.id);
        // Merge: preserve any locally-updated fields (e.g. optimistic star)
        // but let the incoming object override everything else.
        _map.set(s.id, existing ? { ...existing, ...s } : s);
      });
      _invalidate();
    },

    /**
     * O(1) skill lookup by id.
     * @param {string} id
     * @returns {Object|null}
     */
    find(id) {
      return _map.get(id) || null;
    },

    /**
     * Partially update a skill in the store (e.g. after a star API call).
     * @param {string} id
     * @param {Object} patch  – only the fields that changed
     */
    update(id, patch) {
      const skill = _map.get(id);
      if (!skill) return;
      _map.set(id, { ...skill, ...patch });
      _invalidate();
    },

    /**
     * Return all skills sorted by starlight desc, then published_at desc.
     * @returns {Array}
     */
    all() {
      if (!_sorted) {
        _sorted = [..._map.values()].sort((a, b) => {
          const starDiff = (b.starlight || b.stars || 0) - (a.starlight || a.stars || 0);
          if (starDiff !== 0) return starDiff;
          return new Date(b.published_at || 0) - new Date(a.published_at || 0);
        });
      }
      return _sorted;
    },

    /**
     * Return n randomly sampled skills.
     * @param {number} n
     * @returns {Array}
     */
    sample(n) {
      const all = this.all();
      if (n >= all.length) return [...all];
      const result = [];
      const used = new Set();
      while (result.length < n) {
        const i = Math.floor(Math.random() * all.length);
        if (!used.has(i)) { used.add(i); result.push(all[i]); }
      }
      return result;
    },

    /** Total number of skills in the store. */
    size() { return _map.size; },

    /**
     * Check if a skill id exists in the store.
     * @param {string} id
     * @returns {boolean}
     */
    has(id) { return _map.has(id); },

    /**
     * Remove a skill (e.g. after deletion).
     * @param {string} id
     */
    remove(id) { _map.delete(id); _invalidate(); },

    /** Wipe everything — used in tests. */
    _reset() { _map.clear(); _sorted = null; }
  };
})();

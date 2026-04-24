# SQL Seed Scripts

## seed-42-skills.sql

Contains INSERT statements for 42 curated skills:
- **21 SHARED_SKILLS** — High-quality, carefully designed skills
- **21 Best from DEMO_SKILLS_50** — Premium demo skills covering diverse domains

### Usage

**For PostgreSQL:**
```bash
psql your_database_name < backend/sql/seed-42-skills.sql
```

**For SQLite:**
```bash
sqlite3 data/42post.db < backend/sql/seed-42-skills.sql
```

### What Gets Imported

- ✅ 42 published skills
- ✅ System user account (for author attribution)
- ✅ Soul-Hash IDs (unique identifiers)
- ✅ Full five-layer structure (DEFINING → CONTEXTUALIZING)
- ✅ Metadata (domain, commercial rights, starlight scores)

### Skills Included

**SHARED_SKILLS (IDs 01-21):**
1. The Poetic Bridge
2. Wittgenstein's Silence
3. Ethical Humor
... and 18 more curated skills

**Best from DEMO_SKILLS_50 (IDs 23-43):**
- Comma as Philosophy
- Naming as Power
- ... and 19 more quality demos

### Regenerating the SQL

If you need to update the seed script:

```bash
cd backend/scripts
node generate-skill-sql.js
```

This will recreate `backend/sql/seed-42-skills.sql` based on current `frontend/skills.js`.

---

**Status**: Ready to import ✅

-- Initialize database and import 42 skills with 10 categories

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL,
  verification_token VARCHAR(255),
  verified INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Create skills table
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  title_cn VARCHAR(255),
  description TEXT,
  description_cn TEXT,
  domain VARCHAR(100),
  soul_hash VARCHAR(255) UNIQUE NOT NULL,
  five_layer TEXT NOT NULL,
  forge_mode VARCHAR(50) NOT NULL,
  source_agent_id VARCHAR(255),
  commercial_use VARCHAR(50) DEFAULT 'authorized',
  remix_allowed INTEGER DEFAULT 1,
  applicable_when TEXT,
  disallowed_uses TEXT,
  starlight_score INTEGER DEFAULT 0,
  published INTEGER DEFAULT 0,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_skills_author ON skills(author_id);
CREATE INDEX IF NOT EXISTS idx_skills_soul_hash ON skills(soul_hash);
CREATE INDEX IF NOT EXISTS idx_skills_published ON skills(published) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_skills_domain ON skills(domain);

-- Create skill_versions table
CREATE TABLE IF NOT EXISTS skill_versions (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  five_layer TEXT NOT NULL,
  author_signature VARCHAR(512),
  changelog TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(skill_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_skill_versions_skill ON skill_versions(skill_id);

-- Create skill_manifests table
CREATE TABLE IF NOT EXISTS skill_manifests (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL UNIQUE REFERENCES skills(id) ON DELETE CASCADE,
  soul_hash VARCHAR(255) NOT NULL UNIQUE,
  author_signature VARCHAR(512) NOT NULL,
  covenant_signatures TEXT NOT NULL DEFAULT '[]',
  manifest_json TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_skill_manifests_soul_hash ON skill_manifests(soul_hash);

-- Create probe_logs table
CREATE TABLE IF NOT EXISTS probe_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  idea_text TEXT NOT NULL,
  generated_probe TEXT NOT NULL,
  model_version VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_probe_logs_user ON probe_logs(user_id);

-- Create skill_usage_logs table
CREATE TABLE IF NOT EXISTS skill_usage_logs (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skills(id),
  agent_id VARCHAR(255),
  context TEXT,
  outcome VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_skill_usage_logs_skill ON skill_usage_logs(skill_id);

-- Create user_skill_interactions table
CREATE TABLE IF NOT EXISTS user_skill_interactions (
  id TEXT PRIMARY KEY,
  anonymous_id VARCHAR(255),
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  starred INTEGER DEFAULT 0,
  starred_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(anonymous_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_user_skill_interactions_anon_id ON user_skill_interactions(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_user_skill_interactions_skill ON user_skill_interactions(skill_id);
CREATE INDEX IF NOT EXISTS idx_user_skill_interactions_starred ON user_skill_interactions(starred) WHERE starred = 1;

-- Create categories table
CREATE TABLE IF NOT EXISTS skill_categories (
  id TEXT PRIMARY KEY,
  category_key VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  name_cn VARCHAR(100) NOT NULL,
  description TEXT,
  description_cn TEXT,
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert 10 categories
INSERT OR IGNORE INTO skill_categories (id, category_key, name, name_cn, description, description_cn, sort_order) VALUES
  ('cat-01', '01-narrative-language', 'Narrative & Language', '叙述与语言', 'How language shapes thought, how stories encode knowledge', '语言如何塑造思想，故事如何编码知识', 1),
  ('cat-02', '02-logic-reasoning', 'Logic & Reasoning', '逻辑与推理', 'Critical thinking, logical fallacies, argument structure', '批判性思维、逻辑谬误、论证结构', 2),
  ('cat-03', '03-ethics-values', 'Ethics & Values', '伦理与价值', 'Core value judgments, moral frameworks, human dignity', '核心价值判断、道德框架、人类尊严', 3),
  ('cat-04', '04-history-tradition', 'History & Tradition', '历史与传统', 'Long-term perspective, cultural context, intergenerational thinking', '长期视角、文化脉络、代际思考', 4),
  ('cat-05', '05-science-systems', 'Science & Systems', '科学与系统', 'Evidence, causality, complex systems thinking', '证据、因果关系、复杂系统思维', 5),
  ('cat-06', '06-design-experience', 'Design & Experience', '设计与体验', 'User experience, human perception, craft spirit', '用户体验、人类感知、手艺精神', 6),
  ('cat-07', '07-culture-understanding', 'Culture & Understanding', '文化与理解', 'Cross-cultural understanding, multiple perspectives, meaning translation', '跨文化理解、多元视角、意义翻译', 7),
  ('cat-08', '08-time-life', 'Time & Life', '时间与生命', 'Life meaning, legacy thinking, intergenerational responsibility', '生命意义、遗产思维、代际责任', 8),
  ('cat-09', '09-silence-space', 'Silence & Space', '寂静与空间', 'Power of silence, the unsayable, meaning in whitespace', '沉默的力量、未言说之物、留白的意义', 9),
  ('cat-10', '10-labor-value', 'Labor & Value', '劳动与价值', 'Invisible labor, value definition, economic justice', '隐形劳动、价值定义、经济公正', 10);

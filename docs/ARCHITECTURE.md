# System Architecture

THE 42 POST is a distributed, human-centered AI value alignment platform combining frontend interactivity, backend API services, external AI integration, and database persistence.

---

## 🏗️ System-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser["🌐 Web Browser<br/>Vue.js Frontend"]
    end
    
    subgraph "Application Layer"
        API["🔌 Express.js API Server<br/>Node.js Backend"]
    end
    
    subgraph "External Services"
        Claude["🤖 Claude API<br/>Anthropic"]
        Email["📧 SMTP Service<br/>Email Notifications"]
    end
    
    subgraph "Data Layer"
        DB["💾 Database<br/>SQLite/PostgreSQL"]
    end
    
    Browser -->|HTTP/REST<br/>JSON| API
    API -->|API Call<br/>Skill Generation| Claude
    API -->|SMTP<br/>Send Emails| Email
    API -->|SQL<br/>Read/Write| DB
    
    style Browser fill:#e1f5ff
    style API fill:#f3e5f5
    style Claude fill:#fff3e0
    style Email fill:#f3e5f5
    style DB fill:#e8f5e9
```

---

## 🔄 Skill Forging Workflow (4-Step Process)

```mermaid
graph LR
    Step1["🎯 IDEA<br/>Input & Concept<br/>2-3 min"]
    Step2["⚙️ GENERATE<br/>AI Creates Structure<br/>1-2 min"]
    Step3["👁️ REVIEW<br/>Preview & Edit<br/>3-5 min"]
    Step4["📤 PUBLISH<br/>Share to Library<br/>1 min"]
    
    Step1 -->|User describes<br/>idea & dimension| Step2
    Step2 -->|AI generates<br/>five-layer structure| Step3
    Step3 -->|User reviews &<br/>provides feedback| Step2
    Step3 -->|User confirms<br/>skill ready| Step4
    Step4 -->|Publish to<br/>public library| Result["✅ Skill Published<br/>Soul-Hash ID<br/>Email Notification"]
    
    style Step1 fill:#e3f2fd
    style Step2 fill:#f3e5f5
    style Step3 fill:#fff3e0
    style Step4 fill:#e8f5e9
    style Result fill:#c8e6c9
```

---

## 🎯 Five-Layer Skill Structure

```mermaid
graph TB
    Skill["🛠️ Skill Definition"]
    
    Layer1["📝 DEFINING<br/>Core principle statement"]
    Layer2["🌍 INSTANTIATING<br/>Real-world examples<br/>Before/After scenarios"]
    Layer3["🚧 FENCING<br/>Boundary conditions<br/>When to apply/not apply"]
    Layer4["✅ VALIDATING<br/>Test cases<br/>Verification criteria"]
    Layer5["🌏 CONTEXTUALIZING<br/>Cultural adaptations<br/>Global perspectives"]
    
    Skill --> Layer1
    Skill --> Layer2
    Skill --> Layer3
    Skill --> Layer4
    Skill --> Layer5
    
    style Skill fill:#e1f5ff
    style Layer1 fill:#fff9c4
    style Layer2 fill:#ffe0b2
    style Layer3 fill:#ffccbc
    style Layer4 fill:#c8e6c9
    style Layer5 fill:#b2dfdb
```

---

## 📡 API Architecture

### Core API Routes

```
┌─ /api/auth
│  ├─ POST /register         (Create new user account)
│  ├─ POST /login            (User authentication)
│  └─ POST /refresh          (Token refresh)
│
├─ /api/skills
│  ├─ GET /                  (List all skills)
│  ├─ GET /:id               (Get specific skill)
│  ├─ POST /                 (Create new skill)
│  ├─ PATCH /:id             (Update skill)
│  └─ DELETE /:id            (Delete skill)
│
├─ /api/forge
│  ├─ POST /probe            (Generate intuition probe)
│  ├─ POST /generate         (Generate five-layer structure)
│  └─ POST /regenerate       (Regenerate specific layer)
│
├─ /api/search
│  ├─ GET /                  (Search skills)
│  └─ GET /domains           (List all domains)
│
├─ /api/email
│  ├─ POST /send-forge-success    (Send publish notification)
│  └─ GET /certificate/:id        (Download creator certificate)
│
└─ /api/agents
   └─ POST /shadow-probe     (Test skill with Shadow Agent)
```

### Request/Response Flow

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant Frontend as 🌐 Frontend
    participant API as 🔌 API Server
    participant Claude as 🤖 Claude API
    participant DB as 💾 Database
    
    User->>Frontend: Enter skill idea
    Frontend->>API: POST /api/forge/generate
    API->>Claude: Generate five layers
    Claude-->>API: Return structure
    API->>DB: Save draft
    DB-->>API: Confirm save
    API-->>Frontend: Return JSON structure
    Frontend-->>User: Display preview modal
    
    User->>Frontend: Click Publish
    Frontend->>API: POST /api/skills
    API->>DB: Store published skill
    DB-->>API: Success + skill_id
    API->>Email: Send confirmation
    API-->>Frontend: Return success
    Frontend-->>User: Show completion card
```

---

## 💾 Database Schema

```mermaid
erDiagram
    USERS ||--o{ SKILLS : creates
    USERS ||--o{ EMAIL_LOGS : receives
    SKILLS ||--o{ SKILL_VERSIONS : has
    SKILLS ||--o{ DOMAINS : belongs_to
    
    USERS {
        int user_id PK
        string email UK
        string username
        string password_hash
        boolean email_verified
        timestamp created_at
        timestamp updated_at
    }
    
    SKILLS {
        int skill_id PK
        int user_id FK
        string skill_name
        text defining_layer
        json instantiating_layer
        json fencing_layer
        json validating_layer
        json contextualizing_layer
        string soul_hash UK
        string status
        timestamp created_at
        timestamp published_at
    }
    
    SKILL_VERSIONS {
        int version_id PK
        int skill_id FK
        int version_number
        json five_layer_structure
        timestamp created_at
    }
    
    DOMAINS {
        int domain_id PK
        string domain_name
        string description
    }
    
    EMAIL_LOGS {
        int log_id PK
        int user_id FK
        int skill_id FK
        string email_type
        string status
        timestamp sent_at
    }
```

---

## 🔐 Authentication & Authorization Flow

```mermaid
graph TD
    A["User Registration<br/>Email + Password"] -->|Hash password<br/>Store in DB| B["User Account Created"]
    
    C["User Login<br/>Email + Password"] -->|Verify hash| D{Credentials Valid?}
    D -->|Yes| E["Generate JWT<br/>24h expiry"]
    D -->|No| F["Return 401<br/>Unauthorized"]
    
    E -->|Token in<br/>Authorization Header| G["Protected Routes<br/>Middleware Check"]
    
    G -->|Token valid| H["Grant Access<br/>to Resources"]
    G -->|Token expired| I["401 Unauthorized<br/>Request token refresh"]
    
    style A fill:#bbdefb
    style C fill:#bbdefb
    style E fill:#c8e6c9
    style H fill:#c8e6c9
    style F fill:#ffccbc
    style I fill:#ffccbc
```

---

## 📊 Data Flow: Complete Skill Creation Journey

```mermaid
graph TD
    A["🎯 Creator enters idea<br/>Select creative dimension"] -->|POST /forge/probe| B["Generate Intuition Probe<br/>via Claude API"]
    B -->|Display on page| C["Creator reviews probe"]
    C -->|Feels comfortable| D["Move to GENERATE step"]
    
    D -->|POST /forge/generate<br/>with idea & feedback| E["Claude API generates<br/>five-layer structure"]
    E -->|Save draft to DB| F["Display in GENERATE step<br/>with animation"]
    
    F -->|Creator proceeds| G["REVIEW step<br/>Preview modal opens"]
    G -->|Edit title/definition<br/>or request regeneration| H{Creator Decision}
    
    H -->|Edit layer| I["POST /forge/regenerate<br/>with feedback"]
    I -->|Claude regenerates<br/>specific layer| E
    
    H -->|Confirm & proceed| J["PUBLISH step"]
    
    J -->|Choose license<br/>Accept covenant| K["POST /api/skills<br/>Publish to library"]
    
    K -->|Success| L["Generate Soul-Hash<br/>Create certificate"]
    L -->|Save to DB| M["Send confirmation email<br/>via SMTP"]
    
    M -->|Deliver| N["✅ Creator receives<br/>notification + card download"]
    
    style A fill:#e3f2fd
    style E fill:#f3e5f5
    style G fill:#fff3e0
    style J fill:#e8f5e9
    style N fill:#c8e6c9
```

---

## 🗂️ Project Structure

### Frontend (`frontend/`)
```
frontend/
├── index.html              (Main application - 850 lines)
├── script.js               (App logic - 6,567 lines)
├── styles.css              (Responsive design - 134 KB)
├── arena.html              (Shadow Agent experience page)
├── skills.js               (Sample skills data)
└── utils/                  (Helper functions)
```

### Backend (`backend/`)
```
backend/
├── server.js               (Express app entry point)
├── routes/
│   ├── auth.js             (Register, login, refresh)
│   ├── skills.js           (CRUD operations)
│   ├── forge.js            (Skill generation)
│   ├── search.js           (Discovery & filtering)
│   ├── email.js            (Notifications)
│   └── agents.js           (Shadow Agent API)
├── utils/
│   ├── email-service.js    (Nodemailer config)
│   ├── certificate.js      (Certificate generation)
│   └── jwt-utils.js        (Token management)
├── middleware/
│   ├── auth.js             (JWT verification)
│   ├── error-handler.js    (Error management)
│   └── logger.js           (Request logging)
├── db/
│   └── init.js             (SQLite/PostgreSQL schema)
└── .env.example            (Configuration template)
```

---

## 🔄 Integration Points

### Claude API Integration
- **Endpoint**: `https://api.anthropic.com/v1/messages`
- **Use Cases**:
  - Generate intuition probes from user ideas
  - Create five-layer skill structures
  - Regenerate specific layers based on feedback
- **Model**: Claude 3.5 Sonnet
- **Rate Limiting**: Based on Anthropic API plan

### Email Service Integration
- **Provider**: Nodemailer (SMTP compatible)
- **Supported**: Gmail, SendGrid, custom SMTP
- **Dev Mode**: Console logging (no actual sending)
- **Templates**:
  - Skill publication confirmation
  - Creator certificate download link
  - Feedback notifications

### Database Flexibility
- **Development**: SQLite (file-based, zero configuration)
- **Production**: PostgreSQL (scalable, enterprise-ready)
- **Migration**: Connection string via `DATABASE_URL`

---

## 📈 Deployment Architecture

```mermaid
graph TB
    subgraph "Developer Machine"
        LocalFE["Frontend<br/>localhost:8080"]
        LocalBE["Backend<br/>localhost:3000"]
        LocalDB["SQLite<br/>database.sqlite3"]
    end
    
    subgraph "Production Environment"
        CDN["🌐 CDN<br/>Static Assets"]
        Prod_BE["☁️ App Server<br/>Node.js/Express<br/>Railway/Heroku/Docker"]
        Prod_DB["☁️ PostgreSQL<br/>Managed Database"]
    end
    
    subgraph "External APIs"
        Anthropic["Claude API<br/>Anthropic"]
        SMTP["SMTP Service<br/>Gmail/SendGrid"]
    end
    
    LocalFE -->|Development| LocalBE
    LocalBE -->|Development| LocalDB
    
    Prod_BE -->|Production| Prod_DB
    Prod_BE -->|API calls| Anthropic
    Prod_BE -->|Send emails| SMTP
    
    CDN -->|Serve static| Browser["User Browser"]
    Browser -->|REST API| Prod_BE
    
    style LocalFE fill:#c8e6c9
    style LocalBE fill:#c8e6c9
    style LocalDB fill:#c8e6c9
    style Prod_BE fill:#bbdefb
    style Prod_DB fill:#bbdefb
```

---

## 🔍 Key Design Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|-----------|
| **Frontend: Vue.js + Vanilla JS** | Lightweight, no build step, fast dev | Limited for large-scale complexity |
| **Backend: Express.js** | Minimal, flexible, large ecosystem | Less opinionated than frameworks |
| **DB: SQLite + PostgreSQL** | SQLite for dev simplicity, PostgreSQL for prod scale | Migration complexity |
| **JWT Auth** | Stateless, scalable, works with multiple servers | No server-side session control |
| **Claude API** | State-of-the-art AI, best for creative generation | External dependency, API costs |
| **Nodemailer** | Simple, flexible, supports multiple providers | Not a managed service |
| **Five-Layer Structure** | Domain-specific, human-centered, verifiable | More complex than flat structure |

---

## 🚀 Performance Considerations

- **Frontend**: CSS-in-style, minimal JavaScript (vanilla)
- **Backend**: Async/await, connection pooling for DB
- **Database**: Indexed queries on `user_id`, `skill_id`, `email`
- **API**: Compression, caching headers for static assets
- **External APIs**: Implement retry logic, error handling

---

## 🔒 Security Considerations

- **Authentication**: JWT with 24h expiry, refresh tokens
- **Database**: Parameterized queries (prevent SQL injection)
- **Passwords**: Bcrypt hashing, never stored in plain text
- **Environment Variables**: `.env` file (never committed to git)
- **CORS**: Configured to allow frontend domain only
- **Rate Limiting**: Implement on `/api/auth` and `/api/forge` endpoints

---

**Last Updated**: 2026-04-20  
**Version**: 1.0.0

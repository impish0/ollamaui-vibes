# 🚀 Ollama UI Vibes

> **The Ultimate Local AI Development Platform**
>
> Professional-grade AI tools that respect your privacy and budget - everything you need to build with AI, nothing that phones home.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)

---

## ✨ What Makes This Special

**Ollama UI Vibes** fills the gap between hobbyist local tools and enterprise cloud platforms:

```
Hobbyist Tools          →    OUR PLATFORM    ←   Enterprise Cloud
(LM Studio, CLI)                                (PromptLayer, Langfuse)

Missing:                     We Provide:          Without:
❌ Testing frameworks        ✅ All of that        ❌ Subscriptions
❌ Version control          ✅ Locally            ❌ Privacy concerns
❌ Collaboration            ✅ For free           ❌ Rate limits
❌ Observability            ✅ Offline-capable    ❌ Vendor lock-in
```

---

## 🎯 Current Features

### 💬 **Chat Interface**
- Beautiful, responsive UI with dark mode
- Real-time streaming responses
- Markdown rendering with syntax highlighting
- System prompts for consistent behavior
- Chat history and management

### 🎮 **Multi-Model Playground** ⭐ NEW!
- **Compare 2-4 models side-by-side** in real-time
- **Individual parameter tuning** for each model
- **Performance metrics:**
  - Response time
  - Tokens per second
  - Time to first token (TTFT)
- **Export results** as JSON
- **Beautiful markdown** rendering

### 🛠️ **Model Management**
- **Pull models** from Ollama library with progress tracking
- **Delete models** you don't need
- **View detailed info** (Modelfile, license, specs)
- **Storage tracking** (total size, model count)
- Real-time model status

### 🎛️ **Model Parameters**
- **Temperature, Top P, Top K, Repeat Penalty**
- **Context window** size control
- **Seed** for reproducibility
- **4 Built-in presets:**
  - Precise (0.1 temp)
  - Balanced (0.7 temp)
  - Creative (1.2 temp)
  - Very Creative (1.8 temp)

### 📚 **RAG (Retrieval-Augmented Generation)**
- **Document upload** (PDF, DOCX, TXT, MD, JSON, CSV, code)
- **Smart chunking** (512 chars, 50 char overlap)
- **Vector search** with hnswlib-node (pure JS, no server!)
- **Configurable embeddings** per collection
- **Context injection** into chat responses

### 🎨 **Modern UI/UX**
- **5-tab navigation:** Chats, Playground, RAG, Models, Logs
- **Dark mode** with system theme detection
- **Keyboard shortcuts** (Cmd+K, Cmd+B, Cmd+,)
- **Responsive design**
- **Real-time updates**

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- [Ollama](https://ollama.com/) running locally

### Installation

```bash
# Clone the repository
git clone https://github.com/impish0/ollamaui-vibes.git
cd ollamaui-vibes

# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Run database migrations
npm run db:migrate

# Start development servers
npm run dev
```

### Usage

```bash
# Ensure Ollama is running
ollama serve

# Pull at least one model
ollama pull llama2

# (Optional) Pull an embedding model for RAG
ollama pull nomic-embed-text

# Access the app
open http://localhost:5173
```

---

## 📖 Documentation

- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Complete development guide
  - Setup instructions
  - Quality assurance (QA) scripts
  - Testing procedures
  - Debugging tips
  - Deployment guide

- **[MASTER_PLAN.md](MASTER_PLAN.md)** - Strategic roadmap
  - Vision and positioning
  - 20-week feature roadmap
  - Detailed feature specs
  - Success metrics

- **[FEATURE_PRIORITIZATION.md](FEATURE_PRIORITIZATION.md)** - Feature matrix
  - Impact vs Effort analysis
  - Build order recommendations
  - Success criteria

- **[PLAYGROUND_ROADMAP.md](PLAYGROUND_ROADMAP.md)** - Original playground vision

- **[CLAUDE.md](CLAUDE.md)** - Project overview for AI assistants

---

## 🎯 Next Big Features (Coming Soon!)

### **Tier S: Game-Changing Differentiators**

#### 1️⃣ **Prompt Version Control** 🎯
*"Git for Prompts" - First local-first prompt versioning system*

- Save prompts with full history
- Branch and experiment
- Diff viewer for changes
- Templates with variables
- Import/export for sharing

**Impact:** Teams waste 40-45% of time without prompt management
**Timeline:** 2 weeks

---

#### 2️⃣ **Golden Dataset Manager** 🎯
*Professional testing toolkit for systematic evaluation*

- Import test cases (CSV/JSON)
- Batch evaluation across datasets
- Track pass/fail rates
- Regression detection
- Export results

**Impact:** 30% improvement in prompt quality
**Timeline:** 2 weeks

---

#### 3️⃣ **Conversation Branching** 🌳
*Explore "what if" scenarios without losing context*

- Branch from any message
- Tree visualization
- Compare alternatives
- Merge insights

**Impact:** Unique differentiator, enables experimentation
**Timeline:** 2 weeks

---

### **See [MASTER_PLAN.md](MASTER_PLAN.md) for complete roadmap**

---

## 🏆 Why Choose Ollama UI Vibes?

### **vs OpenAI Playground**
✅ **100% Private** - Data never leaves your machine
✅ **Free Unlimited Use** - No per-token costs
✅ **Works Offline** - No internet required
✅ **Multi-Model Comparison** - Side-by-side testing

### **vs LM Studio**
✅ **Open Source** - Full transparency
✅ **Developer-Focused** - Testing, versioning, automation
✅ **Team Collaboration** - Git-based sharing (coming soon)
✅ **Professional Tools** - Datasets, metrics, workflows

### **vs Cloud Tools (PromptLayer, Langfuse)**
✅ **No Subscription** - $0/month forever
✅ **Complete Privacy** - GDPR/HIPAA compliant
✅ **No Rate Limits** - Experiment freely
✅ **Works Offline** - Always available

---

## 🛠️ Technology Stack

### **Frontend**
- **React** 19 - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **React Query** - Server state
- **React Markdown** - Content rendering

### **Backend**
- **Express** - Web server
- **Prisma** - ORM & migrations
- **SQLite** - Database
- **Zod** - Validation
- **Winston** - Logging
- **hnswlib-node** - Vector search

### **AI/ML**
- **Ollama** - Local model inference
- **Vector embeddings** - RAG support
- **Multiple models** - LLaMA, Mistral, CodeLlama, etc.

---

## 📊 Project Status

### ✅ **Completed (Phase 1)**
- [x] Chat interface
- [x] Model management
- [x] Multi-model playground
- [x] Parameter tuning
- [x] RAG implementation
- [x] System prompts
- [x] Dark mode
- [x] Development guide

### 🚧 **In Progress**
- [ ] Strategic planning complete
- [ ] Ready for Phase 2 development

### 📅 **Up Next (Choose One!)**
1. **Prompt Version Control** (2 weeks)
2. **Golden Dataset Manager** (2 weeks)
3. **Keyboard Shortcuts** (1 week)
4. **Conversation Branching** (2 weeks)

---

## 🧪 Quality Assurance

Run quality checks after every major update:

```bash
# Full QA suite (type checks + builds)
npm run qa:full

# Individual checks
npm run qa:types    # TypeScript type checking
npm run qa:build    # Build verification

# Development
npm run dev         # Start both servers
npm run db:migrate  # Run migrations
npm run db:studio   # Open Prisma Studio
```

**All builds currently passing:** ✅ 0 TypeScript errors, 100% code quality

---

## 🤝 Contributing

We welcome contributions! Whether it's:
- 🐛 Bug reports
- 💡 Feature requests
- 📖 Documentation improvements
- 🔧 Code contributions

**See [DEVELOPMENT.md](DEVELOPMENT.md) for guidelines.**

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

---

## 🙏 Acknowledgments

Built with love for the local AI community. Special thanks to:
- [Ollama](https://ollama.com/) - For amazing local model inference
- [hnswlib](https://github.com/nmslib/hnswlib) - For fast vector search
- All contributors and users who make this possible

---

## 🌟 Star History

If you find this useful, please ⭐ star the repo!

---

## 🎯 Our Mission

> **Make professional AI development accessible to everyone, without compromising privacy or breaking the bank.**

**Local-first. Privacy-focused. Developer-friendly. Always free.**

---

**Built with ❤️ by developers, for developers**

*Last updated: 2025-11-11*

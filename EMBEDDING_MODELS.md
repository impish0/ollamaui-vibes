# 🧠 Embedding Models Guide

Ollama UI Vibes supports **configurable embedding models** for RAG (Retrieval-Augmented Generation). Choose the best model for your use case!

**✨ No Docker Required!** ChromaDB runs in-process with local file storage at `./chroma-data`. Just pull an embedding model and start uploading documents!

---

## 🏆 Recommended Models (November 2025)

### **1. qwen3-embedding:8b** ⭐ BEST OVERALL
- **Rank:** #1 on MTEB multilingual leaderboard (70.58 score)
- **Size:** 8B parameters
- **Best for:** Multilingual content, highest accuracy
- **Pull:** `ollama pull qwen3-embedding:8b`

### **2. mxbai-embed-large** ⭐ POPULAR
- **Rank:** State-of-the-art performance
- **Best for:** General-purpose, excellent accuracy
- **Pull:** `ollama pull mxbai-embed-large`

### **3. nomic-embed-text** ⭐ FAST & RELIABLE
- **Features:** 8,192 token context, fully open-source
- **Best for:** Short queries, speed-critical apps
- **Pull:** `ollama pull nomic-embed-text`

### **4. bge-m3** ⭐ CONTEXT-RICH
- **Accuracy:** 72% retrieval accuracy
- **Best for:** Long documents, context-heavy queries
- **Pull:** `ollama pull bge-m3`

### **5. snowflake-arctic-embed:335m**
- **Size:** 335M parameters (fast!)
- **Best for:** Resource-constrained environments
- **Pull:** `ollama pull snowflake-arctic-embed:335m`

---

## 📊 Performance Comparison

| Model | Accuracy | Speed | Context | Size | Best Use Case |
|-------|----------|-------|---------|------|---------------|
| qwen3-embedding:8b | 🔥🔥🔥🔥🔥 | ⚡⚡⚡ | 8K | 8B | Multilingual, highest quality |
| mxbai-embed-large | 🔥🔥🔥🔥 | ⚡⚡⚡⚡ | 512 | ~500M | General-purpose, balanced |
| bge-m3 | 🔥🔥🔥🔥 | ⚡⚡⚡ | 8K | ~500M | Long documents, context-heavy |
| nomic-embed-text | 🔥🔥🔥 | ⚡⚡⚡⚡⚡ | 8K | 137M | Speed, short queries |
| snowflake-arctic-embed | 🔥🔥🔥 | ⚡⚡⚡⚡⚡ | 512 | 335M | Low-resource, fast |

---

## 🎯 How to Choose

### **For Maximum Accuracy:**
→ Use **qwen3-embedding:8b** or **bge-m3**

### **For Speed:**
→ Use **nomic-embed-text** or **snowflake-arctic-embed:335m**

### **For Long Documents (PDFs, books):**
→ Use **bge-m3** or **qwen3-embedding:8b** (8K context)

### **For Multilingual Content:**
→ Use **qwen3-embedding:8b** (#1 multilingual!)

### **For General Use:**
→ Use **mxbai-embed-large** (best all-rounder)

---

## 🔧 How to Configure

### **1. Pull Your Preferred Model**
```bash
# Example: Pull the best model
ollama pull qwen3-embedding:8b

# Or pull multiple for comparison
ollama pull mxbai-embed-large
ollama pull nomic-embed-text
ollama pull bge-m3
```

### **2. Select Model When Creating Collection**

**API:**
```bash
curl -X POST http://localhost:3001/api/collections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Knowledge Base",
    "description": "Technical documentation",
    "embedding": "qwen3-embedding:8b"
  }'
```

**UI (Coming Soon):**
- Go to Collections page
- Click "Create Collection"
- Select embedding model from dropdown
- See recommended models highlighted

### **3. Per-Collection Configuration**

Each collection can use a **different embedding model**! This lets you:
- Compare model performance on same data
- Optimize per use case (speed vs accuracy)
- Experiment in a true playground fashion

---

## ⚠️ Important Notes

### **Cannot Mix Models in Same Collection**
Once a collection uses an embedding model, **all documents must use that model**. This is because:
- Embeddings from different models aren't compatible
- Vector distances only make sense within same embedding space

### **To Switch Models:**
1. Create a new collection with desired model
2. Re-upload your documents
3. Delete old collection (optional)

### **Model Compatibility**
Make sure the embedding model is **pulled in Ollama** before creating a collection:
```bash
ollama list  # Check installed models
```

---

## 🧪 Benchmarking Your Models

Want to test which model works best for **your specific data**?

### **Compare Retrieval Quality:**
1. Create multiple collections with same name + model suffix
   - `"My Docs - qwen3"`
   - `"My Docs - mxbai"`
   - `"My Docs - nomic"`
2. Upload identical documents to each
3. Run same queries against each
4. Compare response quality and relevance

### **Measure Speed:**
```bash
# Check embedding generation time
time curl -X POST http://localhost:3001/api/documents/upload \
  -F "file=@test.pdf" \
  -F "collectionId=<id>"
```

---

## 📚 Resources

- [MTEB Leaderboard](https://huggingface.co/spaces/mteb/leaderboard) - Official embedding benchmarks
- [Ollama Library](https://ollama.com/library) - Browse all available models
- [Nomic AI Blog](https://www.nomic.ai/blog) - Embedding research and updates

---

## 🚀 Quick Start Examples

### **Academic Research (Accuracy-First):**
```bash
ollama pull qwen3-embedding:8b
# Create collection with qwen3-embedding:8b
# Upload papers, dissertations
```

### **Customer Support (Speed-First):**
```bash
ollama pull nomic-embed-text
# Create collection with nomic-embed-text
# Upload FAQs, documentation
```

### **Code Search:**
```bash
ollama pull mxbai-embed-large
# Create collection with mxbai-embed-large
# Upload code repositories
```

---

**Need help?** Check the main [README.md](README.md) or open an issue!

# Feature Congruence & Polish Improvements

**Goal**: Make Ollama UI Vibes feel like "these devs thought of everything"

**Status**: Generated 2025-11-11 after comprehensive codebase analysis

---

## Priority Matrix

### 🔴 Critical (Feature Parity Gaps)

#### 1. RAG Not Available in Playground
**Impact**: High - Users expect to compare models WITH their documents
**Effort**: Medium (1.5 hours)
**Status**: ❌ Missing
**Location**: `src/client/pages/PlaygroundView.tsx`

**Issue**: RAG collections work in Chat but not in Playground. Users comparing models with RAG must switch views.

**Solution**:
- Add collection selector to Playground header
- Pass `collectionIds` to comparison API
- Show RAG context indicator when active
- Display retrieval results in analysis view

---

#### 2. Model Parameters Not Persisted Per-Chat
**Impact**: High - Users lose custom parameters on page refresh
**Effort**: Medium (1-2 hours)
**Status**: ❌ Missing
**Location**: Database schema + `chatStore.ts`

**Issue**: Each chat uses default parameters, custom settings are lost. Presets exist but aren't used.

**Solution**:
- Add `parameters` JSON field to Chat model in Prisma
- Store parameters when chat is created/updated
- Load saved parameters when chat is opened
- Add "Use Current Parameters as Default" button

---

### 🟡 High-Impact Quick Wins

#### 3. Search in Models View
**Impact**: Medium - Essential with many models
**Effort**: Low (30 min)
**Status**: ❌ Missing
**Location**: `src/client/pages/ModelsView.tsx`

**Solution**: Add search input like PromptsView (lines 92-100)

---

#### 4. Keyboard Shortcut Help Modal
**Impact**: Medium - Improves discoverability
**Effort**: Low (45 min)
**Status**: ❌ Missing
**Location**: New component + `App.tsx`

**Current Shortcuts**:
- `Ctrl+K` - New chat
- `Ctrl+B` - Toggle sidebar
- `Ctrl+,` - Settings
- `Ctrl+Enter` - Run comparison (Playground)
- `Shift+Enter` - New line (MessageInput)

**Solution**: Add `Ctrl+?` to show help modal listing all shortcuts

---

#### 5. Complete Prompt Import/Export
**Impact**: Medium - User data portability
**Effort**: Low (1 hour)
**Status**: ⚠️ TODO in code
**Location**: `src/client/pages/PromptsView.tsx:61-78`

**Solution**: Follow Playground export pattern, add JSON import modal

---

#### 6. Visual Copy Feedback
**Impact**: Low - UX polish
**Effort**: Very Low (15 min)
**Status**: ❌ Missing
**Location**: All copy buttons

**Solution**: Add `toastUtils.success('Copied to clipboard')` to all copy actions

---

#### 7. Search/Filter in Collections
**Impact**: Medium - Needed when user has many collections
**Effort**: Low (45 min)
**Status**: ❌ Missing
**Location**: `src/client/pages/Collections.tsx`

**Solution**: Add search input like PromptsView

---

### 🟢 Polish & Consistency

#### 8. Standardize Loading States
**Impact**: Low - Visual consistency
**Effort**: Medium (1 hour)
**Status**: ⚠️ Inconsistent

**Current Issues**:
- PromptsView uses text "Loading prompts..."
- PlaygroundView has no loading state
- Other views use spinners

**Solution**: Create reusable `LoadingSpinner` component, apply everywhere

---

#### 9. Standardize Empty States
**Impact**: Low - UX polish
**Effort**: Low (30 min)
**Status**: ⚠️ Inconsistent

**Solution**: Create `EmptyState` component with icon + message + action

---

#### 10. Tooltips for Advanced Features
**Impact**: Low - Helps new users
**Effort**: Low (30 min)
**Status**: ⚠️ Partial

**Missing Tooltips**:
- Advanced model parameters
- RAG indicator meanings
- System prompt selector purpose
- Settings tab icons

**Solution**: Add `title` attributes and consider tooltip library for rich tooltips

---

### 🔵 Nice-to-Have Enhancements

#### 11. Bulk Operations
**Impact**: Medium - Efficiency gain
**Effort**: Medium (1.5 hours)
**Status**: ❌ Missing

**Solution**: Add checkbox selection + bulk delete for Chats, Prompts, Collections

---

#### 12. Favorites/Pinning for Chats
**Impact**: Low - Organization feature
**Effort**: Low (1 hour)
**Status**: ❌ Missing

**Solution**: Add `isPinned` to Chat model, sort pinned chats to top

---

#### 13. Search in Chat List
**Impact**: Medium - Needed for power users
**Effort**: Low (30 min)
**Status**: ❌ Missing

**Solution**: Add search input in sidebar header

---

#### 14. Export Analysis Results
**Impact**: Low - Data portability
**Effort**: Low (30 min)
**Status**: ⚠️ Playground has JSON export, no PDF/CSV

**Solution**: Add PDF export with charts from ResponseAnalyzer

---

#### 15. Parameter Presets in Chat
**Impact**: Low - Convenience feature
**Effort**: Low (45 min)
**Status**: ⚠️ Presets exist in store but unused

**Solution**: Add preset selector in ChatWindow header

---

## Feature Availability Matrix

```
┌─────────────────────────────────────────────────────┐
│ Feature Availability by View                         │
├──────────┬────────┬────────┬────────┬─────┬────────┤
│ Feature  │ Chat   │ Play   │ Models │ Logs│ Prompts│
├──────────┼────────┼────────┼────────┼─────┼────────┤
│ RAG      │   ✓    │   ✗    │   -    │  -  │   -    │
│ Syst.Pr  │   ✓    │   ✓    │   -    │  -  │   -    │
│ Params   │  No*   │   ✓    │   -    │  -  │   -    │
│ Search   │   ✗    │   -    │   ✗    │  ✗  │   ✓    │
│ Export   │   ✗    │   ✓    │   ✗    │  ✗  │  TODO  │
│ Import   │   ✗    │   -    │   ✗    │  ✗  │  TODO  │
│ Save     │   ✓    │   ✗    │   ✓    │  ✗  │   ✓    │
└──────────┴────────┴────────┴────────┴─────┴────────┘

Legend:
  ✓   = Fully implemented
  ✗   = Missing but should exist
  -   = Not applicable
  No* = Uses defaults, not persisted
  TODO = Marked as TODO in code
```

---

## Implementation Plan

### Phase 1: Quick Wins (3-4 hours)
1. ✅ Search in Models View
2. ✅ Visual Copy Feedback
3. ✅ Keyboard Shortcut Help Modal
4. ✅ Search in Collections
5. ✅ Standardize Loading States

### Phase 2: Feature Parity (3-4 hours)
6. ✅ Complete Prompt Import/Export
7. ✅ RAG in Playground
8. ✅ Search in Chat List

### Phase 3: Parameter Persistence (2-3 hours)
9. ✅ Add parameters field to Chat model
10. ✅ Persist parameters per chat
11. ✅ Add preset selector to Chat

### Phase 4: Polish (2-3 hours)
12. ✅ Bulk operations
13. ✅ Favorites/pinning
14. ✅ Advanced tooltips
15. ✅ Export enhancements

**Total Estimated Time**: 10-14 hours for comprehensive "thought of everything" polish

---

## Success Criteria

After completion, the app should feel:
- **Consistent**: Same patterns for search, export, loading across all views
- **Discoverable**: Keyboard shortcuts visible, tooltips explain features
- **Powerful**: Bulk ops, search everywhere, RAG in Playground
- **Persistent**: Parameters saved per chat, presets work
- **Polished**: Visual feedback on all actions, no missing features

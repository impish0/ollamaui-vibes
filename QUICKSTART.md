# Quick Start Guide

## Prerequisites

Make sure you have:
1. **Ollama installed and running** - Download from [ollama.ai](https://ollama.ai/)
2. **At least one model pulled** - Run `ollama pull llama2` or any other model
3. **Node.js 18+** installed

## Starting the Application

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Run database migrations** (if not already done):
   ```bash
   npm run db:migrate
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

This will start:
- Frontend (Vite) on http://localhost:5173
- Backend (Express) on http://localhost:3001

4. **Open your browser** and navigate to http://localhost:5173

## First Steps

### 1. Verify Ollama Connection
When you open the app, you should see "Connected to Ollama" indicator in the welcome screen.

If not:
- Make sure Ollama is running: `ollama serve`
- Check that Ollama is accessible at http://localhost:11434
- Verify you have models installed: `ollama list`

### 2. Create Your First Chat
1. Click the "New Chat" button in the sidebar
2. This will create a new chat with your default model

### 3. Select a Model
- Click the model selector in the chat header (top right)
- Choose from available models
- The app auto-polls for new models every 15 seconds

### 4. Start Chatting
- Type your message in the input box at the bottom
- Press Enter to send (Shift+Enter for new line)
- Watch the AI response stream in real-time with markdown formatting

### 5. Try System Prompts (Optional)
1. Click "System Prompts" button in the sidebar
2. Create a new system prompt (e.g., "You are a helpful coding assistant")
3. Close the modal
4. In any chat, click the "System Prompt" dropdown in the header
5. Select your prompt to apply it to that chat

## Features to Try

### Multi-Chat Workflow
- Create multiple chats for different topics
- Switch between chats using the sidebar
- Each chat remembers its model and system prompt

### Markdown Support
Try sending messages with:
- Code blocks with syntax highlighting
- Lists (ordered and unordered)
- Tables
- Links and formatting

### Dark Mode
- Toggle dark/light mode using the moon/sun icon in the header

### Auto Titles
- After your first message exchange, the chat will automatically generate a title
- This uses the same model you're chatting with

## Troubleshooting

### "No models available"
- Run `ollama list` to see your models
- Pull a model if needed: `ollama pull llama2`
- Restart Ollama: `ollama serve`

### Server won't start
- Check if port 3001 is available
- Make sure the database migration completed successfully
- Check the terminal for error messages

### Frontend won't connect to backend
- Verify the backend is running on port 3001
- Check the Vite proxy configuration in `vite.config.ts`
- Open DevTools console for any error messages

### Streaming not working
- Check your internet/network settings
- Verify Ollama is responding: `curl http://localhost:11434/api/tags`
- Check browser console for errors

## Tips

1. **Keyboard Shortcuts**
   - Enter: Send message
   - Shift+Enter: New line in message

2. **Model Selection**
   - You can change the model mid-conversation
   - The new model will be used for subsequent messages

3. **System Prompts**
   - System prompts affect the entire conversation
   - Change them at any time
   - They're included in every API call to Ollama

4. **Performance**
   - First response may be slower as Ollama loads the model
   - Subsequent responses are faster
   - Larger models take more time and memory

## Next Steps

- Explore different models (llama2, mistral, codellama, etc.)
- Create specialized system prompts for different tasks
- Use multiple chats for different projects or topics
- Check the README.md for more detailed documentation

Enjoy using Ollama UI Vibes! 🚀

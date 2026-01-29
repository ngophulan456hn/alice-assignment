# AI Chat Application

A full-stack AI chat application with document upload capabilities. Built with FastAPI (Python) and Next.js (React).

## Features

- 💬 Chat with AI using Ollama (local LLM)
- 📄 Upload PDF, CSV, or TXT files for context-aware conversations
- 🎨 Modern, responsive UI with Tailwind CSS + daisyUI components
- 🔄 Real-time chat with typing indicators
- ✅ System health check for backend, Redis, and Ollama status

## Prerequisites

- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.ai/) installed locally

## Setup

### 1. Install Ollama and Pull a Model

```bash
# Install Ollama (macOS)
brew install ollama

# Start Ollama service
ollama serve

# In another terminal, pull a model
ollama pull llama3
```

### 2. Install Redis

```bash
# Install Redis (macOS)
brew install redis

# Start Redis service
brew services start redis
```

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Usage

1. Make sure Ollama is running (`ollama serve`)
2. Start the backend server
3. Start the frontend development server
4. Open `http://localhost:3000` in your browser
5. Start chatting!

### Uploading Documents

- Click the "Upload PDF/CSV" button in the header
- Select a PDF, TXT or CSV file
- The document content will be used as context for your questions
- A green indicator shows when a document is loaded
- Click the × button to clear the document context

## API Endpoints

| Endpoint                        | Method | Description                                  |
| ------------------------------- | ------ | -------------------------------------------- |
| `/`                             | GET    | Root endpoint with Redis status              |
| `/health`                       | GET    | Health check (backend, Redis, Ollama, model) |
| `/chat`                         | POST   | Send a message and get AI response           |
| `/upload`                       | POST   | Upload a PDF, CSV, or TXT file               |
| `/document/status/{session_id}` | GET    | Check if a document is loaded for session    |
| `/document/{session_id}`        | DELETE | Clear the document context for session       |
| `/history/{session_id}`         | GET    | Retrieve chat history for session            |
| `/session/{session_id}`         | DELETE | Clear entire session (chat + document)       |

## Tech Stack & Architecture Decisions

### Why These Technologies?

Having worked with these frameworks on previous projects, I chose this stack based on hands-on experience and the specific requirements of building an AI chat application.

### Backend: FastAPI + Python

| Library      | Purpose         | Why I Chose It                                                                                                                                                                                                                                                                                                                                                       |
| ------------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FastAPI**  | Web framework   | From my previous Python projects, FastAPI stands out for its async-first design—critical for handling LLM API calls that can take seconds to respond. The automatic OpenAPI documentation also speeds up development and debugging. I've used Flask before, but FastAPI's native async support and type hints make it superior for I/O-bound applications like this. |
| **Pydantic** | Data validation | Built into FastAPI, provides automatic request/response validation. Less boilerplate than manual validation I used to write.                                                                                                                                                                                                                                         |
| **httpx**    | HTTP client     | Async HTTP client for Ollama API calls. I chose this over `requests` because it supports async operations natively, avoiding blocking the event loop during LLM inference.                                                                                                                                                                                           |
| **pypdf**    | PDF parsing     | Lightweight and pure Python—no system dependencies like `pdfminer` requires. Easy to deploy.                                                                                                                                                                                                                                                                         |
| **pandas**   | CSV processing  | Overkill for simple CSV reading, but I'm familiar with it from data projects, and `to_markdown()` gives nice formatted output for the LLM context.                                                                                                                                                                                                                   |
| **redis**    | Session storage | Provides fast, ephemeral storage for chat history and file context. Perfect for session-based data with automatic expiration (24-hour TTL).                                                                                                                                                                                                                          |

**Trade-offs:**

- ✅ FastAPI's async model handles concurrent chat requests efficiently
- ✅ Python ecosystem has mature NLP/AI libraries if we need to extend functionality
- ⚠️ Python is slower than Go/Rust for raw performance, but for an I/O-bound chat app, this rarely matters

### Frontend: Next.js + React + TypeScript

| Library          | Purpose         | Why I Chose It                                                                                                                                                                                                                                                    |
| ---------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js 15**   | React framework | My go-to for React projects. The App Router provides clean file-based routing, and I'm comfortable with its conventions from previous work. For this simple chat UI, I'm using client-side rendering, but Next.js gives room to add SSR features later if needed. |
| **React 19**     | UI library      | Most familiar frontend library from my experience. Component-based architecture makes the chat UI easy to reason about and extend.                                                                                                                                |
| **TypeScript**   | Type safety     | Catches bugs early. After working on larger projects, I've learned that TypeScript's upfront cost pays off in maintainability.                                                                                                                                    |
| **Tailwind CSS** | Styling         | Rapid prototyping without context-switching to separate CSS files. I've used it in several projects and find it faster than traditional CSS or CSS-in-JS for building UIs quickly.                                                                                |
| **daisyUI**      | UI components   | Provides pre-built, themeable components (modals, buttons, chat bubbles, badges) that work seamlessly with Tailwind. Reduces custom CSS and ensures consistent design patterns across the app.                                                                    |

**Trade-offs:**

- ✅ Next.js provides excellent DX with hot reload and built-in optimizations
- ✅ React's ecosystem means plenty of ready-made components if needed
- ✅ TypeScript prevents common runtime errors from API response handling
- ⚠️ Next.js is heavier than vanilla React for a simple SPA—but the DX benefits outweigh the bundle size concern
- ⚠️ Tailwind classes can get verbose, but I find it faster than writing custom CSS

### Architecture Decisions

1. **Ollama for Local LLM**: Chose local inference over cloud APIs (OpenAI, Claude) for privacy, no API costs during development, and offline capability. Trade-off is requiring users to install Ollama.

2. **Global State for Documents**: Simple in-memory storage rather than a database. This is intentional for the assignment scope—easy to understand and debug. For production, I'd use Redis or a proper document store.

3. **Direct API Calls vs LangChain**: Started with LangChain but removed it for simplicity. For a basic chat + context injection, raw HTTP calls are clearer and have fewer dependencies. Would reconsider if adding features like conversation memory or RAG.

4. **Client-Side State Management**: Using React's `useState` instead of Redux/Zustand. For a chat app with simple state (messages array, loading flags), built-in hooks are sufficient and reduce complexity.

5. **Redis over PostgreSQL for Session Storage**: I chose Redis over PostgreSQL because the requirement focused on "session-based" history. Redis provides lower latency for real-time chat and simplifies the schema requirements for storing unstructured file context. The data structure is simple key-value pairs with automatic TTL expiration (24 hours), which fits the ephemeral nature of chat sessions. PostgreSQL would be overkill for this use case and would require more complex schema design and connection pooling.

## Project Structure

```
alice-assignment/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── redis_service.py     # Redis session management
│   ├── requirements.txt     # Python dependencies
│   ├── file_upload/         # Example files for testing
│   │   ├── company_info.txt     # Company overview (TXT example)
│   │   ├── sales_data.csv       # Sales data (CSV example)
│   │   └── employee_handbook.pdf # Employee policies (PDF example)
│   └── venv/                # Virtual environment
├── frontend/
│   ├── app/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── ChatInput.tsx    # Message input area
│   │   │   ├── ChatMessages.tsx # Message list display
│   │   │   ├── Header.tsx       # Navigation header
│   │   │   ├── HealthModal.tsx  # System health modal
│   │   │   └── Toast.tsx        # Toast notifications
│   │   ├── page.tsx         # Main chat page
│   │   ├── layout.tsx       # Root layout
│   │   └── globals.css      # Global styles + daisyUI config
│   ├── package.json
│   └── ...
└── README.md
```

## Example Files for Testing

The `backend/file_upload/` folder contains example files you can use to test the document upload feature:

| File                    | Type | Description                                        | Sample Questions                                    |
| ----------------------- | ---- | -------------------------------------------------- | --------------------------------------------------- |
| `company_info.txt`      | TXT  | ACME Corp overview, products, and executives       | "Who is the CEO?", "What products does ACME offer?" |
| `sales_data.csv`        | CSV  | 6 months of sales data by product and region       | "Total revenue in March?", "Best selling product?"  |
| `employee_handbook.pdf` | PDF  | Employee policies (PTO, benefits, code of conduct) | "How many PTO days?", "What is the 401k match?"     |

## Improvement If I Have More Time

- Add user authentication for multi-user support
- Implement RAG (Retrieval Augmented Generation) for better document querying
- Add support for more file formats (DOCX, images with OCR)
- Implement conversation branching and history navigation
- Create Docker container for each service (Redis, Ollama, Backend, Frontend)
- Deployment to cloud service or host website
- Setup unit test or automation test on both frontend and backend
- Add StreamingResponse for return message from model
- Add logger to the backend to catch bug and monitor incoming request

from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import pandas as pd
from pypdf import PdfReader
import io
from typing import Optional

import redis_service

app = FastAPI(title="AI Chat Backend")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ollama configuration
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "llama3"


class ChatRequest(BaseModel):
    message: str
    session_id: str


class ChatResponse(BaseModel):
    response: str


class UploadRequest(BaseModel):
    session_id: str


class UploadResponse(BaseModel):
    message: str
    filename: str
    text_preview: str


class SessionStatus(BaseModel):
    has_document: bool
    document_name: Optional[str]
    message_count: int


@app.get("/")
async def root():
    redis_status = "connected" if redis_service.ping() else "disconnected"
    return {"message": "AI Chat Backend is running", "redis": redis_status}


@app.get("/health")
async def health():
    """Health check endpoint - checks backend, Redis, and Ollama status."""
    # Check Redis
    redis_ok = redis_service.ping()

    # Check Ollama
    ollama_ok = False
    ollama_model = None
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if response.status_code == 200:
                data = response.json()
                models = [m["name"] for m in data.get("models", [])]
                ollama_ok = True
                ollama_model = (
                    OLLAMA_MODEL if any(OLLAMA_MODEL in m for m in models) else None
                )
    except Exception:
        pass

    all_ok = redis_ok and ollama_ok and ollama_model is not None

    return {
        "status": "healthy" if all_ok else "degraded",
        "backend": "running",
        "redis": "connected" if redis_ok else "disconnected",
        "ollama": "connected" if ollama_ok else "disconnected",
        "model": ollama_model if ollama_model else f"{OLLAMA_MODEL} not found",
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Send a message to Ollama and get a response.
    Uses Redis to store conversation history and file context per session.
    """
    session_id = request.session_id

    # Refresh session TTL
    redis_service.refresh_session(session_id)

    # Get context and history from Redis
    context_data = redis_service.get_context(session_id)
    history = redis_service.get_history(session_id)

    # Build the prompt with context and history
    prompt_parts = []

    # Add document context if available
    if context_data:
        prompt_parts.append(
            f"""You are a helpful assistant. You have access to the following document that the user uploaded:

--- DOCUMENT: {context_data['filename']} ---
{context_data['text']}
--- END DOCUMENT ---

Use this document to answer questions when relevant. If the question is not related to the document, you can still answer it."""
        )
    else:
        prompt_parts.append("You are a helpful assistant.")

    # Add conversation history
    if history:
        prompt_parts.append("\nConversation history:")
        for msg in history[-10:]:  # Keep last 10 messages for context
            role = "User" if msg["role"] == "user" else "Assistant"
            prompt_parts.append(f"{role}: {msg['content']}")

    # Add current message
    prompt_parts.append(f"\nUser: {request.message}")
    prompt_parts.append("Assistant:")

    prompt = "\n".join(prompt_parts)

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            )
            response.raise_for_status()
            result = response.json()
            ai_response = result.get("response", "No response from model")

            # Save messages to Redis
            redis_service.save_message(session_id, "user", request.message)
            redis_service.save_message(session_id, "assistant", ai_response)

            return ChatResponse(response=ai_response)
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to Ollama. Make sure Ollama is running (ollama serve)",
        )
    except httpx.ReadTimeout:
        raise HTTPException(
            status_code=504,
            detail="Request timed out. The model is taking too long to respond. This often happens on the first request when the model is loading into memory. Please try again.",
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Ollama error: {e.response.text}",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...), x_session_id: str = Header(..., alias="X-Session-ID")
):
    """
    Upload a PDF, CSV, or TXT file and extract its text content.
    The extracted text will be stored in Redis for the session.
    """
    session_id = x_session_id

    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    # Get file extension
    filename = file.filename.lower()

    try:
        content = await file.read()

        if filename.endswith(".pdf"):
            # Extract text from PDF
            pdf_reader = PdfReader(io.BytesIO(content))
            text_parts = []
            for page in pdf_reader.pages:
                text = page.extract_text()
                if text:
                    text_parts.append(text)
            extracted_text = "\n\n".join(text_parts)

        elif filename.endswith(".csv"):
            # Load CSV and convert to markdown table
            df = pd.read_csv(io.BytesIO(content))
            extracted_text = df.to_markdown(index=False)

        elif filename.endswith(".txt"):
            # Read plain text file
            extracted_text = content.decode("utf-8")

        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type. Please upload a PDF, CSV, or TXT file.",
            )

        if not extracted_text or not extracted_text.strip():
            raise HTTPException(
                status_code=400, detail="Could not extract any text from the file."
            )

        # Store the extracted text in Redis for this session
        redis_service.save_context(session_id, extracted_text, file.filename)

        # Create a preview (first 500 characters)
        preview = (
            extracted_text[:500] + "..."
            if len(extracted_text) > 500
            else extracted_text
        )

        return UploadResponse(
            message="File processed successfully",
            filename=file.filename,
            text_preview=preview,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@app.delete("/document/{session_id}")
async def clear_document(session_id: str):
    """Clear the document context for a session."""
    redis_service.clear_context(session_id)
    return {"message": "Document context cleared"}


@app.get("/document/status/{session_id}", response_model=SessionStatus)
async def document_status(session_id: str):
    """Check session status including document and message count."""
    context_data = redis_service.get_context(session_id)
    history = redis_service.get_history(session_id)

    return SessionStatus(
        has_document=context_data is not None,
        document_name=context_data["filename"] if context_data else None,
        message_count=len(history),
    )


@app.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """Clear all data for a session (chat history and document)."""
    redis_service.clear_session(session_id)
    return {"message": "Session cleared"}


@app.get("/history/{session_id}")
async def get_history(session_id: str):
    """Get chat history for a session."""
    history = redis_service.get_history(session_id)
    return {"messages": history}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

"""
Redis service for session-based storage of chat history and file context.

Key Structure:
- chat:{session_id} - List of chat messages as JSON
- context:{session_id} - Extracted text from uploaded files

TTL: Sessions expire after 24 hours of inactivity
"""

import redis
import json
from typing import Optional
from datetime import timedelta

# Redis configuration
REDIS_HOST = "localhost"
REDIS_PORT = 6379
REDIS_DB = 0
SESSION_TTL = timedelta(hours=24)  # Sessions expire after 24 hours

# Initialize Redis client
redis_client = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    db=REDIS_DB,
    decode_responses=True,  # Automatically decode bytes to strings
)


def get_chat_key(session_id: str) -> str:
    """Generate Redis key for chat history."""
    return f"chat:{session_id}"


def get_context_key(session_id: str) -> str:
    """Generate Redis key for file context."""
    return f"context:{session_id}"


def ping() -> bool:
    """Check if Redis connection is alive."""
    try:
        return redis_client.ping()
    except redis.ConnectionError:
        return False


# ============ Chat History Functions ============


def save_message(session_id: str, role: str, content: str) -> None:
    """
    Save a single message to the chat history.

    Args:
        session_id: Unique session identifier
        role: 'user' or 'assistant'
        content: The message content
    """
    key = get_chat_key(session_id)
    message = json.dumps({"role": role, "content": content})
    redis_client.rpush(key, message)
    redis_client.expire(key, SESSION_TTL)


def get_history(session_id: str) -> list[dict]:
    """
    Retrieve the full chat history for a session.

    Args:
        session_id: Unique session identifier

    Returns:
        List of message dicts with 'role' and 'content' keys
    """
    key = get_chat_key(session_id)
    messages = redis_client.lrange(key, 0, -1)
    return [json.loads(msg) for msg in messages]


def clear_history(session_id: str) -> None:
    """Clear chat history for a session."""
    key = get_chat_key(session_id)
    redis_client.delete(key)


# ============ File Context Functions ============


def save_context(session_id: str, text: str, filename: str) -> None:
    """
    Save extracted file text as context for the session.

    Args:
        session_id: Unique session identifier
        text: Extracted text from the file
        filename: Original filename for reference
    """
    key = get_context_key(session_id)
    context_data = json.dumps({"text": text, "filename": filename})
    redis_client.set(key, context_data, ex=SESSION_TTL)


def get_context(session_id: str) -> Optional[dict]:
    """
    Retrieve the file context for a session.

    Args:
        session_id: Unique session identifier

    Returns:
        Dict with 'text' and 'filename' keys, or None if no context exists
    """
    key = get_context_key(session_id)
    data = redis_client.get(key)
    if data:
        return json.loads(data)
    return None


def clear_context(session_id: str) -> None:
    """Clear file context for a session."""
    key = get_context_key(session_id)
    redis_client.delete(key)


# ============ Session Management ============


def clear_session(session_id: str) -> None:
    """Clear all data for a session (both chat and context)."""
    clear_history(session_id)
    clear_context(session_id)


def refresh_session(session_id: str) -> None:
    """Refresh TTL for all session keys."""
    chat_key = get_chat_key(session_id)
    context_key = get_context_key(session_id)

    if redis_client.exists(chat_key):
        redis_client.expire(chat_key, SESSION_TTL)
    if redis_client.exists(context_key):
        redis_client.expire(context_key, SESSION_TTL)


def session_exists(session_id: str) -> bool:
    """Check if a session has any data."""
    chat_key = get_chat_key(session_id)
    context_key = get_context_key(session_id)
    return redis_client.exists(chat_key) or redis_client.exists(context_key)

from uuid import uuid4
import os
import json
import logging
import time
import collections.abc
import httpx
from typing import Literal
from dotenv import load_dotenv
from fastapi import FastAPI, BackgroundTasks, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError
from cachetools import TTLCache
from graph import agenerate_graph, stream_generate_graph, stream_generate_users


load_dotenv()
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "*")
TURNSTILE_SECRET_KEY = os.getenv("TURNSTILE_SECRET_KEY")


# Configure package-level logger
logger = logging.getLogger("app")  # Parent logger for "app" package
logger.setLevel(logging.DEBUG)
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.DEBUG)
formatter = logging.Formatter(
    "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)
logger.debug("Application starting up")

# Module-specific logger
module_logger = logging.getLogger(__name__)  # __name__ = "app.main"

results = {}  # In-memory storage (use Redis in production)

# Rate limiting configuration
RATE_LIMIT_REQUESTS = int(
    os.getenv("RATE_LIMIT_REQUESTS", "10")
)  # requests per window
RATE_LIMIT_WINDOW = int(
    os.getenv("RATE_LIMIT_WINDOW", "60")
)  # window in seconds

# Rate limiting storage using TTL cache - automatically expires entries
rate_limit_storage = TTLCache(maxsize=10000, ttl=RATE_LIMIT_WINDOW)


def get_client_ip(request: Request) -> str:
    """Extract client IP address from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    return request.client.host if request.client else "unknown"


async def check_rate_limit(request: Request) -> None:
    """Check if the request should be rate limited using TTL cache."""
    client_ip = get_client_ip(request)

    # Get current request count for this IP (defaults to 0
    # if not found or expired)
    current_count = rate_limit_storage.get(client_ip, 0)

    # Check if rate limit exceeded
    if current_count >= RATE_LIMIT_REQUESTS:
        module_logger.warning(f"Rate limit exceeded for IP {client_ip}")
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Rate limit exceeded",
                "message": (
                    f"Too many requests. Limit: {RATE_LIMIT_REQUESTS} "
                    f"requests per {RATE_LIMIT_WINDOW} seconds"
                ),
                "retry_after": RATE_LIMIT_WINDOW,
            },
            headers={"Retry-After": str(RATE_LIMIT_WINDOW)},
        )

    # Increment counter - TTL cache will automatically expire entries
    rate_limit_storage[client_ip] = current_count + 1

    module_logger.debug(
        f"Rate limit check passed for IP {client_ip}: "
        f"{rate_limit_storage.get(client_ip, 0)}/{RATE_LIMIT_REQUESTS}"
    )


async def verify_turnstile_token(token: str, client_ip: str) -> bool:
    """Verify Cloudflare Turnstile token."""
    if not TURNSTILE_SECRET_KEY:
        module_logger.warning(
            "Turnstile secret key not configured, skipping verification"
        )
        return True  # Allow requests if not configured

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data={
                    "secret": TURNSTILE_SECRET_KEY,
                    "response": token,
                    "remoteip": client_ip,
                },
            )
            result = response.json()

            if result.get("success"):
                module_logger.debug(
                    f"Turnstile verification successful for IP {client_ip}"
                )
                return True
            else:
                module_logger.warning(
                    f"Turnstile verification failed for IP {client_ip}: "
                    f"{result.get('error-codes', [])}"
                )
                return False

    except Exception as e:
        module_logger.error(f"Turnstile verification error: {e}")
        return False


app = FastAPI()

# Log rate limiting configuration
module_logger.info(
    f"Rate limiting configured: {RATE_LIMIT_REQUESTS} "
    f"requests per {RATE_LIMIT_WINDOW} seconds"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def async_enumerate(
    iterable: collections.abc.AsyncIterator, start: int = 0
):
    """Asynchronously enumerate an async
    iterator from a given start value."""
    i = start
    async for item in iterable:
        yield i, item
        i += 1


class SubjectRequest(BaseModel):
    subject: str


class UsersRequest(BaseModel):
    domain: str
    number_of_users: int = 10


MODELS = [
    "gpt-4o-mini-2024-07-18",
    "gpt-4.1-mini-2025-04-14",
    "gpt-3.5-turbo-0125",
    "gpt-3.5-turbo-16k-0613",
    "o4-mini-2025-04-16",
    "gpt-4.1-2025-04-14",
    "gpt-4o-2024-08-06",
]


class ModelRequest(BaseModel):
    model: (
        Literal["gpt-4o-mini-2024-07-18"]
        | Literal["gpt-4.1-mini-2025-04-14"]
        | Literal["o4-mini-2025-04-16"]
    )


async def process_openai(request: SubjectRequest, task_id: str):
    response = await agenerate_graph(request.subject)
    results[task_id] = response


@app.post("/api/generate-graph")
async def generate_knowledge_graph(
    request: SubjectRequest,
    http_request: Request,
    _: None = Depends(check_rate_limit),
):
    response = await agenerate_graph(request.subject)
    return response


async def generate_graph_stream_response(
    subject: str,
    model: str,
    parent_graph_id: str = None,
    parent_node_id: int = None,
    source_node_label: str = None,
    title: str = None,
):
    """Generate knowledge graph entities based on the subject using
    the specified model."""
    metadata = {
        "status": "streaming",
        "result": {
            "id": str(uuid4()),
            "createdAt": int(time.time() * 1000),
            "subject": subject,
            "model": model,
            "message": "Streaming knowledge graph entities",
            "parentGraphId": parent_graph_id,  # Parent graph ID
            "parentNodeId": parent_node_id,  # Parent node ID
            "sourceNodeLabel": source_node_label,  # Source node label
            "title": title,  # Graph title for hierarchy
        },
    }
    yield (json.dumps(metadata) + "\n")
    graph_entities = stream_generate_graph(subject, model)
    logger.info(f"yielded metadata {metadata}")
    try:
        if os.getenv("ERROR_STREAM") == "TRUE":
            raise Exception("debug error")
        async for i, entity in async_enumerate(graph_entities):
            if os.getenv("ERROR_STREAM") == str(i):
                raise Exception(f"debug error on {i}")
            if entity is None:
                continue
            logger.debug(f"yielding entity: {entity}")
            yield entity.model_dump_json() + "\n"

        logger.info("complete")
        yield (
            json.dumps({"result": "graph complete", "status": "complete"})
            + "\n"
        )
    except ValidationError:
        logger.exception("Error generating knowledge graph")
        yield json.dumps({"result": "error", "status": "error"}) + "\n"
    except Exception as e:
        logger.exception(f"Error generating knowledge graph: {e}")
        yield json.dumps({"result": "error", "status": "error"}) + "\n"


class StreamingGraphRequest(BaseModel):
    subject: str
    model: (
        Literal["gpt-4o-mini-2024-07-18"]
        | Literal["gpt-4.1-mini-2025-04-14"]
        | Literal["o4-mini-2025-04-16"]
        | Literal["gpt-4.1-2025-04-14"]
        | Literal["gpt-4o-2024-08-06"]
    )
    turnstile_token: str | None = None
    parent_graph_id: str | None = None  # Parent graph ID
    parent_node_id: int | None = None  # Parent node ID
    source_node_label: str | None = None  # Source node label
    title: str | None = None  # Graph title for hierarchy


@app.get("/")
async def home():
    return {"data": "hello world"}


@app.get("/api/rate-limit-test")
async def rate_limit_test(
    http_request: Request, _: None = Depends(check_rate_limit)
):
    """Test endpoint to verify rate limiting is working."""
    client_ip = get_client_ip(http_request)
    current_usage = rate_limit_storage.get(client_ip, 0)
    return {
        "message": "Rate limit test successful",
        "client_ip": client_ip,
        "current_requests": current_usage,
        "limit": RATE_LIMIT_REQUESTS,
        "window_seconds": RATE_LIMIT_WINDOW,
    }


@app.post("/api/stream-generate-graph")
async def stream_generate_knowledge_graph(
    request: StreamingGraphRequest,
    http_request: Request,
    _: None = Depends(check_rate_limit),
):
    """
    Stream knowledge graph entities based on the subject using
    the specified model.
    This endpoint streams the graph entities as they are generated.
    """
    # Verify Turnstile token if provided
    if request.turnstile_token:
        client_ip = get_client_ip(http_request)
        is_valid = await verify_turnstile_token(
            request.turnstile_token, client_ip
        )
        if not is_valid:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Invalid security verification",
                    "message": (
                        "Security verification failed. Please try again."
                    ),
                },
            )
    elif TURNSTILE_SECRET_KEY:
        # If Turnstile is configured but no token provided, reject request
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Security verification required",
                "message": "Security verification token is required.",
            },
        )

    return StreamingResponse(
        generate_graph_stream_response(
            request.subject,
            request.model,
            request.parent_graph_id,
            request.parent_node_id,
            request.source_node_label,
            request.title,
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )


async def generate_users_stream_response(
    subject: str, number_of_users: int, model: str
):
    """Stream user entities based on the subject using the specified model."""
    graph_entities = stream_generate_users(subject, number_of_users, model)
    async for entity in graph_entities:
        if entity is None:
            continue
        yield entity.model_dump_json() + "\n"


@app.post("/api/stream-users")
async def stream_users(
    request: UsersRequest,
    model_request: ModelRequest,
    http_request: Request,
    _: None = Depends(check_rate_limit),
):
    return StreamingResponse(
        generate_users_stream_response(
            request.domain, request.number_of_users, model_request.model
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )


@app.post("/api/start-generate-graph")
async def start_generate_graph(
    request: SubjectRequest,
    background_tasks: BackgroundTasks,
    http_request: Request,
    _: None = Depends(check_rate_limit),
):
    task_id = str(uuid4())
    background_tasks.add_task(process_openai, request, task_id)
    return {"task_id": task_id}


@app.get("/api/graph/{task_id}")
async def get_result(task_id: str):
    return {"result": results.get(task_id, "Processing...")}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug")

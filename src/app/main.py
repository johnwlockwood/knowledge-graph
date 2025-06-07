from uuid import uuid4
import os
import json
import logging
import time
import collections.abc
from typing import Literal
from dotenv import load_dotenv, find_dotenv
from fastapi import FastAPI, BackgroundTasks
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError
from graph import agenerate_graph, stream_generate_graph, stream_generate_users

p = find_dotenv()
if p:
    load_dotenv(p)


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

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
async def generate_knowledge_graph(request: SubjectRequest):
    response = await agenerate_graph(request.subject)
    return response


async def generate_graph_stream_response(subject: str, model: str):
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


@app.post("/api/stream-generate-graph")
async def stream_generate_knowledge_graph(request: StreamingGraphRequest):
    """
    Stream knowledge graph entities based on the subject using
    the specified model.
    This endpoint streams the graph entities as they are generated.
    """
    return StreamingResponse(
        generate_graph_stream_response(request.subject, request.model),
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
async def stream_users(request: UsersRequest, model_request: ModelRequest):
    return StreamingResponse(
        generate_users_stream_response(
            request.domain, request.number_of_users, model_request.model
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )


@app.post("/api/start-generate-graph")
async def start_generate_graph(
    request: SubjectRequest, background_tasks: BackgroundTasks
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

from uuid import uuid4
import os
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from graph import agenerate_graph

load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

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


class SubjectRequest(BaseModel):
    subject: str


async def process_openai(request: SubjectRequest, task_id: str):
    response = await agenerate_graph(request.subject)
    results[task_id] = response


@app.post("/api/generate-graph")
async def generate_knowledge_graph(request: SubjectRequest):
    response = await agenerate_graph(request.subject)
    return response


@app.post("/api/start-generate-graph")
async def start_generate_graph(
    request: SubjectRequest, background_tasks: BackgroundTasks
):
    task_id = str(uuid4())
    background_tasks.add_task(process_openai, request.subject, task_id)
    return {"task_id": task_id}


@app.get("/api/graph/{task_id}")
async def get_result(task_id: str):
    return {"result": results.get(task_id, "Processing...")}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=9000)

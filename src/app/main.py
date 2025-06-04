import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from graph import generate_graph

load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))

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


@app.post("/api/generate-graph")
async def generate_knowledge_graph(request: SubjectRequest):
    graph = generate_graph(request.subject)
    return graph


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)

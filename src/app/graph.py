import instructor
import time
import uuid
from pydantic import BaseModel, Field
from openai import OpenAI

client = instructor.from_openai(OpenAI())


class Node(BaseModel):
    id: int
    label: str
    color: str


class Edge(BaseModel):
    source: int
    target: int
    label: str
    color: str = "black"


class KnowledgeGraph(BaseModel):
    nodes: list[Node] = Field(default_factory=list)
    edges: list[Edge] = Field(default_factory=list)


# GRAPH_MODEL = "gpt-3.5-turbo-16k"
GRAPH_MODEL = "o4-mini-2025-04-16"


def generate_graph(input: str) -> dict:
    graph = client.chat.completions.create(
        model=GRAPH_MODEL,
        messages=[
            {
                "role": "user",
                "content": (f"Help me understand following by describing "
                            f"as a detailed knowledge graph: {input}"),
            }
        ],
        response_model=KnowledgeGraph,
    )
    # "o4-mini-2025-04-16",
    return {
        "graph": graph,
        "model": GRAPH_MODEL,
        "id": str(uuid.uuid4()),
        "createdAt": int(time.time() * 1000),
        "subject": input
    }

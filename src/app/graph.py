import asyncio
import logging
import instructor
import time
import uuid
from collections.abc import AsyncGenerator
from pydantic import BaseModel, Field
from openai import AsyncOpenAI
from dotenv import load_dotenv, find_dotenv


p = find_dotenv()
if p:
    load_dotenv(p)
logger = logging.getLogger(__name__)  # __name__ = "app.graph"
logger.setLevel(logging.DEBUG)
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.DEBUG)
formatter = logging.Formatter(
    "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)
logger.debug("----Debug message from graph-----")

client = instructor.from_openai(AsyncOpenAI())


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


# Streamable Knowledge Graph entities
class KnowledgeGraphEntity(BaseModel):
    type: str = Field(
        description="Type of the entity, either 'node' or 'edge'."
    )
    entity: Edge | Node = Field(
        description="The entity itself, which can be either a node or an edge."
    )


class User(BaseModel):
    name: str
    age: int


MODELS = [
    "gpt-4o-mini-2024-07-18",
    "gpt-4.1-mini-2025-04-14",
    "gpt-3.5-turbo-0125",
    "gpt-3.5-turbo-16k-0613",
    "o4-mini-2025-04-16",
    "gpt-4.1-2025-04-14",
    "gpt-4o-2024-08-06",
]
# GRAPH_MODEL = "gpt-3.5-turbo-16k"
GRAPH_MODEL = "o4-mini-2025-04-16"
GRAPH_MODEL = "gpt-4.1-mini-2025-04-14"
GRAPH_MODEL = "gpt-4o-mini-2024-07-18"
GRAPH_MODEL = MODELS[0]


async def agenerate_graph(input: str) -> dict:
    graph = await client.chat.completions.create(
        model=GRAPH_MODEL,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Help me understand following by describing "
                    f"as a detailed knowledge graph: {input}"
                ),
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
        "subject": input,
    }


async def stream_generate_graph(
    input: str, model: str
) -> AsyncGenerator[KnowledgeGraphEntity | None, None]:
    """Stream a knowledge graph based on the input text
    using the specified model."""
    logger.debug("Generating graph for subject")
    graph_model = model if model in MODELS else MODELS[0]
    logger.info(f"model requested: {model}, model used: {graph_model}")
    graph_entities = client.chat.completions.create_iterable(
        model=graph_model,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Help me understand following by describing "
                    f"as a detailed knowledge graph: {input}"
                ),
            }
        ],
        response_model=KnowledgeGraphEntity,
    )
    # "o4-mini-2025-04-16",
    logger.debug("Debug message from graph")
    async for entity in graph_entities:
        yield entity


async def stream_generate_users(
    input: str, number_of_users: int, model: str
) -> AsyncGenerator[User | None, None]:
    """Stream a knowledge graph based on the input text
    using the specified model."""
    graph_model = model if model in MODELS else MODELS[0]
    logger.info(f"users requested from input: {input}")
    logger.info(f"model requested: {model}, model used: {graph_model}")
    graph_entities = client.chat.completions.create_iterable(
        model=graph_model,
        messages=[
            {
                "role": "user",
                "content": f"Create {number_of_users} users from {input}",
            },
        ],
        response_model=User,
    )
    async for entity in graph_entities:
        yield entity


async def main():
    """Main function to test the stream_generate_graph function."""
    input_text = "Quantum Physics"
    user_input_text = "Star Wars"
    model = "gpt-4o-mini-2024-07-18"

    print(f"Generating knowledge graph for: {input_text}")
    print(f"Using model: {model}")
    print("-" * 50)

    async for entity in stream_generate_users(user_input_text, 3, model):
        if entity is None:
            continue
        print(f"Entity name: {entity.name}")
        print(f"Entity age: {entity.age}")
        print("-" * 30)

    print(f"Generating knowledge graph for: {input_text}")
    print(f"Using model: {model}")
    print("-" * 50)
    async for entity in stream_generate_graph(input_text, model):
        if entity is None:
            continue
        if entity.type == "node":
            node = Node(**entity.entity.model_dump())
            print(
                f"Node ID: {node.id}, Label: {node.label}, Color: {node.color}"
            )
        elif entity.type == "edge":
            edge = Edge(**entity.entity.model_dump())
            print(
                f"Edge from {edge.source} to {edge.target}, "
                f"Label: {edge.label}, Color: {edge.color}"
            )
        print("-" * 30)


if __name__ == "__main__":
    asyncio.run(main())

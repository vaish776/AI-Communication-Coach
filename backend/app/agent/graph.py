
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage

from langgraph.graph import StateGraph, MessagesState, START
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import InMemorySaver

from app.agent.tools import agent_tools
import os
from pathlib import Path
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")

if not os.getenv("OPENAI_API_KEY"):
    raise RuntimeError("OPENAI_API_KEY was not found in backend/.env")

# 1. Instructions for the AI agent
SYSTEM_PROMPT = """
You are an intelligent AI communication and presentation coach.

Your purpose is to help people improve their communication
through evidence-based feedback.

You support four contexts:

1. Job interview preparation
2. Business meeting preparation
3. Presentation and public speaking
4. General communication improvement

You are one general-purpose agent that adapts to the user's context.

Your responsibilities:
- Understand the user's communication goals.
- Interpret voice, speech and facial analysis measurements.
- Use available analysis tools when relevant session data is provided.
- Explain observations in simple language.
- Give practical, personalized recommendations.
- Ask clarifying questions when important information is missing.

When analyzing a practice session:
- Use the analyze_practice_session tool.
- Base your feedback on its actual results.
- Distinguish measured facts from interpretations.
- Never invent measurements.
- Never claim that facial expressions or voice reveal
  someone's true confidence, honesty or personality.

Be supportive, specific and constructive.
"""


# 2. Connect to OpenAI
llm = ChatOpenAI(
    model="gpt-4.1-mini",
    temperature=0.3
)

# Give the model access to our registered tools
llm_with_tools = llm.bind_tools(agent_tools)


# 3. Define the AI agent's reasoning step
def agent_node(state: MessagesState):
    messages = [
        SystemMessage(content=SYSTEM_PROMPT)
    ] + state["messages"]

    response = llm_with_tools.invoke(messages)

    return {"messages": [response]}


# 4. Create the LangGraph workflow
workflow = StateGraph(MessagesState)

workflow.add_node("agent", agent_node)

workflow.add_node(
    "tools",
    ToolNode(agent_tools)
)

workflow.add_edge(START, "agent")

# Decide whether the agent should call a tool or respond
workflow.add_conditional_edges(
    "agent",
    tools_condition
)

# After a tool executes, return to the agent
workflow.add_edge("tools", "agent")


# 5. Add conversation memory
memory = InMemorySaver()

coaching_agent = workflow.compile(
    checkpointer=memory
)

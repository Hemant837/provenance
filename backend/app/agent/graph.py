"""Assemble the research graph: plan -> search -> synthesize -> finalize.

HITL interrupt and the reject loop are added in a later build step.
"""

from langgraph.graph import END, START, StateGraph

from app.agent.nodes import (
    finalize_node,
    plan_node,
    search_node,
    synthesize_node,
)
from app.agent.state import ResearchState


def build_graph():
    graph = StateGraph(ResearchState)

    graph.add_node("plan", plan_node)
    graph.add_node("search", search_node)
    graph.add_node("synthesize", synthesize_node)
    graph.add_node("finalize", finalize_node)

    graph.add_edge(START, "plan")
    graph.add_edge("plan", "search")
    graph.add_edge("search", "synthesize")
    graph.add_edge("synthesize", "finalize")
    graph.add_edge("finalize", END)

    return graph.compile()


# Module-level compiled graph for reuse.
research_graph = build_graph()

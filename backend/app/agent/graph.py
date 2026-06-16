"""Assemble the research graph.

Flow:
    plan -> search -> synthesize -> hitl(interrupt)
        approve / edit -> finalize -> END
        reject          -> plan (re-search with the reviewer's feedback)

The HITL interrupt requires a checkpointer so the run can pause and resume
across separate requests.
"""

from langgraph.graph import END, START, StateGraph

from app.agent.nodes import (
    finalize_node,
    hitl_node,
    plan_node,
    search_node,
    synthesize_node,
)
from app.agent.state import ResearchState


def _route_after_hitl(state: ResearchState) -> str:
    """Reject loops back to planning; everything else finalizes."""
    return "plan" if state.get("decision") == "reject" else "finalize"


def build_graph(checkpointer=None):
    graph = StateGraph(ResearchState)

    graph.add_node("plan", plan_node)
    graph.add_node("search", search_node)
    graph.add_node("synthesize", synthesize_node)
    graph.add_node("hitl", hitl_node)
    graph.add_node("finalize", finalize_node)

    graph.add_edge(START, "plan")
    graph.add_edge("plan", "search")
    graph.add_edge("search", "synthesize")
    graph.add_edge("synthesize", "hitl")
    graph.add_conditional_edges(
        "hitl",
        _route_after_hitl,
        {"plan": "plan", "finalize": "finalize"},
    )
    graph.add_edge("finalize", END)

    return graph.compile(checkpointer=checkpointer)

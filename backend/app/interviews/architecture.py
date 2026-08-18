"""Architecture canvas helpers for system design interviews."""

from __future__ import annotations

from typing import Any

COMPONENT_TYPES: dict[str, str] = {
    "client": "Client",
    "cdn": "CDN",
    "load_balancer": "Load Balancer",
    "api": "API Gateway",
    "service": "Service",
    "cache": "Cache",
    "database": "Database",
    "queue": "Queue",
    "worker": "Worker",
    "search": "Search",
    "storage": "Object Storage",
    "websocket": "WebSocket",
}

_KNOWN = set(COMPONENT_TYPES)


def empty_architecture() -> dict[str, list]:
    return {"nodes": [], "edges": []}


def normalize_architecture(raw: dict | None) -> dict[str, list]:
    data = raw if isinstance(raw, dict) else {}
    nodes: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in data.get("nodes") or []:
        if not isinstance(item, dict):
            continue
        node_id = str(item.get("id") or "").strip()
        node_type = str(item.get("type") or "").strip()
        if not node_id or node_id in seen or node_type not in _KNOWN:
            continue
        try:
            x = float(item.get("x") or 0)
            y = float(item.get("y") or 0)
        except (TypeError, ValueError):
            x, y = 0.0, 0.0
        label = str(item.get("label") or COMPONENT_TYPES[node_type]).strip() or COMPONENT_TYPES[node_type]
        nodes.append(
            {
                "id": node_id[:40],
                "type": node_type,
                "label": label[:48],
                "x": max(0.0, min(2400.0, x)),
                "y": max(0.0, min(1600.0, y)),
            }
        )
        seen.add(node_id)

    ids = {node["id"] for node in nodes}
    edges: list[dict[str, str]] = []
    edge_seen: set[tuple[str, str]] = set()
    for item in data.get("edges") or []:
        if not isinstance(item, dict):
            continue
        source = str(item.get("from") or "").strip()
        target = str(item.get("to") or "").strip()
        if source not in ids or target not in ids or source == target:
            continue
        pair = (source, target)
        if pair in edge_seen:
            continue
        edge_id = str(item.get("id") or f"e-{source}-{target}")[:48]
        edges.append({"id": edge_id, "from": source, "to": target})
        edge_seen.add(pair)
    return {"nodes": nodes, "edges": edges}


def node_types(architecture: dict | None) -> set[str]:
    graph = normalize_architecture(architecture)
    return {str(node["type"]) for node in graph["nodes"]}


def summarize_architecture(architecture: dict | None) -> str:
    graph = normalize_architecture(architecture)
    if not graph["nodes"]:
        return "The canvas is empty. The candidate has not placed any components yet."
    labels = [f"{node['label']} ({node['type']})" for node in graph["nodes"]]
    id_to_label = {node["id"]: node["label"] for node in graph["nodes"]}
    connections = [
        f"{id_to_label.get(edge['from'], edge['from'])} → {id_to_label.get(edge['to'], edge['to'])}"
        for edge in graph["edges"]
    ]
    missing = typical_gaps(graph)
    parts = [
        f"Components ({len(graph['nodes'])}): " + ", ".join(labels) + ".",
        ("Connections: " + "; ".join(connections) + ".") if connections else "No connections drawn yet.",
    ]
    if missing:
        parts.append("Typical pieces still missing: " + ", ".join(missing) + ".")
    return " ".join(parts)


def typical_gaps(architecture: dict | None) -> list[str]:
    types = node_types(architecture)
    gaps: list[str] = []
    if "load_balancer" not in types and "api" not in types:
        gaps.append("edge / load balancer")
    if "cache" not in types:
        gaps.append("cache")
    if "queue" not in types and "worker" not in types:
        gaps.append("async queue / worker")
    if "database" not in types and "storage" not in types:
        gaps.append("durable store")
    return gaps


def has_core_shape(architecture: dict | None) -> bool:
    graph = normalize_architecture(architecture)
    types = {node["type"] for node in graph["nodes"]}
    has_compute = bool(types & {"api", "service", "worker"})
    has_store = bool(types & {"database", "cache", "storage", "queue", "search"})
    return len(graph["nodes"]) >= 3 and has_compute and has_store


def architecture_quality(architecture: dict | None) -> float:
    graph = normalize_architecture(architecture)
    types = {node["type"] for node in graph["nodes"]}
    score = 2.0
    if len(graph["nodes"]) >= 3:
        score += 2
    if len(graph["nodes"]) >= 5:
        score += 1
    if graph["edges"]:
        score += 1
    if "cache" in types:
        score += 1
    if "load_balancer" in types or "cdn" in types:
        score += 1
    if "queue" in types or "worker" in types:
        score += 1
    if "database" in types or "storage" in types:
        score += 1
    return min(10.0, score)

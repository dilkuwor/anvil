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

# The simulator's richer parts. Each maps to the family above, so the interviewer's questions,
# gap detection and scoring keep working when the candidate draws with the simulator canvas.
SIMULATOR_TYPES: dict[str, tuple[str, str]] = {
    "client": ("client", "Client"),
    "dns": ("load_balancer", "DNS"),
    "load_balancer": ("load_balancer", "Load Balancer"),
    "cdn": ("cdn", "CDN"),
    "api_gateway": ("api", "API Gateway"),
    "rate_limiter": ("api", "Rate Limiter"),
    "api_server": ("service", "API Server"),
    "redis": ("cache", "Redis"),
    "postgresql": ("database", "PostgreSQL"),
    "mysql": ("database", "MySQL"),
    "nosql": ("database", "NoSQL Store"),
    "analytics_store": ("database", "Analytics Store"),
    "geo_index": ("search", "Geo Index"),
    "search_index": ("search", "Search Index"),
    "kafka": ("queue", "Kafka"),
    "task_queue": ("queue", "Task Queue"),
    "worker": ("worker", "Worker"),
    "scheduler": ("worker", "Scheduler"),
    "object_storage": ("storage", "Object Storage"),
    "websocket_gateway": ("websocket", "WebSocket Gateway"),
    "id_generator": ("service", "ID Generator"),
    "notification_gateway": ("service", "Notification Gateway"),
}

_KNOWN = set(COMPONENT_TYPES) | set(SIMULATOR_TYPES)
_MAX_CONFIG_KEYS = 24


def family_of(node_type: str) -> str:
    """The plain family (cache, database, queue, ...) of any accepted node type."""
    if node_type in SIMULATOR_TYPES:
        return SIMULATOR_TYPES[node_type][0]
    return node_type


def type_label(node_type: str) -> str:
    if node_type in SIMULATOR_TYPES:
        return SIMULATOR_TYPES[node_type][1]
    return COMPONENT_TYPES.get(node_type, node_type)


def _clean_config(raw: object) -> dict[str, Any]:
    if not isinstance(raw, dict):
        return {}
    config: dict[str, Any] = {}
    for key, value in list(raw.items())[:_MAX_CONFIG_KEYS]:
        name = str(key)[:40]
        if isinstance(value, bool) or isinstance(value, (int, float)):
            config[name] = value
        elif isinstance(value, str):
            config[name] = value[:80]
    return config


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
        label = str(item.get("label") or type_label(node_type)).strip() or type_label(node_type)
        node: dict[str, Any] = {
            "id": node_id[:40],
            "type": node_type,
            "label": label[:48],
            "x": max(-400.0, min(4000.0, x)),
            "y": max(-400.0, min(3000.0, y)),
        }
        config = _clean_config(item.get("config"))
        if config:
            node["config"] = config
        if item.get("disabled") is True:
            node["disabled"] = True
        nodes.append(node)
        seen.add(node_id)

    ids = {node["id"] for node in nodes}
    edges: list[dict[str, str]] = []
    edge_seen: set[tuple[str, str]] = set()
    for item in data.get("edges") or []:
        if not isinstance(item, dict):
            continue
        source = str(item.get("from") or item.get("source") or "").strip()
        target = str(item.get("to") or item.get("target") or "").strip()
        if source not in ids or target not in ids or source == target:
            continue
        pair = (source, target)
        if pair in edge_seen:
            continue
        edge_id = str(item.get("id") or f"e-{source}-{target}")[:48]
        edge: dict[str, Any] = {"id": edge_id, "from": source, "to": target}
        label = str(item.get("label") or "").strip()
        if label:
            edge["label"] = label[:48]
        weight = item.get("weight")
        if isinstance(weight, (int, float)) and not isinstance(weight, bool) and 0 < weight <= 1:
            edge["weight"] = float(weight)
        edges.append(edge)
        edge_seen.add(pair)
    return {"nodes": nodes, "edges": edges}


def node_types(architecture: dict | None) -> set[str]:
    """The families present on the canvas, whichever palette drew them."""
    graph = normalize_architecture(architecture)
    return {family_of(str(node["type"])) for node in graph["nodes"] if not node.get("disabled")}


def summarize_architecture(architecture: dict | None) -> str:
    graph = normalize_architecture(architecture)
    if not graph["nodes"]:
        return "The canvas is empty. The candidate has not placed any components yet."
    labels = [_describe_node(node) for node in graph["nodes"]]
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


def _describe_node(node: dict[str, Any]) -> str:
    kind = type_label(str(node["type"]))
    text = f"{node['label']} ({kind})" if node["label"].lower() != kind.lower() else node["label"]
    config = node.get("config") or {}
    hints = [f"{key} {value}" for key, value in list(config.items())[:3] if isinstance(value, (int, float)) and not isinstance(value, bool)]
    if hints:
        text += " [" + ", ".join(hints) + "]"
    if node.get("disabled"):
        text += " [disabled]"
    return text


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
    types = node_types(graph)
    has_compute = bool(types & {"api", "service", "worker"})
    has_store = bool(types & {"database", "cache", "storage", "queue", "search"})
    return len(graph["nodes"]) >= 3 and has_compute and has_store


def architecture_quality(architecture: dict | None) -> float:
    graph = normalize_architecture(architecture)
    types = node_types(graph)
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

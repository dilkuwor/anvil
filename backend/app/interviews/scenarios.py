"""Catalog of system design mock-interview scenarios."""

from __future__ import annotations

from typing import Any

from app.common.errors import NotFoundError

_SCENARIOS: list[dict[str, Any]] = [
    {
        "slug": "url-shortener",
        "title": "Design a URL Shortener",
        "difficulty": "MEDIUM",
        "summary": "Shorten long URLs and redirect at high read volume.",
        "prompt": (
            "Design a service like bit.ly. Users submit a long URL and receive a short link. "
            "Opening the short link should redirect to the original URL quickly and reliably."
        ),
        "functional_requirements": [
            "Create a short URL from a long URL.",
            "Redirect a short URL to the original destination.",
            "Optional custom aliases and link expiration.",
            "Basic click analytics (count, not a full warehouse).",
        ],
        "non_functional_requirements": [
            "Redirects should be low-latency, even at a high read/write ratio.",
            "Short codes must be unique and hard to guess.",
            "The service should stay available if one region or store is unhealthy.",
        ],
        "constraints": [
            "100 million new URLs per month.",
            "Read:write ratio around 10:1.",
            "Retain links for at least five years.",
            "Short codes should stay short (around 7 characters).",
        ],
        "assumptions": [
            "Links are mostly public; no per-click auth on the redirect path.",
            "Analytics can be slightly delayed.",
            "Custom aliases are a small fraction of traffic.",
        ],
        "interviewer_notes": (
            "Probe encoding vs hash collisions, cache on the redirect path, "
            "and what happens when a popular link is a hot key."
        ),
    },
    {
        "slug": "twitter-feed",
        "title": "Design Twitter",
        "difficulty": "HARD",
        "summary": "Post tweets and serve a home timeline at large scale.",
        "prompt": (
            "Design a Twitter-like service. Users post short messages and follow other users. "
            "The home timeline should show recent posts from people they follow."
        ),
        "functional_requirements": [
            "Post a tweet.",
            "Follow and unfollow users.",
            "Home timeline of followed users.",
            "User profile timeline.",
        ],
        "non_functional_requirements": [
            "Home timeline reads must feel instant.",
            "Posts should appear for followers within a few seconds.",
            "The system should survive celebrity / fan-out spikes.",
        ],
        "constraints": [
            "300 million monthly active users.",
            "Home timeline is read far more than tweets are written.",
            "Tweets are small; media is stored separately.",
            "Celebrity accounts can have tens of millions of followers.",
        ],
        "assumptions": [
            "Fan-out-on-write is acceptable for most users.",
            "Search and trending can be a later deep-dive, not the first design.",
            "Timeline ranking can start chronological.",
        ],
        "interviewer_notes": (
            "Push on fan-out-on-write vs fan-out-on-read, celebrity handling, "
            "and cache invalidation for the home timeline."
        ),
    },
    {
        "slug": "chat-system",
        "title": "Design a Chat System",
        "difficulty": "HARD",
        "summary": "One-to-one and group messaging with online presence.",
        "prompt": (
            "Design a WhatsApp-style chat system. Users send one-to-one and small group messages "
            "and should see delivery status and online presence."
        ),
        "functional_requirements": [
            "One-to-one text messages.",
            "Group chats of up to a few hundred members.",
            "Message delivery and read status.",
            "Online / last-seen presence.",
        ],
        "non_functional_requirements": [
            "Messages should feel realtime.",
            "No message loss if a client disconnects briefly.",
            "Presence updates should not dominate the write path.",
        ],
        "constraints": [
            "Billions of messages per day.",
            "Most conversations are one-to-one.",
            "Media attachments are supported but stored out of band.",
            "Clients reconnect often (mobile networks).",
        ],
        "assumptions": [
            "End-to-end encryption can be discussed later if time allows.",
            "Message history is persisted and searchable later.",
            "Groups stay modest; broadcast channels are out of scope.",
        ],
        "interviewer_notes": (
            "Probe websocket gateways, inbox vs conversation store, "
            "and how unread / delivery state is kept consistent."
        ),
    },
    {
        "slug": "video-streaming",
        "title": "Design YouTube",
        "difficulty": "HARD",
        "summary": "Upload, process, and stream video worldwide.",
        "prompt": (
            "Design a YouTube-like video platform. Creators upload videos; viewers stream them "
            "with low startup time and adaptive quality."
        ),
        "functional_requirements": [
            "Upload a video.",
            "Transcode into multiple bitrates.",
            "Stream playback with adaptive bitrate.",
            "Basic metadata: title, view count, comments.",
        ],
        "non_functional_requirements": [
            "Playback should start quickly near the viewer.",
            "Uploads should not block the watch path.",
            "A popular video should not melt origin storage.",
        ],
        "constraints": [
            "Hundreds of hours of video uploaded every minute.",
            "Watch traffic is extremely read-heavy and geographically spread.",
            "Videos are large; thumbnails and manifests are small.",
            "Processing a new upload can take minutes.",
        ],
        "assumptions": [
            "Recommendations can be a later deep-dive.",
            "Live streaming is optional, not required in the first design.",
            "Comments are eventually consistent.",
        ],
        "interviewer_notes": (
            "Look for object storage + CDN + async transcode workers. "
            "Challenge hot videos, cache hierarchy, and upload resumability."
        ),
    },
    {
        "slug": "ride-sharing",
        "title": "Design Uber",
        "difficulty": "HARD",
        "summary": "Match riders and nearby drivers in realtime.",
        "prompt": (
            "Design a ride-sharing service like Uber. Riders request a trip; nearby drivers "
            "are matched, and both sides see location updates until the ride ends."
        ),
        "functional_requirements": [
            "Request a ride with pickup and dropoff.",
            "Match a nearby available driver.",
            "Share live location during the trip.",
            "Trip history and basic pricing.",
        ],
        "non_functional_requirements": [
            "Matching should complete in a few seconds.",
            "Location updates must stay fresh without flooding the backend.",
            "The dispatch path should degrade gracefully in a busy city.",
        ],
        "constraints": [
            "Millions of daily trips across many cities.",
            "Driver location pings arrive every few seconds.",
            "Matching is strongly local — city / hex scoped.",
            "Payments can be treated as an external service.",
        ],
        "assumptions": [
            "One rider and one driver per trip for the first design.",
            "Maps / ETA come from an external provider.",
            "Surge pricing can be sketched, not fully specified.",
        ],
        "interviewer_notes": (
            "Push on geospatial indexes, location stream volume, "
            "and what happens when the closest driver rejects."
        ),
    },
    {
        "slug": "rate-limiter",
        "title": "Design a Rate Limiter",
        "difficulty": "MEDIUM",
        "summary": "Protect APIs with per-client request limits.",
        "prompt": (
            "Design a rate limiter that sits in front of a public API. Different clients "
            "have different quotas. Excess traffic should be rejected quickly and fairly."
        ),
        "functional_requirements": [
            "Limit requests per client (API key or user).",
            "Support at least one algorithm (token bucket or sliding window).",
            "Return a clear reject when the quota is exceeded.",
            "Allow different limits per endpoint or plan.",
        ],
        "non_functional_requirements": [
            "The limiter must add very little latency.",
            "Counters should stay correct across several API instances.",
            "A limiter outage should not take the whole API down.",
        ],
        "constraints": [
            "Tens of thousands of requests per second.",
            "Limits are typically per second and per minute.",
            "Clients are identified by API key.",
            "Rules can change without redeploying every service.",
        ],
        "assumptions": [
            "Slight approximation is acceptable if it is explained.",
            "Auth happens before the limiter.",
            "Distributed counters may be eventually consistent if trade-offs are named.",
        ],
        "interviewer_notes": (
            "Compare token bucket vs sliding window, Redis vs local + sync, "
            "and fail-open vs fail-closed."
        ),
    },
    {
        "slug": "news-feed",
        "title": "Design a News Feed",
        "difficulty": "HARD",
        "summary": "Publish posts and render a personalized feed.",
        "prompt": (
            "Design a Facebook-style news feed. Users create posts and see a ranked feed "
            "of content from friends and pages they follow."
        ),
        "functional_requirements": [
            "Create a text or photo post.",
            "Friend / follow graph.",
            "Personalized home feed.",
            "Like and comment on a post.",
        ],
        "non_functional_requirements": [
            "Feed load should be fast on mobile.",
            "New posts from close friends should appear quickly.",
            "Ranking can be simple at first, then discussed.",
        ],
        "constraints": [
            "Hundreds of millions of daily readers.",
            "Feed reads dwarf writes.",
            "Some users have very large friend graphs.",
            "Media lives in object storage, not the feed store.",
        ],
        "assumptions": [
            "Start with friend posts; ads are out of scope.",
            "Ranking features can be precomputed asynchronously.",
            "Comments on a post can be fetched lazily.",
        ],
        "interviewer_notes": (
            "Contrast precomputed vs on-the-fly feeds, fan-out, "
            "and how ranking features are stored next to the feed."
        ),
    },
    {
        "slug": "web-crawler",
        "title": "Design a Web Crawler",
        "difficulty": "MEDIUM",
        "summary": "Discover, fetch, and store pages across the web.",
        "prompt": (
            "Design a distributed web crawler. It should discover URLs, fetch pages politely, "
            "and store content for a later search index."
        ),
        "functional_requirements": [
            "Start from a seed set of URLs.",
            "Extract and enqueue new links.",
            "Fetch page content and store it.",
            "Respect robots.txt and per-host politeness.",
        ],
        "non_functional_requirements": [
            "The crawler should scale horizontally.",
            "The same URL should not be fetched in a tight loop.",
            "A slow or hostile host must not stall the whole crawl.",
        ],
        "constraints": [
            "Billions of URLs over time.",
            "Hosts vary wildly in speed and reliability.",
            "Storage is large; recrawl freshness varies by site.",
            "DNS and robots lookups should be cached.",
        ],
        "assumptions": [
            "Indexing / ranking is a separate system.",
            "JavaScript rendering can be a later deep-dive.",
            "Seeds are provided; discovery is then graph-based.",
        ],
        "interviewer_notes": (
            "Look for a URL frontier, per-host queues, dedup (URL and content), "
            "and how politeness is enforced across workers."
        ),
    },
]


def list_scenarios() -> list[dict[str, Any]]:
    return [public_scenario(item) for item in _SCENARIOS]


def get_scenario(slug: str) -> dict[str, Any]:
    for item in _SCENARIOS:
        if item["slug"] == slug:
            return dict(item)
    raise NotFoundError("Scenario not found.")


def public_scenario(scenario: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in scenario.items() if key != "interviewer_notes"}


def scenario_context(scenario: dict[str, Any]) -> str:
    public = public_scenario(scenario)

    def block(title: str, items: list[str]) -> str:
        return title + "\n" + "\n".join(f"- {item}" for item in items)

    return (
        f"Title: {public['title']}\n"
        f"Difficulty: {public['difficulty']}\n"
        f"Prompt:\n{public['prompt']}\n"
        f"{block('Functional requirements', public['functional_requirements'])}\n"
        f"{block('Non-functional requirements', public['non_functional_requirements'])}\n"
        f"{block('Constraints', public['constraints'])}\n"
        f"{block('Assumptions', public['assumptions'])}"
    )

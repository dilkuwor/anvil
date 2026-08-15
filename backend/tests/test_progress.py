from datetime import date, timedelta

from app.progress.service import compute_streaks


def test_streak_current_and_longest():
    today = date(2026, 4, 8)
    days = [
        today - timedelta(days=4),
        today - timedelta(days=3),
        today - timedelta(days=2),
        today - timedelta(days=1),
        today,
    ]
    current, longest = compute_streaks(days, today=today)
    assert current == 5
    assert longest == 5


def test_streak_broken_today():
    today = date(2026, 4, 8)
    days = [today - timedelta(days=5), today - timedelta(days=4)]
    current, longest = compute_streaks(days, today=today)
    assert current == 0
    assert longest == 2


def test_streak_allows_yesterday_if_today_empty():
    today = date(2026, 4, 8)
    days = [today - timedelta(days=2), today - timedelta(days=1)]
    current, longest = compute_streaks(days, today=today)
    assert current == 2
    assert longest == 2


def test_empty_progress_includes_catalog_totals(auth_client):
    payload = auth_client.get("/api/v1/progress").json()
    assert payload["total_solved"] == 0
    assert payload["problems_attempting"] == 0
    assert payload["today_solved"] == 0
    assert payload["recent_events"] == []
    assert payload["total_problems"] == 0

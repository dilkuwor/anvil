from app.cheatsheets.seed import seed_cheatsheets
from app.cheatsheets.models import CheatSheet, CheatSheetSection, CheatSheetSectionContent
from sqlalchemy import func, select


def test_cheatsheets_require_auth(client):
    assert client.get("/api/v1/cheatsheets").status_code == 401


def test_cheatsheet_catalog_and_detail(auth_client, db):
    seed_cheatsheets(db)
    db.commit()

    listing = auth_client.get("/api/v1/cheatsheets")
    assert listing.status_code == 200
    cards = listing.json()
    slugs = [item["slug"] for item in cards]
    assert slugs == ["dsa", "java", "system-design", "lld-ood", "behavioral", "cs-fundamentals"]
    system = next(item for item in cards if item["slug"] == "system-design")
    assert system["section_count"] == 16
    assert system["href"] == "/cheatsheets/system-design"
    assert "progress" not in system

    detail = auth_client.get("/api/v1/cheatsheets/system-design")
    assert detail.status_code == 200
    body = detail.json()
    titles = [section["title"] for section in body["sections"]]
    assert titles[0] == "45-Minute Interview Framework"
    assert "Capacity estimation" in titles
    first_kinds = {block["kind"] for block in body["sections"][0]["blocks"]}
    assert "steps" in first_kinds or "tip" in first_kinds
    assert any(block["kind"] == "formula" for section in body["sections"] for block in section["blocks"])

    dsa = auth_client.get("/api/v1/cheatsheets/dsa").json()
    assert any(section["slug"] == "two-pointers" for section in dsa["sections"])
    assert any(section["slug"] == "java-templates" for section in dsa["sections"])

    missing = auth_client.get("/api/v1/cheatsheets/does-not-exist")
    assert missing.status_code == 404


def test_cheatsheet_seed_is_idempotent(db):
    seed_cheatsheets(db)
    db.commit()
    first = (
        db.scalar(select(func.count()).select_from(CheatSheet)),
        db.scalar(select(func.count()).select_from(CheatSheetSection)),
        db.scalar(select(func.count()).select_from(CheatSheetSectionContent)),
    )
    seed_cheatsheets(db)
    db.commit()
    second = (
        db.scalar(select(func.count()).select_from(CheatSheet)),
        db.scalar(select(func.count()).select_from(CheatSheetSection)),
        db.scalar(select(func.count()).select_from(CheatSheetSectionContent)),
    )
    assert first == second
    assert first[0] == 6
    assert first[1] >= 70

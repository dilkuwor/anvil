from app.cheatsheets.seed import seed_cheatsheets
from app.cheatsheets.models import CheatSheet, CheatSheetSection, CheatSheetSectionContent
from sqlalchemy import func, select

SHEET_SLUGS = [
    "dsa",
    "java",
    "system-design",
    "lld-ood",
    "behavioral",
    "cs-fundamentals",
    "ai-ml",
]


def test_cheatsheets_are_public(client, db):
    seed_cheatsheets(db)
    db.commit()
    listing = client.get("/api/v1/cheatsheets")
    assert listing.status_code == 200
    assert {item["slug"] for item in listing.json()} == set(SHEET_SLUGS)


def test_cheatsheet_catalog_and_detail(auth_client, db):
    seed_cheatsheets(db)
    db.commit()

    listing = auth_client.get("/api/v1/cheatsheets")
    assert listing.status_code == 200
    cards = listing.json()
    assert [item["slug"] for item in cards] == SHEET_SLUGS
    system = next(item for item in cards if item["slug"] == "system-design")
    assert system["section_count"] == 12
    assert system["href"] == "/cheatsheets/system-design"
    assert "progress" not in system

    detail = auth_client.get("/api/v1/cheatsheets/system-design")
    assert detail.status_code == 200
    body = detail.json()
    titles = [section["title"] for section in body["sections"]]
    assert titles[0] == "The 45-Minute Framework"
    assert "Numbers to Memorise" in titles
    first_kinds = {block["kind"] for block in body["sections"][0]["blocks"]}
    assert "steps" in first_kinds

    dsa = auth_client.get("/api/v1/cheatsheets/dsa").json()
    dsa_sections = {section["slug"] for section in dsa["sections"]}
    assert "pattern-picker" in dsa_sections
    assert "complexity-targets" in dsa_sections

    missing = auth_client.get("/api/v1/cheatsheets/does-not-exist")
    assert missing.status_code == 404


def test_cheatsheets_are_reference_material_not_prose(auth_client, db):
    """A cheat sheet is for recall: tables, templates and checklists, not paragraphs."""
    seed_cheatsheets(db)
    db.commit()

    kinds: dict[str, int] = {}
    for slug in SHEET_SLUGS:
        sheet = auth_client.get(f"/api/v1/cheatsheets/{slug}").json()
        assert sheet["sections"], slug
        for section in sheet["sections"]:
            assert section["blocks"], f"{slug}/{section['slug']}"
            for block in section["blocks"]:
                kinds[block["kind"]] = kinds.get(block["kind"], 0) + 1

    # Tables are the workhorse of a reference sheet.
    assert kinds.get("table", 0) >= 50
    assert kinds.get("formula", 0) >= 20
    assert kinds.get("bullets", 0) + kinds.get("steps", 0) >= 30
    # Prose cards were the old shape and should no longer dominate.
    assert kinds.get("definition", 0) + kinds.get("rule", 0) == 0


def test_cheatsheet_tables_and_markers_are_well_formed(auth_client, db):
    """Ragged rows and unbalanced inline markers both render wrong."""
    seed_cheatsheets(db)
    db.commit()

    for slug in SHEET_SLUGS:
        sheet = auth_client.get(f"/api/v1/cheatsheets/{slug}").json()
        for section in sheet["sections"]:
            for block in section["blocks"]:
                where = f"{slug}/{section['slug']}"
                items = block["items"]
                texts = [block["body"]]
                if block["kind"] == "table":
                    assert isinstance(items, dict), where
                    width = len(items["headers"])
                    assert width >= 2, where
                    for row in items["rows"]:
                        assert len(row) == width, f"{where}: ragged row {row[:2]}"
                    texts += items["headers"] + [cell for row in items["rows"] for cell in row]
                elif block["kind"] in {"bullets", "steps"}:
                    assert isinstance(items, list) and items, where
                    texts += items
                else:
                    assert block["body"].strip(), where

                for text in texts:
                    assert text.count("`") % 2 == 0, f"{where}: unbalanced backtick in {text[:50]}"
                    assert text.count("**") % 2 == 0, f"{where}: unbalanced bold in {text[:50]}"

                # Block titles render as plain small-caps labels, so markers would
                # show up as literal characters.
                title = block["title"]
                assert "`" not in title, f"{where}: backtick in block title {title!r}"
                assert "**" not in title, f"{where}: bold marker in block title {title!r}"


def test_ai_cheatsheet_covers_the_learn_category(auth_client, db):
    seed_cheatsheets(db)
    db.commit()
    sheet = auth_client.get("/api/v1/cheatsheets/ai-ml").json()
    slugs = {section["slug"] for section in sheet["sections"]}
    for expected in ("metrics", "transformers", "tokens-cost", "rag", "agents", "llm-eval", "ai-security"):
        assert expected in slugs, expected


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
    assert first[0] == 7
    assert first[1] >= 70

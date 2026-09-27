from unittest.mock import MagicMock, patch

from app.tts.service import synthesize


def test_synthesize_posts_to_configured_tts(monkeypatch):
    monkeypatch.setenv("TTS_BASE_URL", "http://100.120.169.81:8091")
    from app.common.config import get_settings

    get_settings.cache_clear()
    response = MagicMock()
    response.status_code = 200
    response.content = b"RIFF....WAVE"
    response.headers = {"content-type": "audio/wav"}
    with patch("app.tts.service.httpx.Client") as client_cls:
        client_cls.return_value.__enter__.return_value.post.return_value = response
        audio, content_type = synthesize("  Hello   world  ")
    assert audio.startswith(b"RIFF")
    assert content_type == "audio/wav"
    posted = client_cls.return_value.__enter__.return_value.post.call_args
    assert posted.args[0] == "http://100.120.169.81:8091/speak"
    assert posted.kwargs["json"]["text"] == "Hello world"
    get_settings.cache_clear()


def test_synthesize_retries_without_voice_on_unknown_voice(monkeypatch):
    monkeypatch.setenv("TTS_BASE_URL", "http://100.120.169.81:8091")
    monkeypatch.setenv("TTS_VOICE", "vivian")
    from app.common.config import get_settings

    get_settings.cache_clear()
    rejected = MagicMock()
    rejected.status_code = 400
    rejected.json.return_value = {"detail": "Unknown voice 'vivian'. Call GET /voices for supported voices."}
    rejected.text = '{"detail":"Unknown voice \'vivian\'."}'
    accepted = MagicMock()
    accepted.status_code = 200
    accepted.content = b"RIFF....WAVE"
    accepted.headers = {"content-type": "audio/wav"}
    with patch("app.tts.service.httpx.Client") as client_cls:
        client_cls.return_value.__enter__.return_value.post.side_effect = [rejected, accepted]
        audio, content_type = synthesize("Hello world")
    assert audio.startswith(b"RIFF")
    assert content_type == "audio/wav"
    posts = client_cls.return_value.__enter__.return_value.post.call_args_list
    assert posts[0].kwargs["json"] == {"text": "Hello world", "voice": "vivian"}
    assert posts[1].kwargs["json"] == {"text": "Hello world"}
    get_settings.cache_clear()


def test_speech_endpoint_returns_audio(auth_client, monkeypatch):
    monkeypatch.setattr("app.tts.router.synthesize", lambda text: (b"audio-bytes", "audio/wav"))
    response = auth_client.post("/api/v1/tts/speech", json={"text": "Read this lesson."})
    assert response.status_code == 200
    assert response.content == b"audio-bytes"
    assert response.headers["content-type"].startswith("audio/wav")


def test_speech_endpoint_requires_sign_in(client, monkeypatch):
    called = []
    monkeypatch.setattr("app.tts.router.synthesize", lambda text: called.append(text) or (b"x", "audio/wav"))
    response = client.post("/api/v1/tts/speech", json={"text": "Read this lesson."})
    assert response.status_code == 401
    assert called == []


def _fake_client(calls: list[str]):
    class Response:
        status_code = 200
        headers = {"content-type": "audio/wav"}
        content = b"RIFF-audio"

        def json(self):
            return {}

    class Client:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def post(self, url, json):
            calls.append(json["text"])
            return Response()

    return Client


def test_synthesize_caches_audio_on_disk(monkeypatch, tmp_path):
    from app.common.config import get_settings
    from app.tts import service

    monkeypatch.setenv("TTS_CACHE_DIR", str(tmp_path))
    monkeypatch.setenv("TTS_CACHE_DAYS", "30")
    get_settings.cache_clear()
    calls: list[str] = []
    monkeypatch.setattr(service.httpx, "Client", _fake_client(calls))
    try:
        assert service.synthesize("hash maps") == (b"RIFF-audio", "audio/wav")
        assert service.synthesize("hash maps") == (b"RIFF-audio", "audio/wav")
        assert calls == ["hash maps"], "second call must be served from the cache"
        assert len(list(tmp_path.glob("*.wav"))) == 1

        service.synthesize("something else")
        assert len(calls) == 2
    finally:
        get_settings.cache_clear()


def test_prune_cache_removes_old_files(monkeypatch, tmp_path):
    import os
    import time

    from app.common.config import get_settings
    from app.tts import service

    monkeypatch.setenv("TTS_CACHE_DIR", str(tmp_path))
    monkeypatch.setenv("TTS_CACHE_DAYS", "30")
    get_settings.cache_clear()
    try:
        old = tmp_path / "old.wav"
        fresh = tmp_path / "fresh.wav"
        leftover = tmp_path / "partial.wav.123.tmp"
        for path in (old, fresh, leftover):
            path.write_bytes(b"x")
        stale = time.time() - 40 * 86400
        os.utime(old, (stale, stale))
        assert service.prune_cache() == 2
        assert fresh.exists() and not old.exists() and not leftover.exists()
    finally:
        get_settings.cache_clear()


def test_cache_disabled_when_days_is_zero(monkeypatch):
    from app.common.config import get_settings
    from app.tts import service

    monkeypatch.setenv("TTS_CACHE_DAYS", "0")
    get_settings.cache_clear()
    try:
        assert service.cache_dir() is None
    finally:
        get_settings.cache_clear()

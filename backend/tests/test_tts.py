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


def test_speech_endpoint_returns_audio(client, monkeypatch):
    monkeypatch.setattr("app.tts.router.synthesize", lambda text: (b"audio-bytes", "audio/wav"))
    response = client.post("/api/v1/tts/speech", json={"text": "Read this lesson."})
    assert response.status_code == 200
    assert response.content == b"audio-bytes"
    assert response.headers["content-type"].startswith("audio/wav")

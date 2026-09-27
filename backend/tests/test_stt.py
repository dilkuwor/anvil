import httpx

from app.stt import service


class FakeResponse:
    def __init__(self, status_code=200, payload=None, text=""):
        self.status_code = status_code
        self._payload = payload if payload is not None else {}
        self.text = text

    def json(self):
        return self._payload


def fake_client(monkeypatch, *, response=None, error=None):
    captured: dict = {}

    class Client:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def post(self, url, files=None, data=None):
            captured["url"] = url
            captured["files"] = files
            captured["data"] = data
            if error:
                raise error
            return response

    monkeypatch.setattr(service.httpx, "Client", Client)
    return captured


def test_transcribe_forwards_audio_and_returns_text(auth_client, monkeypatch):
    captured = fake_client(monkeypatch, response=FakeResponse(200, {"text": "  How does sharding work?  "}))
    response = auth_client.post(
        "/api/v1/stt/transcribe", files={"file": ("clip.webm", b"\x1aE\xdf\xa3audio", "audio/webm")}
    )
    assert response.status_code == 200
    assert response.json() == {"text": "How does sharding work?"}
    assert captured["url"].endswith("/transcribe")
    name, body, content_type = captured["files"]["file"]
    assert (name, body, content_type) == ("clip.webm", b"\x1aE\xdf\xa3audio", "audio/webm")
    assert "consistent hashing" in captured["data"]["prompt"]


def test_empty_recording_is_rejected(auth_client, monkeypatch):
    fake_client(monkeypatch, response=FakeResponse(200, {"text": "never"}))
    response = auth_client.post("/api/v1/stt/transcribe", files={"file": ("clip.webm", b"", "audio/webm")})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "empty_audio"


def test_unreadable_recording_maps_to_400(auth_client, monkeypatch):
    fake_client(monkeypatch, response=FakeResponse(400, {"detail": "could not decode audio"}))
    response = auth_client.post("/api/v1/stt/transcribe", files={"file": ("clip.webm", b"zzz", "audio/webm")})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "unreadable_audio"


def test_service_down_maps_to_503(auth_client, monkeypatch):
    fake_client(monkeypatch, error=httpx.ConnectError("refused"))
    response = auth_client.post("/api/v1/stt/transcribe", files={"file": ("clip.webm", b"zzz", "audio/webm")})
    assert response.status_code == 503


def test_voice_input_disabled_without_url(auth_client, monkeypatch):
    from app.common.config import get_settings

    monkeypatch.setenv("STT_BASE_URL", "")
    get_settings.cache_clear()
    try:
        response = auth_client.post("/api/v1/stt/transcribe", files={"file": ("clip.webm", b"zzz", "audio/webm")})
    finally:
        get_settings.cache_clear()
    assert response.status_code == 503
    assert "not set up" in response.json()["error"]["message"]

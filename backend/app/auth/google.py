import jwt
from jwt import PyJWKClient

from app.common.errors import UnauthorizedError

GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISSUERS = ("https://accounts.google.com", "accounts.google.com")

_jwk_client: PyJWKClient | None = None


def _get_jwk_client() -> PyJWKClient:
    global _jwk_client
    if _jwk_client is None:
        _jwk_client = PyJWKClient(GOOGLE_JWKS_URL, cache_keys=True, lifespan=3600)
    return _jwk_client


def verify_google_id_token(credential: str, client_id: str) -> dict:
    """Verify a Google-issued id_token (GIS credential) and return its claims."""
    try:
        signing_key = _get_jwk_client().get_signing_key_from_jwt(credential)
        claims = jwt.decode(
            credential,
            signing_key.key,
            algorithms=["RS256"],
            audience=client_id,
            issuer=GOOGLE_ISSUERS,
        )
    except jwt.PyJWTError as exc:
        raise UnauthorizedError("Google sign-in failed. Please try again.") from exc

    email = claims.get("email")
    if not email or not claims.get("email_verified", False):
        raise UnauthorizedError("Your Google account email is not verified.")
    if not claims.get("sub"):
        raise UnauthorizedError("Google sign-in failed. Please try again.")
    return claims

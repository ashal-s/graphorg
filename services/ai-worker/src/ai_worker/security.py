import hmac

from fastapi import Header, HTTPException

from ai_worker.config import get_settings


def require_internal_secret(x_internal_secret: str = Header(default="")) -> None:
    expected = get_settings().internal_secret
    if not hmac.compare_digest(x_internal_secret.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="Unauthorized")
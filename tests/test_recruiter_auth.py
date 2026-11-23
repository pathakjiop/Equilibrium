import pytest
from fastapi import HTTPException

from server import require_recruiter
from dojo import config


def test_recruiter_auth_requires_configured_password(monkeypatch):
    monkeypatch.setattr(config, "RECRUITER_PASSWORD", "secret")
    with pytest.raises(HTTPException) as error:
        require_recruiter(None)
    assert error.value.status_code == 401
    with pytest.raises(HTTPException):
        require_recruiter("wrong")
    require_recruiter("secret")

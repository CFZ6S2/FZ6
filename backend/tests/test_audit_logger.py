import pytest
from types import SimpleNamespace
from app.services.security.security_logger import audit_logger


class FakeDoc:
    def __init__(self, id_="test_doc_id"):
        self.id = id_

    async def set(self, data):
        self.data = data


class FakeCollection:
    def document(self):
        return FakeDoc()


class FakeDB:
    def collection(self, name):
        return FakeCollection()


@pytest.mark.asyncio
async def test_log_action_persists_and_returns_id(monkeypatch):
    monkeypatch.setattr(
        audit_logger,
        "collection_name",
        "audit_logs_test"
    )
    monkeypatch.setattr(
        audit_logger,
        "__dict__",
        {**audit_logger.__dict__, "db": None},
        raising=False
    )
    from app.services.security import security_logger as module
    module.db = FakeDB()

    action = "update_profile"
    user_id = "user_123"
    resource_id = "profile_456"
    context = {"fields": ["name", "phone"]}

    doc_id = await audit_logger.log_action(
        action=action,
        user_id=user_id,
        resource_id=resource_id,
        context=context,
        success=True
    )

    assert isinstance(doc_id, str)
    assert doc_id == "test_doc_id"

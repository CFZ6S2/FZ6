import json
from datetime import datetime
from types import SimpleNamespace

import importlib

import pytest

backup_module = importlib.import_module("app.services.backup.firestore_backup_service")
FirestoreBackupService = backup_module.FirestoreBackupService


class DummyOperation:
    def __init__(self, name: str):
        self.operation = SimpleNamespace(name=name)
        self.done = False
        self.error = SimpleNamespace(message="")


class DummyBlob:
    def __init__(self, name: str, size: int = 0, content: str | None = None):
        self.name = name
        self.size = size
        self._content = content

    def exists(self) -> bool:
        return self._content is not None

    def download_as_text(self) -> str:
        if self._content is None:
            raise FileNotFoundError(self.name)
        return self._content


class DummyBucket:
    def __init__(self, name: str, blobs: list[DummyBlob]):
        self.name = name
        self._blobs = {blob.name: blob for blob in blobs}

    def list_blobs(self, prefix: str | None = None, delimiter: str | None = None):
        if prefix:
            return [blob for name, blob in self._blobs.items() if name.startswith(prefix)]
        return list(self._blobs.values())

    def blob(self, name: str) -> DummyBlob:
        return self._blobs.get(name, DummyBlob(name))

    def reload(self):
        return None


class DummyStorageClient:
    def __init__(self, bucket: DummyBucket):
        self._bucket = bucket

    def bucket(self, name: str) -> DummyBucket:
        return self._bucket


class DummyFirestoreAdminClient:
    def __init__(self):
        self._operations: dict[str, DummyOperation] = {}

    def export_documents(self, request):
        operation = DummyOperation("operations/backup-test")
        self._operations[operation.operation.name] = operation
        return operation

    def get_operation(self, name: str) -> DummyOperation:
        return self._operations.get(name, DummyOperation(name))


@pytest.fixture()
def backup_service(monkeypatch):
    # Fresh timestamp for predictable folder names
    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    metadata = {
        "timestamp": timestamp,
        "type": "manual",
        "project_id": "test-project",
        "backup_path": f"gs://test-project-backups/backups/manual/{timestamp}",
    }

    blobs = [
        DummyBlob(
            name=f"backups/manual/{timestamp}/metadata.json",
            size=128,
            content=json.dumps(metadata),
        ),
        DummyBlob(
            name=f"backups/manual/{timestamp}/overall_export_metadata",
            size=32,
            content="metadata",
        ),
        DummyBlob(
            name=f"backups/manual/{timestamp}/output-0",
            size=1024,
            content="data",
        ),
    ]

    # Bucket with a recent backup
    bucket = DummyBucket("test-project-backups", blobs)

    monkeypatch.setenv("FIREBASE_PROJECT_ID", "test-project")
    monkeypatch.setattr(
        backup_module.firestore_admin_v1,
        "FirestoreAdminClient",
        lambda: DummyFirestoreAdminClient(),
    )
    monkeypatch.setattr(
        backup_module.storage,
        "Client",
        lambda project=None: DummyStorageClient(bucket),
    )

    return FirestoreBackupService()


@pytest.mark.asyncio
async def test_trigger_backup_returns_operation_details(
    backup_service: FirestoreBackupService,
):
    result = await backup_service.trigger_backup(backup_type="manual")

    assert result["success"] is True
    assert result["operation_name"] == "operations/backup-test"
    assert result["backup_type"] == "manual"
    assert result["output_uri"].startswith("gs://test-project-backups/backups/manual/")
    assert result["status"] == "in_progress"


@pytest.mark.asyncio
async def test_list_backups_returns_metadata_and_sizes(
    backup_service: FirestoreBackupService,
):
    backups = await backup_service.list_backups(limit=5)

    assert backups["success"] is True
    assert backups["count"] == 1
    assert backups["bucket"] == "test-project-backups"

    backup = backups["backups"][0]
    assert backup["metadata"]["project_id"] == "test-project"
    assert backup["size_bytes"] >= 1024


@pytest.mark.asyncio
async def test_backup_health_detects_recent_backup(
    backup_service: FirestoreBackupService,
):
    health = await backup_service.get_backup_health()

    assert health["status"] in {"healthy", "degraded"}
    assert health["checks"]["service_initialized"] is True
    assert health["checks"]["bucket_accessible"] is True
    assert health["checks"]["recent_backup_exists"] is True


@pytest.mark.asyncio
async def test_verify_backup_confirms_required_files(
    backup_service: FirestoreBackupService,
):
    result = await backup_service.verify_backup(
        backup_path="gs://test-project-backups/backups/manual"
    )

    assert result["valid"] is True
    assert result["file_count"] >= 2
    assert result["has_metadata"] is True
    assert result["has_data_files"] is True

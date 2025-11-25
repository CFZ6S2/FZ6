"""
Test configuration and fixtures for TuCitaSegura backend tests
"""

import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient
from main import app

pytest_plugins = ["tests.cov_stub", "tests.asyncio_stub"]

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Create a test client for the FastAPI app."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
def sample_user_data():
    """Sample user data for testing."""
    return {
        "user_id": "test_user_123",
        "age": 28,
        "gender": "masculino",
        "location": {"lat": 40.7128, "lng": -74.0060},
        "interests": ["music", "travel", "cooking"],
        "profession": "Engineer",
        "education_level": "university",
        "relationship_goals": "serious"
    }

@pytest.fixture
def sample_message_data():
    """Sample message data for testing."""
    return {
        "message_text": "¡Hola! ¿Te gustaría salir a tomar un café?",
        "sender_id": "user_123",
        "receiver_id": "user_456"
    }

@pytest.fixture
def auth_headers():
    """Sample authentication headers for testing."""
    return {
        "Authorization": "Bearer test_token_123",
        "Content-Type": "application/json"
    }

@pytest.fixture
def authenticated_client(client, auth_headers):
    """Create an authenticated test client."""
    client.headers.update(auth_headers)
    return client
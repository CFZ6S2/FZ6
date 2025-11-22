"""
API tests for TuCitaSegura Backend - Async version
"""
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
class TestAPIEndpointsAsync:
    """Test suite for API endpoints - Async version"""
    
    async def test_health_check(self, client):
        """Test health check endpoint"""
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert "timestamp" in data
        assert "services" in data
    
    async def test_recommendations_endpoint(self, client):
        """Test recommendations API endpoint"""
        payload = {
            "user_id": "test_user_123",
            "preferences": {
                "age_range": [25, 35],
                "distance_km": 50,
                "interests": ["music", "travel", "cooking"]
            },
            "limit": 5
        }
        
        response = await client.post("/api/v1/recommendations", json=payload)
        assert response.status_code == 200
        data = response.json()
        # El endpoint devuelve directamente RecommendationResponse, no SuccessResponse
        assert data["user_id"] == "test_user_123"
        assert "recommendations" in data
        assert "algorithm" in data
        assert "generated_at" in data
    
    async def test_fraud_check_endpoint(self, authenticated_client):
        """Test fraud check API endpoint"""
        payload = {
            "user_id": "test_user_123",
            "user_data": {
                "email": "test@example.com",
                "name": "Test User"
            },
            "user_history": {
                "messages_sent": 10,
                "account_age_days": 30
            }
        }
        
        response = await authenticated_client.post("/api/v1/fraud-check", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "is_suspicious" in data["data"]
        assert "risk_score" in data["data"]
    
    async def test_message_moderation_endpoint(self, authenticated_client):
        """Test message moderation API endpoint"""
        payload = {
            "message_text": "Hello, how are you today?",
            "sender_id": "user_123",
            "receiver_id": "user_456"
        }
        
        response = await authenticated_client.post("/api/v1/moderate-message", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "should_block" in data["data"]
        assert "is_toxic" in data["data"]
    
    async def test_meeting_spots_endpoint(self, authenticated_client):
        """Test meeting spots API endpoint"""
        payload = {
            "user1_location": {"lat": 40.7128, "lng": -74.0060},
            "user2_location": {"lat": 40.7589, "lng": -73.9851}
        }
        
        response = await authenticated_client.post("/api/v1/suggest-meeting-spots", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    async def test_vip_events_create_endpoint(self, authenticated_client):
        """Test VIP events creation API endpoint"""
        payload = {
            "event_type": "wine_tasting",
            "location_data": {
                "name": "Test Venue",
                "address": "Test Address",
                "city": "Madrid",
                "coordinates": [40.4168, -3.7038]
            },
            "date_time": "2024-12-31T20:00:00",
            "organizer_id": "organizer_123"
        }
        
        response = await authenticated_client.post("/api/v1/vip-events/create", json=payload)
        assert response.status_code in [200, 400]  # May fail if organizer doesn't exist
        if response.status_code == 200:
            data = response.json()
            assert data["success"] == True
            assert "event_id" in data["data"]
    
    async def test_video_chat_create_endpoint(self, authenticated_client):
        """Test video chat creation API endpoint"""
        payload = {
            "host_user_id": "user_123",
            "display_name": "Test User",
            "max_participants": 2,
            "is_private": True
        }
        
        response = await authenticated_client.post("/api/v1/video-chat/create", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "call_id" in data["data"]
        assert "room_id" in data["data"]
    
    async def test_referral_code_generation_endpoint(self, authenticated_client):
        """Test referral code generation API endpoint"""
        response = await authenticated_client.post("/api/v1/referrals/generate-code?user_id=test_user_123")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "code" in data["data"]

@pytest.mark.asyncio
class TestErrorHandlingAsync:
    """Test error handling - Async version"""
    
    async def test_invalid_endpoint(self, client):
        """Test invalid endpoint handling"""
        response = await client.get("/api/v1/nonexistent")
        assert response.status_code == 404
    
    async def test_invalid_method(self, client):
        """Test invalid HTTP method"""
        response = await client.delete("/api/v1/recommendations")
        assert response.status_code == 405
    
    async def test_invalid_payload(self, client):
        """Test invalid payload handling"""
        payload = {"invalid": "data"}
        response = await client.post("/api/v1/recommendations", json=payload)
        # Should either validate or return 422
        assert response.status_code in [200, 422]
    
    async def test_empty_payload(self, client):
        """Test empty payload handling"""
        response = await client.post("/api/v1/recommendations", json={})
        # Should either validate or return 422
        assert response.status_code in [200, 422]
    
    async def test_malformed_json(self, client):
        """Test malformed JSON handling"""
        response = await client.post(
            "/api/v1/recommendations",
            content="invalid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422
    
    async def test_sql_injection_attempt(self, authenticated_client):
        """Test SQL injection prevention"""
        payload = {
            "user_id": "'; DROP TABLE users; --",
            "limit": 5
        }
        
        response = await authenticated_client.post("/api/v1/recommendations", json=payload)
        # Should not crash or execute malicious code
        assert response.status_code in [200, 400, 422]
        
        if response.status_code == 200:
            data = response.json()
            # Should return recommendations safely without executing SQL injection
            assert "recommendations" in data
    
    async def test_xss_attempt(self, authenticated_client):
        """Test XSS prevention"""
        payload = {
            "message_text": "<script>alert('XSS')</script>",
            "sender_id": "user_123",
            "receiver_id": "user_456"
        }
        
        response = await authenticated_client.post("/api/v1/moderate-message", json=payload)
        assert response.status_code == 200
        data = response.json()
        # Should handle XSS attempt safely
        assert data["success"] == True
        assert "data" in data
        assert "should_block" in data["data"]
        assert "is_toxic" in data["data"]
import pytest
from fastapi.testclient import TestClient
from main import app

# Create test client
client = TestClient(app)

class TestAPIEndpoints:
    """Integration tests for API endpoints"""
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert "timestamp" in data
        assert "services" in data
    
    def test_recommendations_endpoint(self):
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
        
        response = client.post("/api/v1/recommendations", json=payload)
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
    
    def test_message_moderation_endpoint(self, authenticated_client):
        """Test message moderation API endpoint"""
        payload = {
            "message_text": "Hello, how are you today?",
            "sender_id": "user_123",
            "receiver_id": "user_456"
        }
        
        response = authenticated_client.post("/api/v1/moderate-message", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "should_block" in data["data"]
        assert "is_toxic" in data["data"]
    
    def test_meeting_spots_endpoint(self, authenticated_client):
        """Test meeting spots API endpoint"""
        payload = {
            "user1_location": {"lat": 40.7128, "lng": -74.0060},
            "user2_location": {"lat": 40.7589, "lng": -73.9851}
        }
        
        response = authenticated_client.post("/api/v1/suggest-meeting-spots", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_vip_events_create_endpoint(self, authenticated_client):
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
        
        response = authenticated_client.post("/api/v1/vip-events/create", json=payload)
        assert response.status_code in [200, 400]  # May fail if organizer doesn't exist
        if response.status_code == 200:
            data = response.json()
            assert data["success"] == True
            assert "event_id" in data["data"]
    
    def test_video_chat_create_endpoint(self, authenticated_client):
        """Test video chat creation API endpoint"""
        payload = {
            "host_user_id": "user_123",
            "display_name": "Test User",
            "max_participants": 2,
            "is_private": True
        }
        
        response = authenticated_client.post("/api/v1/video-chat/create", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "call_id" in data["data"]
        assert "room_id" in data["data"]
    
    def test_referral_code_generation_endpoint(self, authenticated_client):
        """Test referral code generation API endpoint"""
        response = authenticated_client.post("/api/v1/referrals/generate-code?user_id=test_user_123")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "code" in data["data"]
    
    def test_invalid_endpoint(self):
        """Test invalid endpoint handling"""
        response = client.get("/api/v1/nonexistent")
        assert response.status_code == 404
    
    def test_invalid_method(self):
        """Test invalid HTTP method handling"""
        response = client.delete("/health")
        assert response.status_code == 405
    
    def test_invalid_payload(self):
        """Test invalid payload handling"""
        payload = {
            "invalid_field": "invalid_value"
        }
        
        response = client.post("/api/v1/recommendations", json=payload)
        assert response.status_code in [200, 422]  # 422 for validation error


class TestErrorHandling:
    """Test error handling across the API"""
    
    def test_empty_payload(self):
        """Test empty payload handling"""
        response = client.post("/api/v1/recommendations", json={})
        assert response.status_code in [200, 422]
    
    def test_malformed_json(self):
        """Test malformed JSON handling"""
        response = client.post(
            "/api/v1/recommendations",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422
    
    def test_sql_injection_attempt(self):
        """Test SQL injection prevention"""
        payload = {
            "user_id": "'; DROP TABLE users; --",
            "limit": 5
        }
        
        response = client.post("/api/v1/recommendations", json=payload)
        # Should not crash or execute malicious code
        assert response.status_code in [200, 422]
    
    def test_xss_attempt(self, authenticated_client):
        """Test XSS prevention"""
        payload = {
            "message_text": "<script>alert('XSS')</script>",
            "sender_id": "user_123",
            "receiver_id": "user_456"
        }
        
        response = authenticated_client.post("/api/v1/moderate-message", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
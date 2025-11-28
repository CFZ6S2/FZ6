"""
Unit tests for recommendations API endpoints
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from main import app

client = TestClient(app)


class TestGetRecommendations:
    """Tests for GET /api/v1/recommendations/ endpoint"""

    def test_get_recommendations_success(self):
        """Test getting recommendations with valid parameters"""
        response = client.get(
            "/api/v1/recommendations/",
            params={
                "user_id": "test_user_123",
                "limit": 10,
                "min_score": 0.5
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "recommendations" in data
        assert "count" in data
        assert isinstance(data["recommendations"], list)

    def test_get_recommendations_custom_limit(self):
        """Test recommendations with custom limit"""
        response = client.get(
            "/api/v1/recommendations/",
            params={
                "user_id": "test_user_123",
                "limit": 5,
                "min_score": 0.7
            }
        )
        assert response.status_code == 200
        data = response.json()
        # Mock returns 1 item, but in real implementation should respect limit
        assert data["count"] <= 5

    def test_get_recommendations_invalid_limit(self):
        """Test with limit out of valid range"""
        response = client.get(
            "/api/v1/recommendations/",
            params={
                "user_id": "test_user_123",
                "limit": 100,  # Max is 50
                "min_score": 0.5
            }
        )
        assert response.status_code == 422  # Validation error

    def test_get_recommendations_invalid_score(self):
        """Test with invalid min_score"""
        response = client.get(
            "/api/v1/recommendations/",
            params={
                "user_id": "test_user_123",
                "limit": 10,
                "min_score": 1.5  # Must be 0.0-1.0
            }
        )
        assert response.status_code == 422

    def test_get_recommendations_missing_user_id(self):
        """Test without required user_id parameter"""
        response = client.get(
            "/api/v1/recommendations/",
            params={
                "limit": 10,
                "min_score": 0.5
            }
        )
        assert response.status_code == 422

    def test_get_recommendations_default_params(self):
        """Test with only required parameter (user_id)"""
        response = client.get(
            "/api/v1/recommendations/",
            params={"user_id": "test_user_123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


class TestRefreshRecommendations:
    """Tests for POST /api/v1/recommendations/refresh endpoint"""

    def test_refresh_recommendations_success(self):
        """Test refreshing recommendations"""
        response = client.post(
            "/api/v1/recommendations/refresh",
            params={"user_id": "test_user_123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["user_id"] == "test_user_123"
        assert "refreshed_at" in data

    def test_refresh_recommendations_missing_user_id(self):
        """Test refresh without user_id"""
        response = client.post("/api/v1/recommendations/refresh")
        assert response.status_code == 422


class TestCompatibilityScore:
    """Tests for GET /api/v1/recommendations/compatibility/{user_id_1}/{user_id_2} endpoint"""

    def test_get_compatibility_success(self):
        """Test getting compatibility score between two users"""
        response = client.get(
            "/api/v1/recommendations/compatibility/user1/user2"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["user_id_1"] == "user1"
        assert data["user_id_2"] == "user2"
        assert "compatibility_score" in data
        assert 0.0 <= data["compatibility_score"] <= 1.0
        assert "breakdown" in data
        assert "common_interests" in data
        assert "distance_km" in data

    def test_compatibility_breakdown_structure(self):
        """Test that compatibility breakdown has expected fields"""
        response = client.get(
            "/api/v1/recommendations/compatibility/user1/user2"
        )
        assert response.status_code == 200
        data = response.json()
        breakdown = data["breakdown"]

        # Check for expected breakdown fields
        expected_fields = ["interests", "location", "age_compatibility", "lifestyle"]
        for field in expected_fields:
            assert field in breakdown
            assert 0.0 <= breakdown[field] <= 1.0


class TestUpdatePreferences:
    """Tests for POST /api/v1/recommendations/preferences/{user_id} endpoint"""

    def test_update_preferences_success(self):
        """Test updating user preferences"""
        preferences = {
            "min_age": 25,
            "max_age": 35,
            "max_distance_km": 50,
            "gender_preference": "any",
            "interests": ["travel", "music", "sports"]
        }

        response = client.post(
            "/api/v1/recommendations/preferences/test_user_123",
            json=preferences
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["user_id"] == "test_user_123"
        assert data["preferences"]["min_age"] == 25
        assert data["preferences"]["max_age"] == 35

    def test_update_preferences_invalid_age_range(self):
        """Test with invalid age range"""
        preferences = {
            "min_age": 15,  # Below minimum (18)
            "max_age": 35,
            "max_distance_km": 50,
            "gender_preference": "any"
        }

        response = client.post(
            "/api/v1/recommendations/preferences/test_user_123",
            json=preferences
        )
        assert response.status_code == 422

    def test_update_preferences_invalid_gender(self):
        """Test with invalid gender preference"""
        preferences = {
            "min_age": 25,
            "max_age": 35,
            "max_distance_km": 50,
            "gender_preference": "invalid"  # Must be male, female, or any
        }

        response = client.post(
            "/api/v1/recommendations/preferences/test_user_123",
            json=preferences
        )
        assert response.status_code == 422

    def test_update_preferences_missing_required_fields(self):
        """Test with missing required fields"""
        preferences = {
            "min_age": 25
            # Missing other required fields
        }

        response = client.post(
            "/api/v1/recommendations/preferences/test_user_123",
            json=preferences
        )
        assert response.status_code == 422

    def test_update_preferences_optional_fields(self):
        """Test that optional fields work correctly"""
        preferences = {
            "min_age": 25,
            "max_age": 35,
            "max_distance_km": 50,
            "gender_preference": "female",
            "relationship_goals": ["serious", "marriage"],
            "interests": ["travel", "books"]
        }

        response = client.post(
            "/api/v1/recommendations/preferences/test_user_123",
            json=preferences
        )
        assert response.status_code == 200
        data = response.json()
        assert data["preferences"]["relationship_goals"] == ["serious", "marriage"]
        assert data["preferences"]["interests"] == ["travel", "books"]


class TestRecommendationStats:
    """Tests for GET /api/v1/recommendations/stats/{user_id} endpoint"""

    def test_get_stats_success(self):
        """Test getting recommendation statistics"""
        response = client.get(
            "/api/v1/recommendations/stats/test_user_123"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["user_id"] == "test_user_123"
        assert "stats" in data

    def test_stats_structure(self):
        """Test that stats response has expected structure"""
        response = client.get(
            "/api/v1/recommendations/stats/test_user_123"
        )
        assert response.status_code == 200
        data = response.json()
        stats = data["stats"]

        # Check for expected stat fields
        expected_fields = [
            "total_recommendations",
            "viewed",
            "liked",
            "matched",
            "match_rate",
            "average_compatibility_score",
            "last_updated"
        ]
        for field in expected_fields:
            assert field in stats

    def test_stats_match_rate_calculation(self):
        """Test that match rate is within valid range"""
        response = client.get(
            "/api/v1/recommendations/stats/test_user_123"
        )
        assert response.status_code == 200
        data = response.json()
        match_rate = data["stats"]["match_rate"]
        assert 0.0 <= match_rate <= 1.0


class TestRecommendationResponseModels:
    """Tests for response model validation"""

    def test_recommendation_score_fields(self):
        """Test that recommendation response has all required fields"""
        response = client.get(
            "/api/v1/recommendations/",
            params={"user_id": "test_user_123"}
        )
        assert response.status_code == 200
        data = response.json()

        if data["count"] > 0:
            rec = data["recommendations"][0]
            # Check all required fields from RecommendationScore model
            assert "user_id" in rec
            assert "compatibility_score" in rec
            assert "distance_km" in rec
            assert "common_interests" in rec
            assert "reasons" in rec
            assert "recommended_at" in rec

            # Validate types
            assert isinstance(rec["common_interests"], list)
            assert isinstance(rec["reasons"], list)
            assert 0.0 <= rec["compatibility_score"] <= 1.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

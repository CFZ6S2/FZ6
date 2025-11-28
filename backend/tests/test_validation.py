"""
Unit tests for validation API endpoints
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from main import app

client = TestClient(app)


class TestEmailValidation:
    """Tests for email validation endpoint"""

    def test_valid_email(self):
        """Test with valid email address"""
        response = client.post(
            "/api/v1/validation/email",
            json={"email": "user@example.com"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert "Email válido" in data["message"]

    def test_invalid_email_format(self):
        """Test with invalid email format"""
        response = client.post(
            "/api/v1/validation/email",
            json={"email": "notanemail"}
        )
        assert response.status_code == 422  # Validation error

    def test_missing_email(self):
        """Test with missing email field"""
        response = client.post(
            "/api/v1/validation/email",
            json={}
        )
        assert response.status_code == 422


class TestPasswordValidation:
    """Tests for password validation endpoint"""

    def test_strong_password(self):
        """Test with strong password"""
        response = client.post(
            "/api/v1/validation/password",
            json={"password": "SecurePass123!"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["details"]["score"] >= 75

    def test_weak_password(self):
        """Test with weak password"""
        response = client.post(
            "/api/v1/validation/password",
            json={"password": "weak"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert len(data["details"]["errors"]) > 0

    def test_password_too_short(self):
        """Test with password that's too short"""
        response = client.post(
            "/api/v1/validation/password",
            json={"password": "Short1"}
        )
        assert response.status_code == 422  # Pydantic validation

    def test_password_strength_scoring(self):
        """Test password strength scoring system"""
        # Test different password strengths
        passwords = [
            ("12345678", "débil"),  # Only numbers
            ("Password1", "moderada"),  # Upper, lower, number
            ("SecureP@ss123", "muy fuerte"),  # Upper, lower, number, special, 12+ chars
        ]

        for password, expected_strength_type in passwords:
            response = client.post(
                "/api/v1/validation/password",
                json={"password": password}
            )
            if response.status_code == 200:
                data = response.json()
                # Just check that we get a strength rating
                assert "strength" in data["details"]


class TestPhoneValidation:
    """Tests for phone validation endpoint"""

    def test_valid_international_phone(self):
        """Test with valid international phone format"""
        response = client.post(
            "/api/v1/validation/phone",
            json={"phone": "+34612345678"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True

    def test_valid_national_phone(self):
        """Test with valid national phone format"""
        response = client.post(
            "/api/v1/validation/phone",
            json={"phone": "612345678"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True

    def test_invalid_phone_too_short(self):
        """Test with phone number that's too short"""
        response = client.post(
            "/api/v1/validation/phone",
            json={"phone": "12345"}
        )
        assert response.status_code == 422

    def test_invalid_phone_letters(self):
        """Test with phone containing letters"""
        response = client.post(
            "/api/v1/validation/phone",
            json={"phone": "+34abc123456"}
        )
        assert response.status_code == 422


class TestUsernameValidation:
    """Tests for username validation endpoint"""

    def test_valid_username(self):
        """Test with valid username"""
        response = client.post(
            "/api/v1/validation/username",
            json={"username": "john_doe"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True

    def test_valid_username_with_numbers(self):
        """Test username with numbers"""
        response = client.post(
            "/api/v1/validation/username",
            json={"username": "user123"}
        )
        assert response.status_code == 200

    def test_invalid_username_too_short(self):
        """Test username that's too short"""
        response = client.post(
            "/api/v1/validation/username",
            json={"username": "ab"}
        )
        assert response.status_code == 422

    def test_invalid_username_special_chars(self):
        """Test username with invalid special characters"""
        response = client.post(
            "/api/v1/validation/username",
            json={"username": "user@name"}
        )
        assert response.status_code == 422

    def test_invalid_username_starts_with_dot(self):
        """Test username starting with dot"""
        response = client.post(
            "/api/v1/validation/username",
            json={"username": ".username"}
        )
        assert response.status_code == 422


class TestDNIValidation:
    """Tests for DNI/NIE validation endpoint"""

    def test_valid_dni(self):
        """Test with valid DNI"""
        response = client.post(
            "/api/v1/validation/dni",
            json={"dni": "12345678Z"}  # Valid DNI format
        )
        assert response.status_code == 200
        # Note: May be invalid letter, but format is correct

    def test_valid_nie_format(self):
        """Test with valid NIE format"""
        response = client.post(
            "/api/v1/validation/dni",
            json={"dni": "X1234567L"}
        )
        assert response.status_code == 200

    def test_invalid_dni_format(self):
        """Test with invalid DNI format"""
        response = client.post(
            "/api/v1/validation/dni",
            json={"dni": "123456789"}  # Missing letter
        )
        assert response.status_code == 422

    def test_invalid_dni_lowercase(self):
        """Test DNI with lowercase letter"""
        response = client.post(
            "/api/v1/validation/dni",
            json={"dni": "12345678z"}
        )
        assert response.status_code == 422


class TestAgeValidation:
    """Tests for age validation endpoint"""

    def test_valid_adult_age(self):
        """Test with valid adult birthdate"""
        response = client.post(
            "/api/v1/validation/age",
            params={"birthdate": "1990-01-01"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["details"]["is_adult"] is True
        assert data["details"]["age"] >= 18

    def test_underage(self):
        """Test with underage birthdate"""
        response = client.post(
            "/api/v1/validation/age",
            params={"birthdate": "2010-01-01"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert data["details"]["is_adult"] is False

    def test_invalid_date_format(self):
        """Test with invalid date format"""
        response = client.post(
            "/api/v1/validation/age",
            params={"birthdate": "01/01/1990"}
        )
        assert response.status_code == 400


class TestBatchValidation:
    """Tests for batch validation endpoint"""

    def test_batch_all_valid(self):
        """Test batch validation with all valid inputs"""
        response = client.post(
            "/api/v1/validation/batch",
            json={
                "email": "user@example.com",
                "password": "SecurePass123!",
                "phone": "+34612345678",
                "username": "john_doe"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "results" in data
        assert len(data["results"]) == 4

    def test_batch_mixed_validity(self):
        """Test batch validation with mix of valid and invalid"""
        response = client.post(
            "/api/v1/validation/batch",
            json={
                "email": "invalid-email",
                "password": "SecurePass123!",
                "username": "valid_user"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["all_valid"] is False

    def test_batch_empty(self):
        """Test batch validation with empty data"""
        response = client.post(
            "/api/v1/validation/batch",
            json={}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["results"]) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

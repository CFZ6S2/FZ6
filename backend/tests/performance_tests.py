import time
from locust import HttpUser, task, between

class TuCitaSeguraUser(HttpUser):
    """Load test user for TuCitaSegura API"""
    
    wait_time = between(1, 3)  # Wait 1-3 seconds between tasks
    
    def on_start(self):
        """Setup tasks that run when user starts"""
        self.user_id = f"load_test_user_{int(time.time())}"
    
    @task(3)
    def health_check(self):
        """Test health check endpoint"""
        with self.client.get("/health", catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    response.success()
                else:
                    response.failure("Health check failed")
            else:
                response.failure(f"Health check returned {response.status_code}")
    
    @task(5)
    def get_recommendations(self):
        """Test recommendations endpoint"""
        payload = {
            "user_id": self.user_id,
            "limit": 5,
            "filters": {
                "age_range": [25, 35],
                "interests": ["music", "travel", "cooking"]
            }
        }
        
        with self.client.post("/api/v1/recommendations", json=payload, catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "recommendations" in data.get("data", {}):
                    response.success()
                else:
                    response.failure("Invalid recommendations response")
            else:
                response.failure(f"Recommendations returned {response.status_code}")
    
    @task(4)
    def check_fraud(self):
        """Test fraud detection endpoint"""
        payload = {
            "user_id": self.user_id,
            "user_data": {
                "email": f"{self.user_id}@example.com",
                "name": "Load Test User"
            },
            "user_history": {
                "messages_sent": 10,
                "account_age_days": 30
            }
        }
        
        with self.client.post("/api/v1/fraud-check", json=payload, catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "risk_score" in data.get("data", {}):
                    response.success()
                else:
                    response.failure("Invalid fraud check response")
            else:
                response.failure(f"Fraud check returned {response.status_code}")
    
    @task(3)
    def moderate_message(self):
        """Test message moderation endpoint"""
        messages = [
            "Hello, how are you today?",
            "Would you like to meet for coffee?",
            "I love your profile!",
            "What are your hobbies?",
            "Nice to meet you!"
        ]
        
        payload = {
            "message_text": messages[int(time.time()) % len(messages)],
            "sender_id": self.user_id,
            "receiver_id": f"receiver_{int(time.time())}"
        }
        
        with self.client.post("/api/v1/moderate-message", json=payload, catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "should_block" in data.get("data", {}):
                    response.success()
                else:
                    response.failure("Invalid moderation response")
            else:
                response.failure(f"Message moderation returned {response.status_code}")
    
    @task(2)
    def suggest_meeting_spots(self):
        """Test meeting spots suggestion endpoint"""
        # Use different city coordinates for variety
        cities = [
            {"lat": 40.7128, "lng": -74.0060},  # New York
            {"lat": 40.4168, "lng": -3.7038},   # Madrid
            {"lat": 48.8566, "lng": 2.3522},   # Paris
            {"lat": 51.5074, "lng": -0.1278},  # London
            {"lat": 35.6762, "lng": 139.6503}  # Tokyo
        ]
        
        city_pair = cities[int(time.time()) % len(cities)]
        
        payload = {
            "user1_location": city_pair,
            "user2_location": {
                "lat": city_pair["lat"] + 0.01,
                "lng": city_pair["lng"] + 0.01
            }
        }
        
        with self.client.post("/api/v1/suggest-meeting-spots", json=payload, catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    response.success()
                else:
                    response.failure("Invalid meeting spots response")
            else:
                response.failure(f"Meeting spots returned {response.status_code}")
    
    @task(2)
    def create_video_call(self):
        """Test video call creation endpoint"""
        payload = {
            "host_user_id": self.user_id,
            "display_name": f"Host {self.user_id}",
            "max_participants": 2,
            "is_private": True
        }
        
        with self.client.post("/api/v1/video-chat/create", json=payload, catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "call_id" in data.get("data", {}):
                    response.success()
                else:
                    response.failure("Invalid video call response")
            else:
                response.failure(f"Video call creation returned {response.status_code}")
    
    @task(1)
    def generate_referral_code(self):
        """Test referral code generation endpoint"""
        with self.client.post(f"/api/v1/referrals/generate-code?user_id={self.user_id}", catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "code" in data.get("data", {}):
                    response.success()
                else:
                    response.failure("Invalid referral code response")
            else:
                response.failure(f"Referral code generation returned {response.status_code}")
    
    @task(1)
    def create_vip_event(self):
        """Test VIP event creation endpoint"""
        cities = ["Madrid", "Barcelona", "Valencia", "Sevilla", "Bilbao"]
        city = cities[int(time.time()) % len(cities)]
        
        payload = {
            "event_type": "wine_tasting",
            "location_data": {
                "name": f"Test Venue {city}",
                "address": f"Test Address {city}",
                "city": city,
                "coordinates": [40.4168 + (int(time.time()) % 10) * 0.1, -3.7038],
                "venue_type": "private_venue",
                "capacity": 50
            },
            "date_time": "2024-12-31T20:00:00",
            "organizer_id": f"organizer_{self.user_id}"
        }
        
        with self.client.post("/api/v1/vip-events/create", json=payload, catch_response=True) as response:
            if response.status_code in [200, 400]:  # 400 is acceptable for test data
                response.success()
            else:
                response.failure(f"VIP event creation returned {response.status_code}")


class WebsiteUser(HttpUser):
    """User that simulates browsing the website"""
    
    wait_time = between(5, 15)  # Longer wait times for website browsing
    
    @task(1)
    def index_page(self):
        """Test main page load"""
        with self.client.get("/", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Main page returned {response.status_code}")


# Configuration for different load test scenarios
class SteadyLoadTest(TuCitaSeguraUser):
    """Steady load test - simulates normal usage"""
    weight = 3  # 75% of users


class SpikeLoadTest(TuCitaSeguraUser):
    """Spike load test - simulates high traffic"""
    weight = 1  # 25% of users
    wait_time = between(0.5, 2)  # Shorter wait times for spike testing
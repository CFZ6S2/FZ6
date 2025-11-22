"""
Test configuration and sample data for TuCitaSegura testing
"""

# Sample test data for consistent testing
SAMPLE_USERS = [
    {"id": "user_123", "age": 28, "interests": ["music", "travel"], "location": {"lat": 40.7128, "lng": -74.0060}},
    {"id": "user_456", "age": 32, "interests": ["cooking", "sports"], "location": {"lat": 40.7589, "lng": -73.9851}},
    {"id": "user_789", "age": 25, "interests": ["art", "reading"], "location": {"lat": 40.7505, "lng": -73.9934}}
]

SAMPLE_LOCATIONS = [
    {"name": "Café Central", "lat": 40.7128, "lng": -74.0060, "rating": 4.5},
    {"name": "Restaurant Deluxe", "lat": 40.7589, "lng": -73.9851, "rating": 4.8},
    {"name": "Bar Social", "lat": 40.7505, "lng": -73.9934, "rating": 4.2}
]

SAMPLE_MESSAGES = [
    "Hello, how are you today?",
    "Would you like to meet for coffee?",
    "I love your profile!",
    "What are your hobbies?",
    "Nice to meet you!"
]

# Security test patterns
SQL_INJECTION_PATTERNS = [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "'; INSERT INTO users VALUES ('hacker', 'password'); --",
    "UNION SELECT * FROM users--"
]

XSS_PATTERNS = [
    "<script>alert('XSS')</script>",
    "javascript:alert('XSS')",
    "<img src=x onerror=alert('XSS')>",
    "<svg onload=alert('XSS')>"
]

PATH_TRAVERSAL_PATTERNS = [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\config\\sam",
    "/etc/hosts",
    "C:\\Windows\\System32\\drivers\\etc\\hosts"
]

# Load test scenarios
LOAD_TEST_SCENARIOS = {
    "steady_load": {"users": 50, "duration": "300s", "description": "Steady load test"},
    "spike_load": {"users": 200, "duration": "60s", "description": "Spike load test"},
    "stress_load": {"users": 500, "duration": "120s", "description": "Stress load test"}
}

# Monitoring metrics and thresholds
MONITORING_METRICS = [
    "response_time_p95",
    "error_rate",
    "cpu_usage",
    "memory_usage",
    "disk_usage",
    "active_connections"
]

ALERT_THRESHOLDS = {
    "response_time_p95": 1000,  # 1 second
    "error_rate": 0.05,  # 5%
    "cpu_usage": 0.8,  # 80%
    "memory_usage": 0.85,  # 85%
    "disk_usage": 0.9,  # 90%
    "active_connections": 1000
}

# API test configuration
API_TEST_CONFIG = {
    "base_url": "http://localhost:8000",
    "timeout": 30,
    "max_retries": 3,
    "retry_delay": 1.0
}

# Performance test configuration
PERFORMANCE_TEST_CONFIG = {
    "host": "http://localhost:8000",
    "users": 100,
    "spawn_rate": 10,
    "run_time": "60s",
    "rps_target": 50,  # Requests per second target
    "response_time_target": 500,  # Milliseconds
    "error_rate_target": 0.01  # 1% error rate target
}
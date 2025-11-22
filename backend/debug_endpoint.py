#!/usr/bin/env python3
"""
Script para debuggear la respuesta del endpoint de recomendaciones
"""

import requests
import json

def test_recommendations_endpoint():
    print("=== Testing Recommendations Endpoint ===\n")
    
    # Datos de prueba
    payload = {
        "user_id": "test_user_123",
        "preferences": {
            "age_range": [25, 35],
            "distance_km": 50,
            "interests": ["music", "travel", "cooking"]
        },
        "limit": 5
    }
    
    headers = {
        "Authorization": "Bearer test_token_123",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post("http://localhost:8000/api/v1/recommendations", 
                               json=payload, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        try:
            data = response.json()
            print(f"Response JSON: {json.dumps(data, indent=2, ensure_ascii=False)}")
        except Exception as e:
            print(f"Raw Response: {response.text}")
            print(f"Error parsing JSON: {e}")
            
    except Exception as e:
        print(f"Error making request: {e}")

if __name__ == "__main__":
    test_recommendations_endpoint()
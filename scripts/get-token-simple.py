#!/usr/bin/env python3
"""
Simple Firebase ID token generator using service account
Works around API key restrictions
"""
import sys
import json
import time
import jwt
import requests

# Load service account
with open('backend/firebase-credentials.json', 'r') as f:
    service_account = json.load(f)

# Extract values
project_id = service_account['project_id']
private_key = service_account['private_key']
client_email = service_account['client_email']

# Sign in the user with Admin SDK approach
# We'll create a custom token and exchange it

# Step 1: Create custom token (JWT)
now = int(time.time())

# User email from command line or default
user_email = sys.argv[1] if len(sys.argv) > 1 else "lascasitadebarajas@gmail.com"

# Get user by email using REST API
# First, get access token
auth_payload = {
    "iss": client_email,
    "sub": client_email,
    "aud": "https://oauth2.googleapis.com/token",
    "iat": now,
    "exp": now + 3600,
    "scope": "https://www.googleapis.com/auth/firebase"
}

access_token_jwt = jwt.encode(auth_payload, private_key, algorithm='RS256')

# Exchange for access token
token_response = requests.post(
    'https://oauth2.googleapis.com/token',
    data={
        'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion': access_token_jwt
    }
)

if token_response.status_code != 200:
    print(f"❌ Error getting access token: {token_response.text}")
    sys.exit(1)

access_token = token_response.json()['access_token']

# Get user by email
lookup_response = requests.post(
    f'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s',
    headers={
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    },
    json={
        'email': [user_email]
    }
)

if lookup_response.status_code != 200:
    print(f"❌ Error looking up user: {lookup_response.text}")
    sys.exit(1)

users = lookup_response.json().get('users', [])
if not users:
    print(f"❌ User not found: {user_email}")
    sys.exit(1)

user = users[0]
uid = user['localId']

# Create custom token for this user
custom_token_payload = {
    "iss": client_email,
    "sub": client_email,
    "aud": "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
    "iat": now,
    "exp": now + 3600,
    "uid": uid,
    "claims": {}
}

custom_token = jwt.encode(custom_token_payload, private_key, algorithm='RS256')

print(f"✅ Custom token created for {user_email}")
print(f"   UID: {uid}")
print(f"   Email verified: {user.get('emailVerified', False)}")
print()
print("🎫 Custom Token:")
print(custom_token)
print()
print("⚠️  This custom token needs to be exchanged for an ID token via Firebase Auth")
print("   (This would normally happen in the client app)")

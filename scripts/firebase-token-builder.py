#!/usr/bin/env python3
"""
Firebase Token Builder - Generate test tokens for TuCitaSegura backend testing
Author: Claude
Date: 2025-11-27

This script generates Firebase ID tokens for testing the backend API.
It can create tokens with different user roles and custom claims.
"""

import sys
import os
import json
import argparse
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

try:
    import firebase_admin
    from firebase_admin import credentials, auth
except ImportError:
    print("❌ Error: firebase-admin not installed")
    print("Install with: pip install firebase-admin")
    sys.exit(1)


class FirebaseTokenBuilder:
    """Build and manage Firebase test tokens."""

    def __init__(self, credentials_path: Optional[str] = None):
        """
        Initialize Firebase Admin SDK.

        Args:
            credentials_path: Path to Firebase service account JSON
        """
        self.credentials_path = credentials_path or self._find_credentials()

        if not self.credentials_path or not os.path.exists(self.credentials_path):
            raise FileNotFoundError(
                "Firebase credentials not found. "
                "Set FIREBASE_PRIVATE_KEY_PATH or provide credentials_path"
            )

        # Initialize Firebase Admin if not already initialized
        if not firebase_admin._apps:
            cred = credentials.Certificate(self.credentials_path)
            firebase_admin.initialize_app(cred)
            print(f"✅ Firebase Admin initialized from: {self.credentials_path}")

    def _find_credentials(self) -> Optional[str]:
        """Find Firebase credentials in common locations."""
        possible_paths = [
            os.getenv("FIREBASE_PRIVATE_KEY_PATH"),
            os.path.join(os.path.dirname(__file__), '..', 'backend', 'firebase-credentials.json'),
            os.path.join(os.path.dirname(__file__), '..', 'backend', 'serviceAccountKey.json'),
            os.path.join(os.path.dirname(__file__), '..', 'firebase-credentials.json'),
            './firebase-credentials.json',
            './serviceAccountKey.json',
        ]

        for path in possible_paths:
            if path and os.path.exists(path):
                return path

        return None

    def create_test_user(
        self,
        email: str,
        password: str = "TestPassword123!",
        display_name: Optional[str] = None,
        email_verified: bool = True
    ) -> Dict[str, Any]:
        """
        Create a test user in Firebase Auth.

        Args:
            email: User email
            password: User password
            display_name: User display name
            email_verified: Whether email is verified

        Returns:
            User record dict
        """
        try:
            # Try to get existing user
            user = auth.get_user_by_email(email)
            print(f"ℹ️  User already exists: {email}")
            return self._user_record_to_dict(user)

        except auth.UserNotFoundError:
            # Create new user
            user = auth.create_user(
                email=email,
                password=password,
                display_name=display_name or email.split('@')[0],
                email_verified=email_verified
            )
            print(f"✅ Created test user: {email}")
            return self._user_record_to_dict(user)

    def set_custom_claims(
        self,
        uid: str,
        role: str = "regular",
        subscription_tier: Optional[str] = None,
        **extra_claims
    ) -> None:
        """
        Set custom claims for a user.

        Args:
            uid: User ID
            role: User role (regular, admin, concierge)
            subscription_tier: Subscription tier (free, premium, vip)
            **extra_claims: Additional custom claims
        """
        claims = {
            "role": role,
            **({"subscription_tier": subscription_tier} if subscription_tier else {}),
            **extra_claims
        }

        auth.set_custom_user_claims(uid, claims)
        print(f"✅ Set custom claims for {uid}: {claims}")

    def generate_custom_token(
        self,
        uid: str,
        additional_claims: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate a custom token for a user.

        Args:
            uid: User ID
            additional_claims: Additional claims to include

        Returns:
            Custom token (string)
        """
        token = auth.create_custom_token(uid, additional_claims)
        return token.decode('utf-8') if isinstance(token, bytes) else token

    def get_user_token(self, email: str) -> Optional[str]:
        """
        Get ID token for a user (requires user to exist).

        Note: This returns a custom token, not an ID token.
        The client must exchange it for an ID token via signInWithCustomToken.

        Args:
            email: User email

        Returns:
            Custom token or None
        """
        try:
            user = auth.get_user_by_email(email)
            token = self.generate_custom_token(user.uid)
            return token
        except auth.UserNotFoundError:
            print(f"❌ User not found: {email}")
            return None

    def _user_record_to_dict(self, user_record) -> Dict[str, Any]:
        """Convert UserRecord to dict."""
        return {
            "uid": user_record.uid,
            "email": user_record.email,
            "email_verified": user_record.email_verified,
            "display_name": user_record.display_name,
            "disabled": user_record.disabled,
            "custom_claims": user_record.custom_claims or {},
        }

    def list_users(self, max_results: int = 10) -> None:
        """List users in Firebase Auth."""
        page = auth.list_users(max_results=max_results)

        print(f"\n{'UID':<30} {'Email':<30} {'Role':<15} {'Verified'}")
        print("-" * 85)

        for user in page.users:
            role = (user.custom_claims or {}).get('role', 'regular')
            print(f"{user.uid:<30} {user.email:<30} {role:<15} {user.email_verified}")

    def delete_test_user(self, email: str) -> bool:
        """
        Delete a test user.

        Args:
            email: User email

        Returns:
            True if deleted, False otherwise
        """
        try:
            user = auth.get_user_by_email(email)
            auth.delete_user(user.uid)
            print(f"✅ Deleted user: {email}")
            return True
        except auth.UserNotFoundError:
            print(f"❌ User not found: {email}")
            return False


def main():
    """Main CLI interface."""
    parser = argparse.ArgumentParser(
        description="Firebase Token Builder for TuCitaSegura",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Create a regular test user
  %(prog)s create-user test@example.com

  # Create an admin user
  %(prog)s create-user admin@example.com --role admin

  # Generate custom token for user
  %(prog)s generate-token test@example.com

  # Set custom claims
  %(prog)s set-claims test@example.com --role premium --tier vip

  # List all users
  %(prog)s list-users

  # Delete test user
  %(prog)s delete-user test@example.com
        """
    )

    parser.add_argument(
        '--credentials',
        help='Path to Firebase service account JSON',
        default=None
    )

    subparsers = parser.add_subparsers(dest='command', help='Command to execute')

    # Create user command
    create_parser = subparsers.add_parser('create-user', help='Create test user')
    create_parser.add_argument('email', help='User email')
    create_parser.add_argument('--password', default='TestPassword123!', help='User password')
    create_parser.add_argument('--name', help='Display name')
    create_parser.add_argument('--role', default='regular', choices=['regular', 'admin', 'concierge'])
    create_parser.add_argument('--tier', choices=['free', 'premium', 'vip'])
    create_parser.add_argument('--no-verify', action='store_true', help='Do not verify email')

    # Generate token command
    token_parser = subparsers.add_parser('generate-token', help='Generate custom token')
    token_parser.add_argument('email', help='User email')

    # Set claims command
    claims_parser = subparsers.add_parser('set-claims', help='Set custom claims')
    claims_parser.add_argument('email', help='User email')
    claims_parser.add_argument('--role', choices=['regular', 'admin', 'concierge'])
    claims_parser.add_argument('--tier', choices=['free', 'premium', 'vip'])

    # List users command
    list_parser = subparsers.add_parser('list-users', help='List users')
    list_parser.add_argument('--max', type=int, default=10, help='Max results')

    # Delete user command
    delete_parser = subparsers.add_parser('delete-user', help='Delete test user')
    delete_parser.add_argument('email', help='User email')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    try:
        builder = FirebaseTokenBuilder(args.credentials)

        if args.command == 'create-user':
            user = builder.create_test_user(
                email=args.email,
                password=args.password,
                display_name=args.name,
                email_verified=not args.no_verify
            )

            # Set custom claims if provided
            if args.role != 'regular' or args.tier:
                builder.set_custom_claims(
                    user['uid'],
                    role=args.role,
                    subscription_tier=args.tier
                )

            print(f"\n✅ User created successfully!")
            print(f"   UID: {user['uid']}")
            print(f"   Email: {user['email']}")
            print(f"   Password: {args.password}")

        elif args.command == 'generate-token':
            token = builder.get_user_token(args.email)
            if token:
                print(f"\n✅ Custom token generated:")
                print(f"\n{token}\n")
                print("⚠️  Note: This is a CUSTOM token, not an ID token.")
                print("   Exchange it via Firebase Auth signInWithCustomToken() to get an ID token.")

        elif args.command == 'set-claims':
            user = auth.get_user_by_email(args.email)
            builder.set_custom_claims(
                user.uid,
                role=args.role or 'regular',
                subscription_tier=args.tier
            )

        elif args.command == 'list-users':
            builder.list_users(args.max)

        elif args.command == 'delete-user':
            builder.delete_test_user(args.email)

    except FileNotFoundError as e:
        print(f"❌ {e}")
        print("\nTo fix:")
        print("1. Download Firebase service account JSON from:")
        print("   https://console.firebase.google.com/project/tuscitasseguras-2d1a6/settings/serviceaccounts/adminsdk")
        print("2. Save as: backend/firebase-credentials.json")
        print("3. Or set: FIREBASE_PRIVATE_KEY_PATH=path/to/credentials.json")
        sys.exit(1)

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

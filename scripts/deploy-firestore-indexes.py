#!/usr/bin/env python3
"""
Deploy Firestore indexes using Firebase Admin SDK
"""

import json
import sys
from pathlib import Path

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    from google.cloud import firestore_admin_v1
    from google.api_core import exceptions
except ImportError:
    print("❌ Error: Firebase Admin SDK not installed")
    print("Run: pip install firebase-admin google-cloud-firestore")
    sys.exit(1)

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
CREDENTIALS_PATH = PROJECT_ROOT / "backend" / "firebase-credentials.json"
INDEXES_PATH = PROJECT_ROOT / "firestore.indexes.json"

def load_credentials():
    """Load Firebase service account credentials"""
    if not CREDENTIALS_PATH.exists():
        print(f"❌ Error: Credentials file not found at {CREDENTIALS_PATH}")
        sys.exit(1)

    with open(CREDENTIALS_PATH) as f:
        creds_data = json.load(f)

    return creds_data

def load_indexes():
    """Load Firestore indexes configuration"""
    if not INDEXES_PATH.exists():
        print(f"❌ Error: Indexes file not found at {INDEXES_PATH}")
        sys.exit(1)

    with open(INDEXES_PATH) as f:
        indexes_data = json.load(f)

    return indexes_data.get('indexes', [])

def create_index(client, project_id, index_config):
    """Create a single Firestore index"""
    collection_group = index_config['collectionGroup']
    query_scope = index_config.get('queryScope', 'COLLECTION')
    fields = index_config['fields']

    # Build field list for display
    field_names = []
    for field in fields:
        field_path = field['fieldPath']
        if 'arrayConfig' in field:
            field_names.append(f"{field_path} (array-contains)")
        elif 'order' in field:
            order = field['order']
            field_names.append(f"{field_path} ({order})")

    field_str = ", ".join(field_names)

    try:
        # Convert to Firestore Admin API format
        parent = f"projects/{project_id}/databases/(default)/collectionGroups/{collection_group}"

        # Build index fields
        api_fields = []
        for field in fields:
            field_obj = firestore_admin_v1.types.Index.IndexField()
            field_obj.field_path = field['fieldPath']

            if 'arrayConfig' in field:
                if field['arrayConfig'] == 'CONTAINS':
                    field_obj.array_config = firestore_admin_v1.types.Index.IndexField.ArrayConfig.CONTAINS
            elif 'order' in field:
                if field['order'] == 'ASCENDING':
                    field_obj.order = firestore_admin_v1.types.Index.IndexField.Order.ASCENDING
                elif field['order'] == 'DESCENDING':
                    field_obj.order = firestore_admin_v1.types.Index.IndexField.Order.DESCENDING

            api_fields.append(field_obj)

        # Create index object
        index = firestore_admin_v1.types.Index()
        index.query_scope = firestore_admin_v1.types.Index.QueryScope.COLLECTION if query_scope == 'COLLECTION' else firestore_admin_v1.types.Index.QueryScope.COLLECTION_GROUP
        index.fields = api_fields

        # Create the index
        operation = client.create_index(parent=parent, index=index)

        print(f"✅ Creating index: {collection_group} [{field_str}]")
        return True

    except exceptions.AlreadyExists:
        print(f"⏭️  Index already exists: {collection_group} [{field_str}]")
        return True
    except Exception as e:
        print(f"❌ Failed to create index {collection_group} [{field_str}]: {e}")
        return False

def main():
    """Main function to deploy all indexes"""
    print("🚀 Starting Firestore Indexes Deployment\n")

    # Load credentials
    print("📋 Loading credentials...")
    creds_data = load_credentials()
    project_id = creds_data.get('project_id')
    print(f"   Project: {project_id}\n")

    # Initialize Firebase Admin
    print("🔐 Initializing Firebase Admin SDK...")
    try:
        cred = credentials.Certificate(str(CREDENTIALS_PATH))
        firebase_admin.initialize_app(cred)
        print("   ✅ Firebase Admin initialized\n")
    except ValueError:
        # Already initialized
        print("   ℹ️  Firebase Admin already initialized\n")

    # Create Firestore Admin client
    print("📦 Creating Firestore Admin client...")
    client = firestore_admin_v1.FirestoreAdminClient.from_service_account_json(
        str(CREDENTIALS_PATH)
    )
    print("   ✅ Client created\n")

    # Load indexes
    print("📄 Loading index definitions...")
    indexes = load_indexes()
    print(f"   Found {len(indexes)} indexes to deploy\n")

    # Create indexes
    print("🔨 Creating indexes...\n")
    success_count = 0
    skip_count = 0
    fail_count = 0

    for i, index_config in enumerate(indexes, 1):
        print(f"[{i}/{len(indexes)}] ", end="")
        result = create_index(client, project_id, index_config)

        if result:
            if "already exists" in str(result):
                skip_count += 1
            else:
                success_count += 1
        else:
            fail_count += 1

    # Summary
    print("\n" + "="*60)
    print("📊 Deployment Summary")
    print("="*60)
    print(f"✅ Successfully created: {success_count}")
    print(f"⏭️  Already existed: {skip_count}")
    print(f"❌ Failed: {fail_count}")
    print(f"📝 Total: {len(indexes)}")
    print("="*60)

    if fail_count > 0:
        print("\n⚠️  Some indexes failed to create. Check the errors above.")
        sys.exit(1)
    else:
        print("\n🎉 All indexes deployed successfully!")
        print("\nℹ️  Note: Indexes are building in the background.")
        print("   Check status at: https://console.firebase.google.com/project/{}/firestore/indexes".format(project_id))

if __name__ == "__main__":
    main()

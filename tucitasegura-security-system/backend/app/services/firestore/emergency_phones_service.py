from firebase_admin import firestore
class EmergencyPhoneService:
    def __init__(self): self.db = firestore.client()
    async def save_phone(self, uid, phone):
        self.db.collection('users').document(uid).collection('private_info').document('contact').set({'phone': phone}, merge=True)
    async def get_phone(self, uid):
        doc = self.db.collection('users').document(uid).collection('private_info').document('contact').get()
        return doc.to_dict().get('phone') if doc.exists else None

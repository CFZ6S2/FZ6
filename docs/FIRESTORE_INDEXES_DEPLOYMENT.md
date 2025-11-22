# 🔍 Firestore Indexes Deployment Guide

## Overview
This guide explains how to deploy the Firestore indexes to production.

## Prerequisites
- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project configured
- Authenticated with Firebase: `firebase login`

## Deployment Steps

### 1. Deploy Indexes
```bash
# Deploy only Firestore indexes
firebase deploy --only firestore:indexes

# Or deploy indexes and rules together
firebase deploy --only firestore
```

### 2. Verify Deployment
After deployment, indexes will start building. This can take several minutes to hours depending on data volume.

Check status:
1. Go to Firebase Console
2. Navigate to Firestore Database
3. Click on "Indexes" tab
4. Verify all 23 indexes are listed

### 3. Monitor Index Building
```bash
# Check Firebase console for build status
# Indexes show as "Building" → "Enabled"
```

## Deployed Indexes (23 Total)

### Core Collections
1. **conversations** - participants (CONTAINS) + lastMessageTime (DESC)
2. **messages** - conversationId (ASC) + timestamp (ASC)

### Matches
3. **matches** - receiverId (ASC) + status (ASC) + createdAt (DESC)
4. **matches** - senderId (ASC) + status (ASC) + createdAt (DESC)

### VIP Events
5. **vip_events** - status (ASC) + eventDate (ASC)
6. **vip_applications** - eventId (ASC) + status (ASC) + createdAt (DESC)

### Users
7. **users** - gender (ASC) + isOnline (DESC) + lastActivity (DESC)
8. **users** - gender (ASC) + city (ASC) + lastActivity (DESC)

### Security Logs
9. **security_logs** - severity (ASC) + timestamp (DESC)
10. **security_logs** - event_type (ASC) + timestamp (DESC)
11. **security_logs** - user_id (ASC) + timestamp (DESC)

### Subscriptions
12. **subscriptions** - userId (ASC) + status (ASC) + createdAt (DESC)
13. **subscriptions** - status (ASC) + endDate (ASC)

### Insurances
14. **insurances** - userId (ASC) + status (ASC) + createdAt (DESC)

### SOS Alerts
15. **sos_alerts** - status (ASC) + createdAt (DESC)
16. **sos_alerts** - userId (ASC) + createdAt (DESC)

### Reports
17. **reports** - status (ASC) + createdAt (DESC)
18. **reports** - reporterId (ASC) + createdAt (DESC)

### Appointments
19. **appointments** - participants (CONTAINS) + status (ASC) + scheduledTime (ASC)

### Notifications
20. **notifications** - userId (ASC) + read (ASC) + createdAt (DESC)

### Referrals
21. **referrals** - referrerId (ASC) + status (ASC) + createdAt (DESC)

### Analytics
22. **analytics_events** - userId (ASC) + event_type (ASC) + timestamp (DESC)

## Benefits

### Performance Improvements
- **10-100x faster queries** for filtered and sorted data
- No full collection scans
- Reduced latency for user searches

### Cost Optimization
- Fewer document reads
- More efficient queries
- Lower Firestore costs

### Use Cases Optimized
- Search users by gender + location + activity
- Filter matches by status for specific users
- Analyze security logs by severity/type
- Track subscriptions by user and status
- Monitor SOS alerts by status
- Query notifications by read status

## Troubleshooting

### Index Build Failed
- Check Firebase Console for error details
- Verify field names match your schema
- Ensure no conflicting indexes exist

### Query Still Slow
- Verify index is "Enabled" (not "Building")
- Check query uses indexed fields
- Review query complexity

### Index Not Used
- Ensure query matches index exactly (fields + order)
- Check for WHERE clauses on non-indexed fields
- Verify arrayConfig matches query type

## Notes
- Indexes are created asynchronously
- Large collections may take hours to index
- Indexes consume storage (minimal impact)
- Maximum 200 composite indexes per project

## Next Steps After Deployment
1. Monitor index build status in Firebase Console
2. Test query performance in production
3. Add more indexes if new query patterns emerge
4. Review index usage in Firebase Console analytics

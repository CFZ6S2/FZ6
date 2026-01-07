import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';


/**
 * Sends metrics to Firestore 'web_vitals' collection.
 */
function sendToFirestore(metric) {
  // Basic context
  const data = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
    delta: metric.delta,
    id: metric.id, // unique ID for this metric instance
    navigationType: metric.navigationType,

    path: window.location.pathname,
    timestamp: new Date(), // Use client timestamp to avoid importing Firestore SDK eagerly
    ua: navigator.userAgent,
    screenWidth: window.screen.width,
    connection: navigator.connection ? navigator.connection.effectiveType : 'unknown'
  };

  // Log to console in DEV
  if (import.meta.env.DEV || localStorage.getItem('debug_vitals')) {
    console.log(`[Web Vital] ${metric.name}:`, metric.value, metric);
  }

  // Send to Firestore (fire & forget) with Lazy Loading
  // This prevents blocking main thread or bloating initial bundle
  try {
    // Dynamically import needed modules only when a metric is ready
    Promise.all([
      import('./firebase-config-env.js'),
      import('firebase/firestore')
    ]).then(async ([{ getDb }, { collection, addDoc }]) => {
      const db = await getDb();
      const colRef = collection(db, 'web_vitals');
      addDoc(colRef, data).catch(err => {
        if (import.meta.env.DEV) console.error('Error sending vital to FS:', err);
      });
    }).catch(e => {
      if (import.meta.env.DEV) console.error('Error lazy loading inputs:', e);
    });
  } catch (e) {
    if (import.meta.env.DEV) console.error('Exception sending vital:', e);
  }
}

// Track metrics
onCLS(sendToFirestore);
onFCP(sendToFirestore);
onINP(sendToFirestore);
onLCP(sendToFirestore);
onTTFB(sendToFirestore);

#!/usr/bin/env ts-node

/**
 * Manually trigger a research request for testing
 */

const admin = require('firebase-admin');

if (!admin.apps || admin.apps.length === 0) {
  const serviceAccount = require('../firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const ticker = process.argv[2] || 'TSLA';
const assetType = process.argv[3] || 'stock';

const db = admin.firestore();

const trigger = {
  ticker,
  assetType,
  status: 'pending',
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  requestedBy: 'manual-test',
  priority: 1
};

db.collection('ResearchTriggers').add(trigger)
  .then((docRef: any) => {
    console.log('✅ Created research trigger:', docRef.id);
    console.log('Ticker:', ticker);
    console.log('Asset Type:', assetType);
    console.log('\n⏳ Monitor service will pick this up automatically...');
    process.exit(0);
  })
  .catch((err: any) => {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  });

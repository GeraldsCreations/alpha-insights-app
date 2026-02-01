const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkCustomRequests() {
  console.log('Checking custom_report_requests...');
  const snapshot = await db.collection('custom_report_requests').orderBy('createdAt', 'desc').limit(5).get();
  
  if (snapshot.empty) {
    console.log('❌ No custom_report_requests found');
  } else {
    console.log(`✅ Found ${snapshot.size} custom_report_requests:`);
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`\n  ID: ${doc.id}`);
      console.log(`  Ticker: ${data.ticker}`);
      console.log(`  Status: ${data.status}`);
      console.log(`  Created: ${data.createdAt?.toDate()}`);
      console.log(`  User: ${data.userId}`);
    });
  }
  
  console.log('\nChecking research_triggers...');
  const triggersSnapshot = await db.collection('research_triggers').orderBy('createdAt', 'desc').limit(5).get();
  
  if (triggersSnapshot.empty) {
    console.log('❌ No research_triggers found');
  } else {
    console.log(`✅ Found ${triggersSnapshot.size} research_triggers:`);
    triggersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`\n  ID: ${doc.id}`);
      console.log(`  Ticker: ${data.ticker}`);
      console.log(`  Status: ${data.status}`);
      console.log(`  Created: ${data.createdAt?.toDate()}`);
    });
  }
  
  console.log('\nChecking users...');
  const usersSnapshot = await db.collection('users').limit(3).get();
  
  if (usersSnapshot.empty) {
    console.log('❌ No users found');
  } else {
    console.log(`✅ Found ${usersSnapshot.size} users:`);
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`\n  ID: ${doc.id}`);
      console.log(`  Email: ${data.email}`);
      console.log(`  Plan: ${data.plan}`);
      console.log(`  Quota: ${data.customReportsRemaining}`);
    });
  }
  
  process.exit(0);
}

checkCustomRequests().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

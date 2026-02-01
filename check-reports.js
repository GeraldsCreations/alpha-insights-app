const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkReports() {
  console.log('Checking research_reports...');
  const snapshot = await db.collection('research_reports').orderBy('createdAt', 'desc').limit(5).get();
  
  if (snapshot.empty) {
    console.log('❌ No research_reports found');
  } else {
    console.log(`✅ Found ${snapshot.size} research_reports:\n`);
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  📊 Report ID: ${doc.id}`);
      console.log(`     Ticker: ${data.ticker}`);
      console.log(`     Title: ${data.title}`);
      console.log(`     Recommendation: ${data.recommendation}`);
      console.log(`     Confidence: ${data.confidenceLevel}/10`);
      console.log(`     Entry: $${data.entry}`);
      console.log(`     Target: $${data.target}`);
      console.log(`     Stop: $${data.stop}`);
      console.log(`     Created: ${data.createdAt?.toDate()}`);
      console.log(`     Views: ${data.views}`);
      console.log('');
    });
  }
  
  process.exit(0);
}

checkReports().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

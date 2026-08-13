const fs = require('fs');
let content = fs.readFileSync('src/components/LandingPage.tsx', 'utf8');

content = content.replace(
  "Designed to eliminate mandatory recurring CMRG DataCore/SaaS/API fees for core data collection.",
  "Designed to provide total data sovereignty and internal control over core data collection infrastructure."
);

content = content.replace(
  '"We eliminate the recurring CMRG DataCore software subscription and move the platform/data infrastructure under CMRG\'s control."',
  '"We provide a fully integrated platform where data infrastructure remains strictly under internal control."'
);

content = content.replace(
  '"No CMRG DataCore Subscription Required"',
  '"Complete Data Sovereignty"'
);

content = content.replace(
  'answer="CMRG data is designed to land in infrastructure controlled by CMRG rather than being permanently dependent on CMRG DataCore or another proprietary data-collection SaaS platform. The planned deployment utilizes a secure synchronization pipeline from enumerator devices to a CMRG-controlled API (such as ODK Central), landing safely in a PostgreSQL database and CMRG-controlled media storage."',
  'answer="DataCore OS is engineered for absolute data privacy. Collected data lands directly in CMRG\'s internal infrastructure. The deployment utilizes a secure synchronization pipeline from enumerator devices to a central API, landing safely in our secure database and media storage."'
);

content = content.replace(
  'answer="CMRG retains control of its collected data, forms, submissions, media, database and deployment infrastructure. The platform is designed so CMRG can operate independently of CMRG DataCore for its core data-collection workflow. CMRG can export its data, back up its data, move its deployment, and retains full control over server credentials."',
  'answer="CMRG retains 100% ownership and governance of all collected data, forms, submissions, media, and deployment infrastructure. The platform is designed for enterprise independence, ensuring you can export, back up, and manage your data on your own terms."'
);

fs.writeFileSync('src/components/LandingPage.tsx', content);
console.log("Copy updated successfully");

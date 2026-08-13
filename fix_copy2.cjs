const fs = require('fs');
let content = fs.readFileSync('src/components/LandingPage.tsx', 'utf8');

content = content.replace(
  "The system is designed around open standards and self-hosted components to avoid mandatory recurring SaaS/API fees for core data collection.",
  "The system is engineered around robust open standards and self-hosted components to provide enterprise-grade reliability and security."
);

content = content.replace(
  "*CMRG controls the application and data infrastructure. The core platform is designed without mandatory recurring SaaS/software/API subscription fees. Infrastructure, internet, domain, hardware, hosting, maintenance and optional third-party services may have separate costs.",
  "*CMRG completely owns the application and data infrastructure. This ensures long-term operational stability, stringent data privacy, and full architectural flexibility."
);

content = content.replace(
  'answer="CMRG wants greater control over its data-collection infrastructure, workflows, data ownership, deployment and long-term operating costs. The platform is being designed around open standards and self-hosted infrastructure so CMRG is not permanently dependent on a proprietary SaaS subscription for core field data collection."',
  'answer="DataCore OS was engineered to provide CMRG with ultimate control over its data-collection infrastructure, workflows, data ownership, and security. By utilizing open standards and internal infrastructure, the platform guarantees full operational independence and data sovereignty."'
);

fs.writeFileSync('src/components/LandingPage.tsx', content);
console.log("Cleaned up remaining text!");

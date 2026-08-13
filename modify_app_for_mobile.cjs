const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('MobileLayout')) {
  content = content.replace(
    "import DashboardLayout from './components/dashboard/DashboardLayout';",
    "import DashboardLayout from './components/dashboard/DashboardLayout';\nimport MobileLayout from './components/mobile/MobileLayout';"
  );

  content = content.replace(
    'return <DashboardLayout currentView={currentView} setCurrentView={setCurrentView} user={user} />;',
    `if (currentView.startsWith('mobile-')) {
    return <MobileLayout currentView={currentView} setCurrentView={setCurrentView} />;
  }
  
  return <DashboardLayout currentView={currentView} setCurrentView={setCurrentView} user={user} />;`
  );

  fs.writeFileSync('src/App.tsx', content);
  console.log("App.tsx updated for MobileLayout");
}

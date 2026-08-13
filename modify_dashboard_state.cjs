const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/DashboardLayout.tsx', 'utf8');

if (!content.includes('selectedFormId')) {
  content = content.replace(
    'import FormBuilderView from \'./FormBuilderView\';',
    'import FormBuilderView from \'./FormBuilderView\';\nimport FormRendererView from \'./FormRendererView\';\nimport { useState } from \'react\';'
  );

  content = content.replace(
    'export default function DashboardLayout({',
    'export default function DashboardLayout({'
  );

  content = content.replace(
    '  const navItems = [',
    '  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);\n\n  const navItems = ['
  );

  content = content.replace(
    '{currentView === \'forms\' && <FormsView setCurrentView={setCurrentView} />}',
    '{currentView === \'forms\' && <FormsView setCurrentView={setCurrentView} onTestForm={(id) => { setSelectedFormId(id); setCurrentView("form-renderer" as ViewState); }} />}\n           {currentView === \'form-renderer\' && <FormRendererView formId={selectedFormId} setCurrentView={setCurrentView} />}'
  );

  fs.writeFileSync('src/components/dashboard/DashboardLayout.tsx', content);
  console.log("DashboardLayout updated with selectedFormId and renderer");
}

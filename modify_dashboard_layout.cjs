const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/DashboardLayout.tsx', 'utf8');

// Add import for FormBuilderView
if (!content.includes('FormBuilderView')) {
  content = content.replace(
    "import FormsView from './FormsView';",
    "import FormsView from './FormsView';\nimport FormBuilderView from './FormBuilderView';"
  );
}

// Add route logic for form-builder
if (!content.includes("currentView === 'form-builder'")) {
  content = content.replace(
    "{currentView === 'forms' && <FormsView />}",
    "{currentView === 'forms' && <FormsView setCurrentView={setCurrentView} />}\n           {currentView === 'form-builder' && <FormBuilderView setCurrentView={setCurrentView} />}"
  );
  
  // Exclude form-builder from "coming soon"
  content = content.replace(
    "currentView !== 'dashboard' && currentView !== 'forms' &&",
    "currentView !== 'dashboard' && currentView !== 'forms' && currentView !== 'form-builder' &&"
  );
}

fs.writeFileSync('src/components/dashboard/DashboardLayout.tsx', content);
console.log("DashboardLayout updated");

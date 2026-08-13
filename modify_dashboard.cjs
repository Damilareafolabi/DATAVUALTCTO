const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/DashboardLayout.tsx', 'utf8');

// Add imports
if (!content.includes('import ProjectsView')) {
  const importStatement = `import DashboardView from './DashboardView';
import FormsView from './FormsView';
import FormBuilderView from './FormBuilderView';
import FormRendererView from './FormRendererView';
import SubmissionsView from './SubmissionsView';
import ReportsView from './ReportsView';
import ProjectsView from './ProjectsView';
import UsersView from './UsersView';
import DataQualityView from './DataQualityView';
import ExportsView from './ExportsView';
import SettingsView from './SettingsView';
import AssignmentsView from './AssignmentsView';`;
  
  // Replace the old imports (if they exist) or just prepend it after react and lucide imports
  content = content.replace(/import DashboardView from '\.\/DashboardView';\nimport FormsView from '\.\/FormsView';\nimport FormBuilderView from '\.\/FormBuilderView';\nimport FormRendererView from '\.\/FormRendererView';/g, importStatement);
}

// Ensure the switch statements exist in the main tag
const mainContentOld = `<main className="flex-1 overflow-auto p-6">
           {currentView === 'dashboard' && <DashboardView />}
           {currentView === 'forms' && <FormsView setCurrentView={setCurrentView} onTestForm={(id) => { setSelectedFormId(id); setCurrentView("form-renderer" as ViewState); }} />}
           {currentView === 'form-renderer' && <FormRendererView formId={selectedFormId} setCurrentView={setCurrentView} />}
           {currentView === 'form-builder' && <FormBuilderView setCurrentView={setCurrentView} />}
           
           {currentView !== 'dashboard' && currentView !== 'forms' && currentView !== 'form-builder' && (`;

const mainContentNew = `<main className="flex-1 overflow-auto p-6">
           {currentView === 'dashboard' && <DashboardView />}
           {currentView === 'forms' && <FormsView setCurrentView={setCurrentView} onTestForm={(id) => { setSelectedFormId(id); setCurrentView("form-renderer" as ViewState); }} />}
           {currentView === 'form-renderer' && <FormRendererView formId={selectedFormId} setCurrentView={setCurrentView} />}
           {currentView === 'form-builder' && <FormBuilderView setCurrentView={setCurrentView} />}
           {currentView === 'submissions' && <SubmissionsView />}
           {currentView === 'reports' && <ReportsView />}
           {currentView === 'projects' && <ProjectsView />}
           {currentView === 'users' && <UsersView />}
           {currentView === 'data-quality' && <DataQualityView />}
           {currentView === 'exports' && <ExportsView />}
           {currentView === 'settings' && <SettingsView onLogout={onLogout} />}
           {currentView === 'assignments' && <AssignmentsView />}
           
           {currentView !== 'dashboard' && currentView !== 'forms' && currentView !== 'form-builder' && currentView !== 'form-renderer' && currentView !== 'submissions' && currentView !== 'reports' && currentView !== 'projects' && currentView !== 'users' && currentView !== 'data-quality' && currentView !== 'exports' && currentView !== 'settings' && currentView !== 'assignments' && (`;

content = content.replace(mainContentOld, mainContentNew);

fs.writeFileSync('src/components/dashboard/DashboardLayout.tsx', content);
console.log("DashboardLayout updated successfully");

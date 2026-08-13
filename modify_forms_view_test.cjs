const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/FormsView.tsx', 'utf8');

if (!content.includes('onTestForm?:')) {
  content = content.replace(
    'export default function FormsView({ setCurrentView }: { setCurrentView: (view: ViewState) => void }) {',
    'export default function FormsView({ setCurrentView, onTestForm }: { setCurrentView: (view: ViewState) => void, onTestForm?: (id: string) => void }) {'
  );

  content = content.replace(
    '<button className="p-1.5 text-slate-400 hover:text-red-600 transition-colors" title="Test Form"><Play className="w-4 h-4" /></button>',
    '<button onClick={() => onTestForm && onTestForm(form.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors" title="Test Form"><Play className="w-4 h-4" /></button>'
  );

  fs.writeFileSync('src/components/dashboard/FormsView.tsx', content);
  console.log("FormsView updated with onTestForm");
}

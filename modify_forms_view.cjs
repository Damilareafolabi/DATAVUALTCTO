const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/FormsView.tsx', 'utf8');

if (!content.includes('FormsView({ setCurrentView })')) {
  content = content.replace(
    'export default function FormsView() {',
    'import { ViewState } from "../../types";\n\nexport default function FormsView({ setCurrentView }: { setCurrentView: (view: ViewState) => void }) {'
  );

  content = content.replace(
    '<button className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm shadow-red-600/20">',
    '<button onClick={() => setCurrentView("form-builder")} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm shadow-red-600/20">'
  );
}

fs.writeFileSync('src/components/dashboard/FormsView.tsx', content);
console.log("FormsView updated");

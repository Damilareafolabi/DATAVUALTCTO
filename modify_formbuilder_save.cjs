const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/FormBuilderView.tsx', 'utf8');

if (!content.includes('import { db, auth } from')) {
  content = content.replace(
    "import { ViewState, FormField, FieldType } from '../../types';",
    "import { ViewState, FormField, FieldType } from '../../types';\nimport { collection, addDoc, serverTimestamp } from 'firebase/firestore';\nimport { db, auth } from '../../lib/firebase';"
  );

  content = content.replace(
    "const [formTitle, setFormTitle] = useState('Untitled Form');",
    "const [formTitle, setFormTitle] = useState('Untitled Form');\n  const [isSaving, setIsSaving] = useState(false);"
  );

  const saveFunction = `
  const saveForm = async () => {
    if (!auth.currentUser) {
      alert("You must be logged in to save.");
      return;
    }
    if (fields.length === 0) {
      alert("Please add at least one field to your form.");
      return;
    }
    
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'forms'), {
        title: formTitle,
        description: '',
        status: 'Draft',
        fields,
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        version: 1
      });
      setIsSaving(false);
      setCurrentView('forms');
    } catch (error: any) {
      setIsSaving(false);
      console.error("Error saving form:", error);
      alert("Failed to save form: " + error.message);
    }
  };
  `;

  content = content.replace(
    "const addField = (type: FieldType) => {",
    saveFunction + "\n  const addField = (type: FieldType) => {"
  );

  content = content.replace(
    '<button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-bold text-sm rounded-lg hover:bg-red-700 transition-colors shadow-sm shadow-red-600/20">',
    '<button onClick={saveForm} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-bold text-sm rounded-lg hover:bg-red-700 transition-colors shadow-sm shadow-red-600/20 disabled:opacity-70">'
  );
  
  content = content.replace(
    '<Save className="w-4 h-4" /> Save Form',
    '{isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save className="w-4 h-4" />} {isSaving ? "Saving..." : "Save Form"}'
  );
}

fs.writeFileSync('src/components/dashboard/FormBuilderView.tsx', content);
console.log("FormBuilderView save updated");

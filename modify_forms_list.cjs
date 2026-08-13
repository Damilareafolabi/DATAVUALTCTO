const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/FormsView.tsx', 'utf8');

if (!content.includes('collection, query, orderBy, onSnapshot')) {
  content = content.replace(
    'import { FileText, Plus, Settings2, Trash2, Edit, Play } from \'lucide-react\';',
    'import { FileText, Plus, Settings2, Trash2, Edit, Play } from \'lucide-react\';\nimport { useState, useEffect } from \'react\';\nimport { collection, query, orderBy, onSnapshot, deleteDoc, doc } from \'firebase/firestore\';\nimport { db } from \'../../lib/firebase\';'
  );

  content = content.replace(
    'const forms = [',
    'const [forms, setForms] = useState<any[]>([]);\n  const [isLoading, setIsLoading] = useState(true);\n\n  useEffect(() => {\n    const q = query(collection(db, "forms"), orderBy("createdAt", "desc"));\n    const unsubscribe = onSnapshot(q, (snapshot) => {\n      const formsData = snapshot.docs.map(doc => ({\n        id: doc.id,\n        ...doc.data()\n      }));\n      setForms(formsData);\n      setIsLoading(false);\n    });\n    return () => unsubscribe();\n  }, []);\n\n  const handleDelete = async (id: string) => {\n    if (confirm("Are you sure you want to delete this form?")) {\n      await deleteDoc(doc(db, "forms", id));\n    }\n  };\n\n  const mockForms = ['
  );

  content = content.replace(
    '{forms.map((form) => (',
    '{isLoading ? <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading forms...</td></tr> : forms.length === 0 ? <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No forms found. Build a new form to get started.</td></tr> : forms.map((form) => ('
  );

  content = content.replace(
    '<div className="text-xs text-slate-500 font-medium">{form.id}</div>',
    '<div className="text-xs text-slate-500 font-medium">{form.id.substring(0,8)}...</div>'
  );
  
  content = content.replace(
    '<td className="px-6 py-4 font-medium">{form.submissions.toLocaleString()}</td>',
    '<td className="px-6 py-4 font-medium">{form.submissions || 0}</td>'
  );

  content = content.replace(
    '<td className="px-6 py-4 text-slate-500 text-xs">{form.lastUpdated}</td>',
    '<td className="px-6 py-4 text-slate-500 text-xs">{form.createdAt?.toDate ? new Date(form.createdAt.toDate()).toLocaleDateString() : "Just now"}</td>'
  );

  content = content.replace(
    '<button className="p-1.5 text-slate-400 hover:text-red-600 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>',
    '<button onClick={() => handleDelete(form.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>'
  );

  content = content.replace(
    '<span>Showing 1 to 5 of 28 forms</span>',
    '<span>Showing {forms.length} forms</span>'
  );
}

fs.writeFileSync('src/components/dashboard/FormsView.tsx', content);
console.log("FormsView mapped to Firebase");

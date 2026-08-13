const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/DashboardLayout.tsx', 'utf8');

if (!content.includes('Smartphone')) {
  content = content.replace(
    "import { LayoutDashboard, Briefcase, FileText, Users, Inbox, BarChart2, CheckSquare, ShieldCheck, Download, Settings, LogOut, Bell, Search, Menu, ChevronDown } from 'lucide-react';",
    "import { LayoutDashboard, Briefcase, FileText, Users, Inbox, BarChart2, CheckSquare, ShieldCheck, Download, Settings, LogOut, Bell, Search, Menu, ChevronDown, Smartphone } from 'lucide-react';"
  );
  
  content = content.replace(
    "{ id: 'settings', label: 'Settings', icon: Settings },",
    "{ id: 'settings', label: 'Settings', icon: Settings },\n    { id: 'mobile-dashboard', label: 'Mobile App', icon: Smartphone },"
  );

  fs.writeFileSync('src/components/dashboard/DashboardLayout.tsx', content);
  console.log("DashboardLayout updated with Mobile App link");
}

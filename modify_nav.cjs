const fs = require('fs');
let content = fs.readFileSync('src/components/LandingPage.tsx', 'utf8');

// Replace NavDropdown definition
const oldNavDropdown = /const NavDropdown = \(\{ title, items, wide \}: \{ title: string, items: \{ label: string, desc\?: string, category\?: string \}\[\], wide\?: boolean \}\) => \{[\s\S]*?return \([\s\S]*?<div className="relative group">[\s\S]*?<\/div>\s*\);\s*\};/;

const newNavDropdown = `const NavDropdown = ({ title, items, wide, cols }: { title: string, items: { label: string, desc?: string, category?: string }[], wide?: boolean, cols?: number }) => {
  return (
    <div className="relative group">
      <button className="flex items-center gap-1 hover:text-red-600 dark:hover:text-red-500 transition-colors py-6 focus:outline-none">
        {title} <ChevronDown className="w-4 h-4 opacity-50 group-hover:rotate-180 transition-transform" />
      </button>
      <div className={\`absolute top-full left-1/2 -translate-x-1/2 mt-0 \${wide ? (cols === 3 ? 'w-[900px]' : 'w-[650px]') + ' flex-row flex-wrap' : 'w-72 flex-col'} bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 p-4 flex translate-y-2 group-hover:translate-y-0\`}>
        {items.map((item, i) => {
          const showCategory = item.category && (i === 0 || items[i - 1].category !== item.category);
          const colClass = cols === 3 ? 'w-1/3' : cols === 2 ? 'w-1/2' : 'w-full';
          return (
            <a key={i} href="#" className={\`p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors flex flex-col \${wide ? colClass : 'w-full'}\`}>
              {showCategory && <span className="text-[10px] font-black tracking-wider text-red-600 uppercase mb-2 mt-1">{item.category}</span>}
              <span className="text-sm font-bold text-slate-900 dark:text-white">{item.label}</span>
              {item.desc && <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">{item.desc}</span>}
            </a>
          );
        })}
      </div>
    </div>
  );
};`;

content = content.replace(oldNavDropdown, newNavDropdown);

// Now replace the navbar items
const newNavbar = `<div className="hidden lg:flex items-center gap-4 font-medium text-sm text-slate-600 dark:text-slate-400">
            <NavDropdown 
              title="Product" 
              items={[
                { label: 'Product Overview', desc: 'Get an overview of our data collection platform' },
                { label: 'How It Works', desc: 'Understand the core components of SurveyCTO' },
                { label: 'Integrations', desc: 'Explore our integration options' }
              ]} 
            />
            <NavDropdown 
              title="Features" 
              wide={true}
              cols={2}
              items={[
                { category: 'Overview', label: 'Features Overview', desc: 'Learn more about key features and functionality' },
                { category: 'Data Quality', label: 'Data Quality Tools', desc: 'Ensure good data throughout the entire collection lifecycle' },
                { category: 'Offline', label: 'Advanced Offline', desc: 'Complete offline functionality for data collection anytime, anywhere' },
                { category: 'Integration', label: 'Datasets', desc: 'Connect forms and systems for integrated data workflows' },
                { category: 'Intelligence', label: 'AI at SurveyCTO', desc: 'Use AI-powered tools to improve survey design' },
                { category: 'Mobile', label: 'Mobile Survey App', desc: 'Collect high-quality data with our mobile-ready app' },
                { category: 'Management', label: 'Case Management', desc: 'Manage longitudinal data collection and assign cases for follow up' },
                { category: 'Security', label: 'Survey Security', desc: 'Protect your data with enterprise-grade security at every step' }
              ]} 
            />
            <NavDropdown 
              title="Solutions" 
              wide={true}
              cols={3}
              items={[
                { category: 'Solutions', label: 'Solutions Overview', desc: 'See how SurveyCTO is used for so many different types of work' },
                { category: 'Solutions', label: 'Professional Services', desc: 'Get integration support, custom trainings, and more' },
                { category: 'Solutions', label: 'Data Collection Templates Hub', desc: 'Choose from our form and workflow templates to get started quickly' },
                { category: 'Solutions', label: 'Partner Program', desc: 'Become a SurveyCTO partner or request expert partner support' },
                
                { category: 'Use Cases', label: 'Academic Research' },
                { category: 'Use Cases', label: 'Carbon Offset Projects' },
                { category: 'Use Cases', label: 'Humanitarian Aid' },
                { category: 'Use Cases', label: 'Market Research' },
                { category: 'Use Cases', label: 'Monitoring and Evaluation' },
                { category: 'Use Cases', label: 'Supply Chain Management' },
                { category: 'Use Cases', label: 'Survey Firms' },
                
                { category: 'Industries We Serve', label: 'Agriculture' },
                { category: 'Industries We Serve', label: 'Community Health Work' },
                { category: 'Industries We Serve', label: 'Global Health' },
                { category: 'Industries We Serve', label: 'International Development' }
              ]} 
            />
            <a href="#" className="hover:text-red-600 dark:hover:text-red-500 transition-colors py-6">Pricing</a>
          </div>`;

content = content.replace(/<div className="hidden lg:flex items-center gap-4 font-medium text-sm text-slate-600 dark:text-slate-400">[\s\S]*?<a href="#" className="hover:text-red-600 dark:hover:text-red-500 transition-colors py-6">Pricing<\/a>\s*<\/div>/, newNavbar);

fs.writeFileSync('src/components/LandingPage.tsx', content);
console.log('Navbar rewrite complete');

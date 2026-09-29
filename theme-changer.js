const fs = require('fs');
const path = require('path');

const directory = path.join(__dirname, 'apps/web/src');

const replacements = [
  // Primary Action Color (Blue -> MST Red)
  [/blue-600/g, 'red-700'],
  [/blue-700/g, 'red-800'],
  [/blue-500/g, 'red-600'],
  [/bg-blue-50/g, 'bg-red-50'],
  [/text-blue-700/g, 'text-red-700'],
  [/text-blue-800/g, 'text-red-800'],
  [/border-blue-200/g, 'border-red-200'],
  [/border-blue-100/g, 'border-red-100'],
  [/focus:ring-blue-500/g, 'focus:ring-red-600'],
  [/focus:border-blue-500/g, 'focus:border-red-600'],
  [/hover:bg-blue-50/g, 'hover:bg-red-50'],
  [/hover:text-blue-600/g, 'hover:text-red-700'],
  [/hover:text-blue-800/g, 'hover:text-red-900'],
  [/text-blue-600/g, 'text-red-700'],
  
  // Gradients (Remove wild cyan/blue blobs -> subtle red/rose)
  [/from-blue-500 to-cyan-500/g, 'from-red-700 to-rose-600'],
  [/from-cyan-100 to-transparent/g, 'from-red-100 to-transparent'],
  [/from-cyan-500 to-red-600/g, 'from-red-600 to-rose-700'],
  [/shadow-cyan-500/g, 'shadow-red-500'],
  [/hover:border-cyan-400/g, 'hover:border-red-400'],
  [/hover:shadow-cyan-500/g, 'hover:shadow-red-500'],
  [/bg-blue-100/g, 'bg-red-100'],
  [/bg-indigo-100/g, 'bg-rose-100'],
  [/text-indigo-600/g, 'text-rose-600'],
  [/bg-indigo-50/g, 'bg-rose-50'],
  [/from-slate-900 via-blue-900 to-slate-900/g, 'from-slate-900 via-red-900 to-slate-900'],
  [/text-cyan-400/g, 'text-red-600']
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;
      
      for (const [regex, replacement] of replacements) {
        content = content.replace(regex, replacement);
      }
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(directory);
console.log("Light-mode red theme replacement complete.");

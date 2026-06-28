const fs = require('fs');
const path = require('path');

const files = [
  'c:/shnoor lms/frontend/src/pages/dashboards/instructor/CourseExams.jsx',
  'c:/shnoor lms/frontend/src/pages/dashboards/institute/StudentReports.jsx',
  'c:/shnoor lms/frontend/src/pages/chat/ChatSidebar.jsx',
  'c:/shnoor lms/frontend/src/pages/dashboards/student/StudentOverview.jsx'
];

const replacements = {
  // Brand
  '-blue-': '-brand-',
  // Accent
  '-indigo-': '-accent-',
  // Surface
  '-slate-': '-surface-',
  // Success
  '-emerald-': '-success-',
  '-green-': '-success-',
  // Warning
  '-amber-': '-warning-',
  '-yellow-': '-warning-',
  '-orange-': '-warning-',
  // Danger
  '-rose-': '-danger-',
  '-red-': '-danger-',
  // Info
  '-purple-': '-info-'
};

const regexes = Object.keys(replacements).map(key => ({
  regex: new RegExp(`(bg|text|border|shadow|ring|from|to|fill|stroke|hover:bg|hover:text|hover:border)${key}(\\d{2,3})`, 'g'),
  replace: `$1${replacements[key]}$2`
}));

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf-8');
    for (const { regex, replace } of regexes) {
      content = content.replace(regex, replace);
    }
    
    // special replacements for white and black
    content = content.replace(/(bg|text|border|ring)-white/g, '$1-base-white');
    content = content.replace(/(bg|text|border|ring)-black/g, '$1-base-black');
    content = content.replace(/shadow-white/g, 'shadow-base-white');
    content = content.replace(/shadow-black/g, 'shadow-base-black');

    fs.writeFileSync(file, content);
    console.log(`Updated ${path.basename(file)}`);
  } else {
    console.log(`File not found: ${file}`);
  }
}

const fs = require('fs');

const fixFile = (file) => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/'ADMIN'/g, "'admin'");
  content = content.replace(/'SUPER_ADMIN'/g, "'super_admin'");
  fs.writeFileSync(file, content);
};

fixFile('server.js');
fixFile('contactRoutes.js');

const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (file === 'page.tsx' || file === 'route.ts') {
      let content = fs.readFileSync(fullPath, 'utf-8');
      if (!content.includes('runtime = "edge"') && !content.includes("runtime = 'edge'")) {
        // Remove 'use client' and put it back at the top if present
        const hasUseClient = content.includes('"use client"') || content.includes("'use client'");
        if (hasUseClient) {
          content = content.replace(/"use client";\s*/g, '').replace(/'use client';\s*/g, '');
          content = `"use client";\nexport const runtime = 'edge';\n` + content;
        } else {
          content = `export const runtime = 'edge';\n` + content;
        }
        fs.writeFileSync(fullPath, content);
        console.log('Updated ' + fullPath);
      }
    }
  }
}

processDir('/Users/dennis/Repository/darwin_page/src/app');

const fs = require('fs');
const path = require('path');

function walk(dir) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walk(dirPath);
        } else if (dirPath.endsWith('.ts') || dirPath.endsWith('.tsx')) {
            let content = fs.readFileSync(dirPath, 'utf8');
            let newContent = content.replace(/\\`/g, '`').replace(/\\\$/g, '$');
            if (content !== newContent) {
                fs.writeFileSync(dirPath, newContent);
                console.log('Fixed ' + dirPath);
            }
        }
    });
}

walk('apps/frontend/src/app');

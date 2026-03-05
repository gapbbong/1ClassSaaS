const fs = require('fs');
const path = require('path');

const clarityScript = `
<script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "vqru6iwnq8");
</script>
</head>`;

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dashboard') && !file.includes('xampp') && !file.includes('img') && !file.includes('src')) {
                processDir(fullPath);
            }
        } else if (file.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (!content.includes('clarity.ms/tag') && content.includes('</head>')) {
                content = content.replace('</head>', clarityScript);
                fs.writeFileSync(fullPath, content);
                console.log('Injected clarity into', file);
            }
        }
    }
}
processDir('.');
console.log("Injection complete.");

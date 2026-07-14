import fs from 'fs';
import path from 'path';

function fixImports(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      fixImports(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Fix relative imports to have .js extension
      content = content.replace(/(import\s+.*?from\s+["'](\.[^"']+)["'])/g, (match, p1, p2) => {
        if (!p2.endsWith('.js') && !p2.endsWith('.ts') && !p2.endsWith('.json')) {
          return match.replace(p2, p2 + '.js');
        }
        return match;
      });
      content = content.replace(/(export\s+.*?from\s+["'](\.[^"']+)["'])/g, (match, p1, p2) => {
        if (!p2.endsWith('.js') && !p2.endsWith('.ts') && !p2.endsWith('.json')) {
          return match.replace(p2, p2 + '.js');
        }
        return match;
      });
      content = content.replace(/(import\s*\(\s*["'](\.[^"']+)["']\s*\))/g, (match, p1, p2) => {
        if (!p2.endsWith('.js') && !p2.endsWith('.ts') && !p2.endsWith('.json')) {
          return match.replace(p2, p2 + '.js');
        }
        return match;
      });

      // Fix implicit any errors
      content = content.replace(/\.map\(i =>/g, '.map((i: any) =>');
      content = content.replace(/\.map\(d =>/g, '.map((d: any) =>');
      content = content.replace(/\.map\(t =>/g, '.map((t: any) =>');
      content = content.replace(/\.map\(u =>/g, '.map((u: any) =>');
      content = content.replace(/\.map\(reg =>/g, '.map((reg: any) =>');
      content = content.replace(/\.map\(p =>/g, '.map((p: any) =>');
      content = content.replace(/\.map\(\(t\) =>/g, '.map((t: any) =>');
      content = content.replace(/\.map\(\(student\) =>/g, '.map((student: any) =>');
      content = content.replace(/\.map\(\(reg\) =>/g, '.map((reg: any) =>');
      content = content.replace(/\.map\(async\s*\(reg\)\s*=>/g, '.map(async (reg: any) =>');
      content = content.replace(/\.map\(async\s*\(student\)\s*=>/g, '.map(async (student: any) =>');
      content = content.replace(/\.every\(d =>/g, '.every((d: any) =>');
      content = content.replace(/\.sort\(\(a, b\) =>/g, '.sort((a: any, b: any) =>');
      content = content.replace(/\.catch\(err =>/g, '.catch((err: any) =>');

      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

fixImports('./src');
console.log("Fixes applied successfully!");

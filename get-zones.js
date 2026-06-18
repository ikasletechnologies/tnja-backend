import fs from 'fs';
const data = JSON.parse(fs.readFileSync('prisma/tn_locations.json', 'utf8'));
const mapping = {};
data.forEach(d => {
  if (!mapping[d.zone]) mapping[d.zone] = new Set();
  mapping[d.zone].add(d.name);
});
for (const [zone, districts] of Object.entries(mapping)) {
  console.log(`\n### ${zone}`);
  for (const dist of districts) {
    console.log(`- ${dist}`);
  }
}

import { getDb } from '../lib/db';

const sampleTexts = [
  'The quick brown fox jumps over the lazy dog near the riverbank.',
  'Sunlight filtered through the canopy as birds sang their morning chorus.',
  'A tangled web of algorithms processed the incoming stream of data.',
  'She discovered an old letter tucked behind the crumbling brick wall.',
  'Mountains of paperwork obscured the desk beneath piles of forgotten memos.',
  'Neon signs flickered in the rain-soaked streets of the downtown district.',
  'Copper wires hummed with electricity as the circuit board came to life.',
  'Waves crashed relentlessly against the weathered hull of the wooden vessel.',
  'The aroma of freshly brewed coffee drifted through the open office window.',
  'Stars scattered across the velvet sky like dust on a forgotten shelf.',
];

const db = getDb();

const insert = db.prepare(`
  INSERT INTO sample (SampleText, CreatedBy, CreatedDate, LastUpdatedBy, LastUpdatedDate, Active)
  VALUES (?, ?, datetime('now'), ?, datetime('now'), 1)
`);

const insertMany = db.transaction(() => {
  for (const text of sampleTexts) {
    insert.run(text, 'seed-script', 'seed-script');
  }
});

insertMany();

const count = (db.prepare('SELECT COUNT(*) as count FROM sample').get() as { count: number }).count;
console.log(`Done — ${count} records in sample table.`);

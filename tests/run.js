// Runs every test against the built page and prints one summary.
//   node tests/run.js            everything, with the play-through at all four screen sizes (about 20 minutes)
//   node tests/run.js --quick    the same, with the play-through at desktop size only (about 12 minutes)
//   node tests/run.js log reset  only the named tests
// The tests play the figures in real time in a headless browser, which is why they are slow.
const { spawnSync } = require('child_process');
const path = require('path');
const ALL = [
  ['play', 'every figure plays through with a steady height and no stray arrows'],
  ['same', 'the script and the same steps by hand leave each figure in the same state'],
  ['switches', 'each switch at the step it changes, and each figure used by hand'],
  ['player', 'the slider pauses the script, and a switch replays the step it changes'],
  ['hold', 'after a switch, the figure holds with every arrow drawn'],
  ['reset', 'the reset button, from mid-play, from the end and after hand use'],
  ['log', 'retained mode’s log, after the script and after heavy use'],
  ['byhand', 'retained mode by hand: the log’s entries, and the row a left-out line leaves behind'],
  ['trees', 'React’s two trees scroll together, apart from the window'],
  ['arrows', 'no arrow passes over a card, slip, line, row or heading other than its own two ends']
];
const args = process.argv.slice(2), quick = args.includes('--quick'), only = args.filter(a => !a.startsWith('--'));
const todo = ALL.filter(t => !only.length || only.includes(t[0]));
let failed = 0;
const t0 = Date.now();
for (const [name, what] of todo) {
  const t = Date.now();
  const r = spawnSync('node', [path.join(__dirname, name + '.js')], { encoding: 'utf8', env: { ...process.env, ...(quick && name === 'play' ? { SIZES: 'desktop' } : {}) } });
  const ok = r.status === 0;
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name.padEnd(9)} ${what}  (${Math.round((Date.now() - t) / 1000)}s)`);
  if (!ok) console.log((r.stdout + r.stderr).split('\n').filter(l => l && !/^ok /.test(l)).map(l => '      ' + l).join('\n'));
}
console.log(`\n${todo.length - failed} of ${todo.length} passed in ${Math.round((Date.now() - t0) / 60000)} min`);
process.exitCode = failed ? 1 : 0;

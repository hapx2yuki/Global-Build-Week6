import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();
const sourceRoot = path.resolve(projectRoot, '../../output/criteriaforge-demo');
const publicRoot = path.join(projectRoot, 'public');

const screenshots = [
  '01-intent.png',
  '02-constitution-question.png',
  '03-constitution-ratified.png',
  '04-compile-five-gates.png',
  '05-evidence.png',
  '06-evaluation.png',
  '07-remediation-boundary.png',
  '08-remediation-verified.png',
  '09-reevaluation.png',
  '10-public-boundary.png',
  '11-live-local-blocked.png',
];

fs.rmSync(publicRoot, {recursive: true, force: true});
fs.mkdirSync(path.join(publicRoot, 'screens'), {recursive: true});

for (const filename of screenshots) {
  const source = path.join(sourceRoot, filename);
  if (!fs.existsSync(source)) {
    throw new Error(`Missing captured product screen: ${source}`);
  }
  fs.copyFileSync(source, path.join(publicRoot, 'screens', filename));
}

const narration = path.join(sourceRoot, 'criteriaforge-demo.mp4');
if (!fs.existsSync(narration)) {
  throw new Error(`Missing narration master: ${narration}`);
}
fs.copyFileSync(narration, path.join(publicRoot, 'narration.mp4'));

const srtPath = path.join(sourceRoot, 'criteriaforge-demo.srt');
if (!fs.existsSync(srtPath)) {
  throw new Error(`Missing caption source: ${srtPath}`);
}

const parseTimestamp = (value) => {
  const match = value.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/u);
  if (!match) throw new Error(`Invalid SRT timestamp: ${value}`);
  const [, hours, minutes, seconds, milliseconds] = match.map(Number);
  return hours * 3_600_000 + minutes * 60_000 + seconds * 1000 + milliseconds;
};

const blocks = fs
  .readFileSync(srtPath, 'utf8')
  .replaceAll('\r\n', '\n')
  .trim()
  .split(/\n\n+/u);

const captions = blocks.map((block) => {
  const lines = block.split('\n');
  const timing = lines[1]?.match(
    /^(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})$/u,
  );
  if (!timing) throw new Error(`Invalid SRT cue: ${block}`);
  return {
    startMs: parseTimestamp(timing[1]),
    endMs: parseTimestamp(timing[2]),
    text: lines.slice(2).join(' ').trim(),
  };
});

fs.writeFileSync(
  path.join(publicRoot, 'captions.json'),
  `${JSON.stringify(captions, null, 2)}\n`,
);

process.stdout.write(
  `Prepared ${screenshots.length} product screens, narration, and ${captions.length} captions.\n`,
);

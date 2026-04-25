import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Regression guard for license/attribution drift in the always-present UI.
// Motivated by the gap between commits 7d61b6f (NOTICE/README corrected to
// CC BY-NC 4.0) and the follow-up that updated the viewer — `index.html`
// kept saying "CC BY 4.0" because nothing checked. If you're legitimately
// updating the citation/DOI, update the assertions here too.

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_HTML = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');

describe('index.html attribution', () => {
  it('declares the HIP data license as CC BY-NC 4.0', () => {
    expect(INDEX_HTML).toMatch(/CC BY-NC 4\.0/);
  });

  it('cites the UNDRR-ISC 2025 Update DOI', () => {
    expect(INDEX_HTML).toContain('10.24948/2025.05');
  });

  it('does not advertise the data as plain CC BY 4.0', () => {
    // Match "CC BY 4.0" only when not followed by "-NC". A negative lookahead
    // keeps "CC BY-NC 4.0" passing while catching the stale "CC BY 4.0" string.
    expect(INDEX_HTML).not.toMatch(/CC BY(?!-NC) 4\.0/);
    expect(INDEX_HTML).not.toMatch(/licenses\/by\/4\.0/);
  });
});

describe('index.html GitHub links', () => {
  const REPO_URL = 'https://github.com/khawkins98/hips-multihazard';

  it('exposes the repo from the always-present header', () => {
    const header = INDEX_HTML.match(/<header[\s\S]*?<\/header>/)?.[0] ?? '';
    expect(header).toContain(REPO_URL);
  });

  it('exposes the repo from the always-present footer', () => {
    const footer = INDEX_HTML.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? '';
    expect(footer).toContain(REPO_URL);
  });
});

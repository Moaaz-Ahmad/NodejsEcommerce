const fs = require('fs/promises');
const path = require('path');

const DIR = path.join(__dirname, '..', 'Data');

// JSON-file store: store('products', []) -> { read, update }
module.exports = (name, fallback) => {
  const file = path.join(DIR, `${name}.json`);
  // ponytail: per-file in-process queue serializes read-modify-write; multiple server processes would need a DB or file lock
  let queue = Promise.resolve();

  async function read() {
    try {
      return JSON.parse(await fs.readFile(file, 'utf8'));
    } catch (err) {
      if (err.code === 'ENOENT') return structuredClone(fallback); // first run
      // corrupt/unreadable: throw rather than return fallback so a later save can't wipe the data
      throw new Error(`Could not read ${file}: ${err.message}`);
    }
  }

  // fn(data) mutates data in place or returns a replacement; written atomically (temp + rename)
  function update(fn) {
    const run = queue.then(async () => {
      const data = await read();
      const next = (await fn(data)) ?? data;
      await fs.mkdir(DIR, { recursive: true });
      const tmp = `${file}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(next, null, 2));
      await fs.rename(tmp, file);
      return next;
    });
    queue = run.catch(() => {}); // a failed write must not block later ones
    return run;
  }

  return { read, update };
};

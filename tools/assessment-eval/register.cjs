// Lets Node run the app's real TypeScript analysis code. Only the modules
// that need React Native (config storage, the Supabase client) are stubbed;
// every line that scores a student is the shipped source.
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
require(path.join(ROOT, 'node_modules/sucrase/register/ts'));
const Module = require('module');
const SRC = path.join(ROOT, 'src');
const STUBS = {
  '@/config': path.join(__dirname, 'stubs/config.cjs'),
  '@/services/supabase': path.join(__dirname, 'stubs/supabase.cjs'),
};
const orig = Module._resolveFilename;
Module._resolveFilename = function (req, parent, ...rest) {
  if (STUBS[req]) return STUBS[req];
  if (req.startsWith('@/')) req = path.join(SRC, req.slice(2));
  return orig.call(this, req, parent, ...rest);
};
module.exports = { ROOT, SRC };

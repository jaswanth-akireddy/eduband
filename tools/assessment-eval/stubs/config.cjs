// Mirrors src/config.ts: modeFlags derive from config, so a check can switch a
// service "on" by setting config.apiBase. Default is production today: nothing
// reachable, no direct keys.
const config = { apiBase: '', sttProvider: 'deepgram', deepgramKey: '', llmProvider: 'claude',
  anthropicKey: '', anthropicModel: '', geminiKey: '', geminiModel: '' };
const modeFlags = {
  get useBackend() { return !!config.apiBase; },
  get useDirectStt() { return !config.apiBase && !!config.deepgramKey; },
  get useDirectLlm() { return !config.apiBase && (!!config.anthropicKey || !!config.geminiKey); },
};
module.exports = { config, modeFlags, describeMode: () => 'harness' };

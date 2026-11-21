// Same state production is in today: no backend reachable, no direct keys.
const config = { apiBase: '', sttProvider: 'deepgram', deepgramKey: '', llmProvider: 'claude',
  anthropicKey: '', anthropicModel: '', geminiKey: '', geminiModel: '' };
module.exports = { config, modeFlags: { useBackend: false, useDirectStt: false, useDirectLlm: false },
  describeMode: () => 'mock (harness)' };

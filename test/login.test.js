const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { WEB_URL, isAllowedUrl, makeLoginScript } = require('../src/login');
function run({ origin = new URL(WEB_URL).origin, action = WEB_URL, method = 'post', automatic = true, label = 'Ingresar' } = {}) {
  class Input { set value(value) { this.stored = value; } dispatchEvent() {} getClientRects() { return [1]; } }
  const user = Object.assign(new Input(), { name: 'email', id: '', autocomplete: '' });
  const password = Object.assign(new Input(), { autocomplete: 'current-password' });
  const button = Object.assign(new Input(), { innerText: label, type: 'submit' });
  let submits = 0;
  const form = { action, method, requestSubmit: () => submits++, querySelectorAll: selector => selector.includes('password') ? [password] : selector.startsWith('button') ? [button] : [user] };
  const messages = [];
  vm.runInNewContext(makeLoginScript('test@example.com', 'quotes"</script>\\', automatic), {
    location: { origin, href: WEB_URL }, document: { forms: [form] }, URL,
    HTMLInputElement: Input, Event: class {}, window: { ReactNativeWebView: { postMessage: data => messages.push(JSON.parse(data).type) } },
  });
  return { submits, user: user.stored, password: password.stored, messages };
}
test('navigation accepts only the exact HTTPS origin', () => {
  assert.ok(isAllowedUrl(WEB_URL));
  for (const value of ['http://delmarques.harodoor.app', 'https://delmarques.harodoor.app.evil.com', 'javascript:alert(1)', 'https://user:pass@delmarques.harodoor.app', 'https://delmarques.harodoor.app:8443']) assert.equal(isAllowedUrl(value), false);
});
test('fills and submits a recognized POST login, preserving special characters', () => {
  const result = run(); assert.equal(result.submits, 1); assert.equal(result.user, 'test@example.com'); assert.equal(result.password, 'quotes"</script>\\');
});
test('does not submit again after the initial attempt', () => assert.equal(run({ automatic: false }).submits, 0));
test('never submits a gate button', () => assert.equal(run({ label: 'Abrir portón' }).submits, 0));
test('does not send credentials to other origins or GET forms', () => {
  for (const options of [{ origin: 'https://evil.com' }, { action: 'https://evil.com' }, { method: 'get' }]) {
    const result = run(options); assert.equal(result.submits, 0); assert.equal(result.password, undefined);
  }
});

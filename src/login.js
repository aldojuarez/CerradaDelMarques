const WEB_URL = 'https://delmarques.harodoor.app/index.php';

function isAllowedUrl(value) {
  try {
    const url = new URL(value);
    return url.origin === new URL(WEB_URL).origin && !url.username && !url.password;
  } catch {
    return false;
  }
}

// Only submits an unambiguous login form. Never clicks gate controls.
function makeLoginScript(email, password, autoSubmit) {
  const credentials = JSON.stringify({ email, password, autoSubmit }).replace(/</g, '\\u003c');
  return `(() => {
    if (location.origin !== 'https://delmarques.harodoor.app') return;
    const credentials = ${credentials};
    const notify = (type) => window.ReactNativeWebView.postMessage(JSON.stringify({type}));
    const visible = el => !el.disabled && el.getClientRects().length > 0;
    const forms = Array.from(document.forms).filter(form => {
      const passwords = Array.from(form.querySelectorAll('input[type="password"]')).filter(visible);
      return passwords.length === 1 && passwords[0].autocomplete !== 'new-password';
    });
    if (forms.length !== 1) return;
    const form = forms[0];
    if (new URL(form.action || location.href, location.href).origin !== location.origin) return;
    if ((form.method || '').toLowerCase() !== 'post') { notify('manual'); return; }
    const password = Array.from(form.querySelectorAll('input[type="password"]')).find(visible);
    const candidates = Array.from(form.querySelectorAll('input[type="email"], input[type="text"], input:not([type])')).filter(visible);
    const identified = candidates.filter(el => /email|correo|usuario|username|user|login/i.test(el.name + ' ' + el.id + ' ' + el.autocomplete));
    const username = identified.length === 1 ? identified[0] : candidates.length === 1 ? candidates[0] : null;
    if (!username) { notify('manual'); return; }
    const set = (element, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, value);
      element.dispatchEvent(new Event('input', {bubbles: true}));
      element.dispatchEvent(new Event('change', {bubbles: true}));
    };
    set(username, credentials.email);
    set(password, credentials.password);
    notify('filled');
    const buttons = Array.from(form.querySelectorAll('button, input[type="submit"]')).filter(visible);
    const loginButtons = buttons.filter(el => /^(iniciar sesi[oó]n|ingresar|entrar|acceder|login|log in|sign in)$/i.test((el.innerText || el.value || '').trim()));
    if (credentials.autoSubmit && loginButtons.length === 1 && typeof form.requestSubmit === 'function') {
      const button = loginButtons[0];
      if (button.type === 'submit') { notify('submitted'); form.requestSubmit(button); }
      else notify('manual');
    } else notify('manual');
  })(); true;`;
}
module.exports = { WEB_URL, isAllowedUrl, makeLoginScript };

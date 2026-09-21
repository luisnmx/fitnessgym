// FitnesGym — Autenticación local (protección de acceso al panel).
// Credenciales por defecto: admin / admin123. Se pueden cambiar después desde el sidebar.
// Nota: es una autenticación del lado del cliente (sin backend), suficiente para uso local.
(function () {
  const CRED_KEY = 'fitnessgym_credentials';
  const SESSION_KEY = 'fitnessgym_session';
  const DEFAULT_CREDS = { username: 'admin', password: 'admin123' };

  function getCredentials() {
    try {
      const raw = localStorage.getItem(CRED_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.username && parsed.password) return parsed;
      }
    } catch (e) {}
    return { username: DEFAULT_CREDS.username, password: DEFAULT_CREDS.password };
  }

  function saveCredentials(username, password) {
    try {
      localStorage.setItem(CRED_KEY, JSON.stringify({ username: username, password: password }));
    } catch (e) {}
  }

  function getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function isAuthenticated() {
    const session = getSession();
    return !!(session && session.username);
  }

  function login(username, password, remember) {
    const creds = getCredentials();
    if (String(username || '').trim() !== creds.username || String(password || '') !== creds.password) {
      return false;
    }
    const session = JSON.stringify({ username: creds.username, ts: Date.now() });
    try {
      if (remember) {
        localStorage.setItem(SESSION_KEY, session);
        sessionStorage.removeItem(SESSION_KEY);
      } else {
        sessionStorage.setItem(SESSION_KEY, session);
        localStorage.removeItem(SESSION_KEY);
      }
    } catch (e) {}
    return true;
  }

  function logout() {
    try {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
    window.location.replace('login.html');
  }

  function requireAuth() {
    if (!isAuthenticated()) window.location.replace('login.html');
  }

  function redirectIfAuthenticated() {
    if (isAuthenticated()) window.location.replace('index.html');
  }

  function currentUsername() {
    const session = getSession();
    return session && session.username ? session.username : 'Administrador';
  }

  function changePassword(current, next, confirm) {
    const creds = getCredentials();
    if (String(current || '') !== creds.password) {
      return { ok: false, error: 'La contraseña actual es incorrecta.' };
    }
    if (!next || String(next).length < 6) {
      return { ok: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' };
    }
    if (String(next) !== String(confirm || '')) {
      return { ok: false, error: 'La confirmación no coincide con la nueva contraseña.' };
    }
    saveCredentials(creds.username, next);
    return { ok: true };
  }

  function ensureModal() {
    if (document.getElementById('authChangePwOverlay')) return;

    const style = document.createElement('style');
    style.textContent =
      '#authChangePwOverlay{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.75);' +
      'backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:16px;}' +
      '#authChangePwOverlay .acp-card{width:100%;max-width:400px;background:#15171a;border:1px solid #262a2e;' +
      'border-radius:16px;padding:28px 24px;color:#f2f3f5;font-family:Inter,system-ui,sans-serif;}' +
      '#authChangePwOverlay h3{margin:0 0 4px;font-size:18px;font-weight:700;}' +
      '#authChangePwOverlay p.acp-sub{margin:0 0 20px;font-size:13px;color:#8b9198;}' +
      '#authChangePwOverlay label{display:block;font-size:13px;font-weight:600;margin:0 0 6px;}' +
      '#authChangePwOverlay input{width:100%;height:42px;background:#1b1e22;border:1px solid #262a2e;' +
      'border-radius:10px;color:#f2f3f5;font:inherit;font-size:14px;padding:0 14px;outline:none;margin-bottom:14px;}' +
      '#authChangePwOverlay input:focus{border-color:#2ecc71;box-shadow:0 0 0 3px rgba(46,204,113,.12);}' +
      '#authChangePwOverlay .acp-error{display:none;font-size:13px;color:#ef4444;background:rgba(239,68,68,.08);' +
      'border:1px solid rgba(239,68,68,.25);border-radius:8px;padding:8px 12px;margin-bottom:14px;}' +
      '#authChangePwOverlay .acp-error.show{display:block;}' +
      '#authChangePwOverlay .acp-ok{display:none;font-size:13px;color:#2ecc71;background:rgba(46,204,113,.08);' +
      'border:1px solid rgba(46,204,113,.25);border-radius:8px;padding:8px 12px;margin-bottom:14px;}' +
      '#authChangePwOverlay .acp-ok.show{display:block;}' +
      '#authChangePwOverlay .acp-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:6px;}' +
      '#authChangePwOverlay button{font:inherit;cursor:pointer;border-radius:10px;}' +
      '#authChangePwOverlay .acp-cancel{background:transparent;border:1px solid #262a2e;color:#8b9198;' +
      'padding:10px 16px;font-size:13px;font-weight:600;}' +
      '#authChangePwOverlay .acp-cancel:hover{color:#f2f3f5;}' +
      '#authChangePwOverlay .acp-save{background:#2ecc71;border:none;color:#06210f;padding:10px 18px;' +
      'font-size:13px;font-weight:700;}' +
      '#authChangePwOverlay .acp-save:hover{background:#29b765;}';
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'authChangePwOverlay';
    overlay.style.display = 'none';
    overlay.innerHTML =
      '<div class="acp-card">' +
      '  <h3>Cambiar contraseña</h3>' +
      '  <p class="acp-sub">Usuario actual: <strong id="acpUser"></strong></p>' +
      '  <div id="acpError" class="acp-error"></div>' +
      '  <div id="acpOk" class="acp-ok">Contraseña actualizada correctamente.</div>' +
      '  <label for="acpCurrent">Contraseña actual</label>' +
      '  <input id="acpCurrent" type="password" autocomplete="current-password" placeholder="••••••••">' +
      '  <label for="acpNew">Nueva contraseña</label>' +
      '  <input id="acpNew" type="password" autocomplete="new-password" placeholder="Mínimo 6 caracteres">' +
      '  <label for="acpConfirm">Confirmar nueva contraseña</label>' +
      '  <input id="acpConfirm" type="password" autocomplete="new-password" placeholder="Repetí la nueva contraseña">' +
      '  <div class="acp-actions">' +
      '    <button type="button" class="acp-cancel" id="acpCancel">Cancelar</button>' +
      '    <button type="button" class="acp-save" id="acpSave">Guardar</button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeChangePassword();
    });
    document.getElementById('acpCancel').addEventListener('click', closeChangePassword);
    document.getElementById('acpSave').addEventListener('click', function () {
      const errBox = document.getElementById('acpError');
      const okBox = document.getElementById('acpOk');
      errBox.classList.remove('show');
      okBox.classList.remove('show');
      const result = changePassword(
        document.getElementById('acpCurrent').value,
        document.getElementById('acpNew').value,
        document.getElementById('acpConfirm').value
      );
      if (!result.ok) {
        errBox.textContent = result.error;
        errBox.classList.add('show');
        return;
      }
      okBox.classList.add('show');
      document.getElementById('acpCurrent').value = '';
      document.getElementById('acpNew').value = '';
      document.getElementById('acpConfirm').value = '';
      setTimeout(closeChangePassword, 1200);
    });
  }

  function openChangePassword() {
    ensureModal();
    const overlay = document.getElementById('authChangePwOverlay');
    document.getElementById('acpUser').textContent = currentUsername();
    document.getElementById('acpError').classList.remove('show');
    document.getElementById('acpOk').classList.remove('show');
    document.getElementById('acpCurrent').value = '';
    document.getElementById('acpNew').value = '';
    document.getElementById('acpConfirm').value = '';
    overlay.style.display = 'flex';
    setTimeout(function () {
      const input = document.getElementById('acpCurrent');
      if (input) input.focus();
    }, 30);
  }

  function closeChangePassword() {
    const overlay = document.getElementById('authChangePwOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  window.FitnesGymAuth = {
    login: login,
    logout: logout,
    isAuthenticated: isAuthenticated,
    requireAuth: requireAuth,
    redirectIfAuthenticated: redirectIfAuthenticated,
    currentUsername: currentUsername,
    changePassword: changePassword,
    openChangePassword: openChangePassword,
    closeChangePassword: closeChangePassword,
  };
})();

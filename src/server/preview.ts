import type { AppConfig } from "../config.js";

function scriptString(value: string): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * Generate the preview HTML for the dev server
 * Code is pre-transpiled server-side, so no browser-side transpilation needed
 */
export function getPreviewHTML(config: AppConfig, port: number): string {
  const devDataStorageKey = `a1zap-dev-data:${config.handle}`;

  return `<!DOCTYPE html>
<html>
<head>
  <title>${config.name} - A1Zap Dev</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #root { height: 100%; font-family: system-ui, -apple-system, sans-serif; }

    .dev-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #fff;
      padding: 10px 16px;
      font-size: 13px;
      z-index: 9999;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }

    .dev-banner-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .dev-banner-logo {
      font-weight: 700;
      background: linear-gradient(135deg, #4ade80, #22d3ee);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .dev-banner-app {
      color: #94a3b8;
    }

    .dev-banner-version {
      background: rgba(74, 222, 128, 0.2);
      color: #4ade80;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }

    .dev-banner-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .dev-banner button {
      background: #4ade80;
      border: none;
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
      color: #0f172a;
      transition: all 0.2s;
    }

    .dev-banner button.secondary {
      background: rgba(148, 163, 184, 0.16);
      border: 1px solid rgba(148, 163, 184, 0.28);
      color: #e2e8f0;
    }

    .dev-banner button.has-data {
      background: #22d3ee;
    }

    .dev-banner button:hover {
      background: #22c55e;
      transform: translateY(-1px);
    }

    .dev-banner button.secondary:hover {
      background: rgba(148, 163, 184, 0.24);
    }

    #app-container {
      padding-top: 48px;
      height: 100%;
    }

    .error-display {
      padding: 24px;
      background: #1e1e2e;
      color: #f87171;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 14px;
      height: 100%;
      overflow: auto;
    }

    .error-display h3 {
      color: #f87171;
      margin-bottom: 16px;
      font-size: 16px;
    }

    .error-display pre {
      white-space: pre-wrap;
      word-break: break-word;
      background: #0f0f1a;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #374151;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #64748b;
      font-size: 14px;
    }

    .dev-data-modal[hidden] {
      display: none;
    }

    .dev-data-modal {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(4px);
    }

    .dev-data-dialog {
      width: min(640px, 100%);
      max-height: min(760px, calc(100vh - 48px));
      overflow: auto;
      background: #0f172a;
      color: #e2e8f0;
      border: 1px solid rgba(148, 163, 184, 0.28);
      border-radius: 8px;
      box-shadow: 0 24px 72px rgba(0, 0, 0, 0.45);
    }

    .dev-data-header,
    .dev-data-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 16px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.18);
    }

    .dev-data-actions {
      border-top: 1px solid rgba(148, 163, 184, 0.18);
      border-bottom: 0;
      justify-content: flex-end;
    }

    .dev-data-header h2 {
      font-size: 16px;
      line-height: 1.3;
    }

    .dev-data-body {
      display: grid;
      gap: 14px;
      padding: 16px;
    }

    .dev-data-field {
      display: grid;
      gap: 6px;
      font-size: 12px;
      color: #94a3b8;
      font-weight: 600;
    }

    .dev-data-field input,
    .dev-data-field select,
    .dev-data-field textarea {
      width: 100%;
      border: 1px solid rgba(148, 163, 184, 0.28);
      border-radius: 6px;
      background: #020617;
      color: #e2e8f0;
      font: inherit;
      font-weight: 400;
    }

    .dev-data-field input,
    .dev-data-field select {
      min-height: 36px;
      padding: 7px 10px;
    }

    .dev-data-field textarea {
      min-height: 260px;
      padding: 10px;
      resize: vertical;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 12px;
      line-height: 1.5;
    }

    .dev-data-status {
      min-height: 18px;
      color: #94a3b8;
      font-size: 12px;
    }

    .dev-data-status.error {
      color: #f87171;
    }

    .dev-data-status.success {
      color: #4ade80;
    }

    .dev-data-actions button,
    .dev-data-close {
      border: 1px solid rgba(148, 163, 184, 0.28);
      border-radius: 6px;
      cursor: pointer;
      font-weight: 700;
      font-size: 12px;
      transition: all 0.2s;
    }

    .dev-data-actions button {
      padding: 8px 12px;
      background: rgba(148, 163, 184, 0.14);
      color: #e2e8f0;
    }

    .dev-data-actions button.primary {
      background: #4ade80;
      border-color: #4ade80;
      color: #0f172a;
    }

    .dev-data-actions button.danger {
      margin-right: auto;
      color: #fecaca;
      border-color: rgba(248, 113, 113, 0.35);
    }

    .dev-data-close {
      width: 32px;
      height: 32px;
      background: rgba(148, 163, 184, 0.12);
      color: #e2e8f0;
    }
    </style>
</head>
<body>
  <div class="dev-banner">
    <div class="dev-banner-left">
      <span class="dev-banner-logo">A1Zap</span>
      <span class="dev-banner-app">${config.name}</span>
      <span class="dev-banner-version">v${config.version}</span>
    </div>
    <div class="dev-banner-actions">
      <button id="dev-data-button" class="secondary" type="button">Load JSON</button>
      <button type="button" onclick="location.reload()">↻ Reload</button>
    </div>
  </div>
  <div id="dev-data-modal" class="dev-data-modal" hidden>
    <div class="dev-data-dialog" role="dialog" aria-modal="true" aria-labelledby="dev-data-title">
      <div class="dev-data-header">
        <h2 id="dev-data-title">Load JSON data</h2>
        <button id="dev-data-close" class="dev-data-close" type="button" aria-label="Close">x</button>
      </div>
      <div class="dev-data-body">
        <label class="dev-data-field">
          Apply as
          <select id="dev-data-target">
            <option value="data">data prop</option>
            <option value="sharedData">sharedData prop</option>
            <option value="myPersonalData">myPersonalData prop</option>
            <option value="fixture">runtime fixture</option>
          </select>
        </label>
        <label class="dev-data-field">
          JSON file
          <input id="dev-data-file" type="file" accept=".json,application/json">
        </label>
        <label class="dev-data-field">
          JSON
          <textarea id="dev-data-input" spellcheck="false" placeholder='{"todos":[]}'></textarea>
        </label>
        <div id="dev-data-status" class="dev-data-status"></div>
      </div>
      <div class="dev-data-actions">
        <button id="dev-data-clear" class="danger" type="button">Clear data</button>
        <button id="dev-data-cancel" type="button">Cancel</button>
        <button id="dev-data-apply" class="primary" type="button">Apply JSON</button>
      </div>
    </div>
  </div>
  <div id="app-container">
    <div id="root">
      <div class="loading">Loading app...</div>
    </div>
  </div>

  <!-- Load dependencies via esm.sh for reliable ES module support -->
  <script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@18.2.0",
      "react-dom": "https://esm.sh/react-dom@18.2.0",
      "react-dom/client": "https://esm.sh/react-dom@18.2.0/client",
      "lucide-react": "https://esm.sh/lucide-react@0.460.0?external=react"
    }
  }
  </script>

  <script type="module">
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import * as LucideIcons from 'lucide-react';

    // Expose for eval'd code
    window.React = React;
    window.LucideIcons = LucideIcons;

    const defaultMockUser = {
      id: 'dev-user-123',
      name: 'Developer',
      email: 'dev@localhost',
      imageUrl: null
    };

    let mockUser = { ...defaultMockUser };
    let appData = null;
    let sharedData = null;
    let myPersonalData = null;
    let isMultiplayer = false;
    let members = [mockUser];
    let memberActivity = {};
    let currentRoot = null;
    let currentApp = null;
    let renderQueued = false;
    const devDataStorageKey = ${scriptString(devDataStorageKey)};

    function isRecord(value) {
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    function hasOwn(value, key) {
      return Object.prototype.hasOwnProperty.call(value, key);
    }

    function resetRuntimeData() {
      mockUser = { ...defaultMockUser };
      appData = null;
      sharedData = null;
      myPersonalData = null;
      isMultiplayer = false;
      members = [mockUser];
      memberActivity = {};
    }

    function applyRuntimeFixture(fixture) {
      if (!isRecord(fixture)) {
        throw new Error('Runtime fixture must be a JSON object.');
      }

      if (hasOwn(fixture, 'data')) appData = fixture.data;
      if (hasOwn(fixture, 'sharedData')) sharedData = fixture.sharedData;
      if (hasOwn(fixture, 'myPersonalData')) myPersonalData = fixture.myPersonalData;
      if (hasOwn(fixture, 'isMultiplayer')) {
        isMultiplayer = Boolean(fixture.isMultiplayer);
      } else if (hasOwn(fixture, 'sharedData') && fixture.sharedData !== null) {
        isMultiplayer = true;
      }
      if (isRecord(fixture.user)) {
        mockUser = { ...mockUser, ...fixture.user };
      }
      if (Array.isArray(fixture.members)) {
        members = fixture.members;
      } else {
        members = [mockUser];
      }
      if (isRecord(fixture.memberActivity)) {
        memberActivity = fixture.memberActivity;
      }
    }

    function getRuntimeFixture() {
      return {
        __a1zapDevFixture: true,
        data: appData,
        sharedData,
        myPersonalData,
        isMultiplayer,
        user: mockUser,
        members,
        memberActivity,
      };
    }

    function hasDevData() {
      return appData !== null || sharedData !== null || myPersonalData !== null || isMultiplayer;
    }

    function hydrateDevData() {
      try {
        const raw = localStorage.getItem(devDataStorageKey);
        if (!raw) return;

        const saved = JSON.parse(raw);
        if (isRecord(saved) && saved.__a1zapDevFixture === true) {
          applyRuntimeFixture(saved);
        } else {
          appData = saved;
        }
      } catch (err) {
        console.warn('[A1Zap Dev] Failed to restore saved JSON data:', err);
      }
    }

    function saveDevData() {
      try {
        localStorage.setItem(devDataStorageKey, JSON.stringify(getRuntimeFixture()));
        updateDevDataButton();
      } catch (err) {
        console.warn('[A1Zap Dev] Failed to save JSON data:', err);
      }
    }

    function clearDevData() {
      resetRuntimeData();
      try {
        localStorage.removeItem(devDataStorageKey);
      } catch (err) {
        console.warn('[A1Zap Dev] Failed to clear saved JSON data:', err);
      }
      updateDevDataButton();
    }

    function updateDevDataButton() {
      const button = document.getElementById('dev-data-button');
      if (!button) return;

      const loaded = hasDevData();
      button.textContent = loaded ? 'JSON Loaded' : 'Load JSON';
      button.classList.toggle('has-data', loaded);
    }

    function setDevDataStatus(message, tone) {
      const status = document.getElementById('dev-data-status');
      if (!status) return;

      status.textContent = message || '';
      status.className = 'dev-data-status' + (tone ? ' ' + tone : '');
    }

    function getTargetPayload(target) {
      if (target === 'fixture') {
        const fixture = getRuntimeFixture();
        delete fixture.__a1zapDevFixture;
        return fixture;
      }
      if (target === 'sharedData') return sharedData;
      if (target === 'myPersonalData') return myPersonalData;
      return appData;
    }

    function formatJson(value) {
      return value === null || typeof value === 'undefined'
        ? ''
        : JSON.stringify(value, null, 2);
    }

    function openDevDataModal() {
      const modal = document.getElementById('dev-data-modal');
      const input = document.getElementById('dev-data-input');
      const target = document.getElementById('dev-data-target');
      const file = document.getElementById('dev-data-file');
      if (!modal || !input || !target) return;

      target.value = 'data';
      input.value = formatJson(getTargetPayload(target.value));
      if (file) file.value = '';
      setDevDataStatus('', '');
      modal.hidden = false;
      setTimeout(() => input.focus(), 0);
    }

    function closeDevDataModal() {
      const modal = document.getElementById('dev-data-modal');
      if (modal) modal.hidden = true;
    }

    function applyDevDataFromModal() {
      const input = document.getElementById('dev-data-input');
      const target = document.getElementById('dev-data-target');
      if (!input || !target) return;

      const raw = input.value.trim();
      if (!raw) {
        setDevDataStatus('Choose a file or paste JSON first.', 'error');
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid JSON';
        setDevDataStatus('Invalid JSON: ' + message, 'error');
        return;
      }

	    try {
	      if (target.value === 'fixture') {
	        resetRuntimeData();
	        applyRuntimeFixture(parsed);
	      } else if (target.value === 'sharedData') {
          sharedData = parsed;
          isMultiplayer = true;
        } else if (target.value === 'myPersonalData') {
          myPersonalData = parsed;
        } else {
          appData = parsed;
          isMultiplayer = false;
        }

        saveDevData();
        renderCurrentApp();
        setDevDataStatus('JSON applied.', 'success');
        closeDevDataModal();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to apply JSON';
        setDevDataStatus(message, 'error');
      }
    }

    function scheduleRender() {
      if (renderQueued) return;
      renderQueued = true;
      queueMicrotask(() => {
        renderQueued = false;
        renderCurrentApp();
      });
    }

    function renderCurrentApp() {
      if (currentApp) {
        renderApp(currentApp);
      }
    }

    function attachDevDataEvents() {
      document.getElementById('dev-data-button')?.addEventListener('click', openDevDataModal);
      document.getElementById('dev-data-close')?.addEventListener('click', closeDevDataModal);
      document.getElementById('dev-data-cancel')?.addEventListener('click', closeDevDataModal);
      document.getElementById('dev-data-apply')?.addEventListener('click', applyDevDataFromModal);
      document.getElementById('dev-data-clear')?.addEventListener('click', () => {
        clearDevData();
        renderCurrentApp();
        closeDevDataModal();
      });
      document.getElementById('dev-data-modal')?.addEventListener('click', (event) => {
        if (event.target === event.currentTarget) {
          closeDevDataModal();
        }
      });
      document.getElementById('dev-data-target')?.addEventListener('change', (event) => {
        const input = document.getElementById('dev-data-input');
        if (input && !input.value.trim()) {
          input.value = formatJson(getTargetPayload(event.target.value));
        }
      });
      document.getElementById('dev-data-file')?.addEventListener('change', async (event) => {
        const file = event.target.files && event.target.files[0];
        const input = document.getElementById('dev-data-input');
        if (!file || !input) return;

        try {
          input.value = await file.text();
          setDevDataStatus('Loaded ' + file.name + '.', 'success');
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unable to read file';
          setDevDataStatus(message, 'error');
        }
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeDevDataModal();
      });
    }

    hydrateDevData();
    attachDevDataEvents();
    updateDevDataButton();

    // WebSocket for hot reload
    const ws = new WebSocket('ws://localhost:${port}');

    ws.onopen = () => {
      console.log('[A1Zap Dev] Hot reload connected');
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'reload') {
          console.log('[A1Zap Dev] File changed, reloading...');
          loadApp();
        }
      } catch (err) {
        console.error('[A1Zap Dev] WebSocket message error:', err);
      }
    };

    ws.onerror = (err) => {
      console.warn('[A1Zap Dev] WebSocket error - hot reload disabled');
    };

    ws.onclose = () => {
      console.warn('[A1Zap Dev] WebSocket closed - hot reload disabled');
    };

    async function loadApp() {
      try {
        const res = await fetch('/app-code');
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to fetch app code');
        }

        // Code is already transpiled by the server
        const transpiledCode = await res.text();

        // Get all icon names for injection
        const icons = LucideIcons;
        const iconNames = Object.keys(icons).filter(key =>
          /^[A-Z][a-zA-Z0-9]*$/.test(key) &&
          typeof icons[key] === 'object' &&
          key !== 'Icon' &&
          key !== 'createLucideIcon'
        );

        console.log('[A1Zap Dev] Available icons:', iconNames.length);

        // Build icon variable declarations
        const iconDefs = iconNames.map(name => \`const \${name} = icons["\${name}"];\`).join('\\n');

        // Wrap the transpiled code in a factory function
        const wrappedCode = \`
          (function(React, useState, useEffect, useMemo, useCallback, useRef, useContext, createContext, useReducer, useLayoutEffect, icons) {
            const { createElement, Fragment } = React;

            // Inject all Lucide icons
            \${iconDefs}

            \${transpiledCode}

            return typeof App !== 'undefined' ? App : function() {
              return createElement('div', { style: { padding: 20 } }, 'No App component found');
            };
          })
        \`;

        const factory = eval(wrappedCode);
        const App = factory(
          React,
          React.useState,
          React.useEffect,
          React.useMemo,
          React.useCallback,
          React.useRef,
          React.useContext,
          React.createContext,
          React.useReducer,
          React.useLayoutEffect,
          icons
        );

        renderApp(App);

        console.log('[A1Zap Dev] App loaded successfully');
      } catch (err) {
        console.error('[A1Zap Dev] Error loading app:', err);
        document.getElementById('root').innerHTML =
          '<div class="error-display">' +
          '<h3>Error Loading App</h3>' +
          '<pre>' + escapeHtml(err.message) + '</pre>' +
          '</div>';
      }
    }

    function renderApp(App) {
      const rootEl = document.getElementById('root');
      if (!rootEl) return;

      currentApp = App;
      if (!currentRoot) {
        currentRoot = createRoot(rootEl);
      }

      currentRoot.render(React.createElement(App, {
        user: mockUser,
        data: appData,
        setData: (d) => {
          appData = typeof d === 'function' ? d(appData) : d;
          saveDevData();
          console.log('[A1Zap Dev] Data updated:', appData);
          scheduleRender();
        },
        isMultiplayer,
        sharedData,
        setSharedData: (d) => {
          sharedData = typeof d === 'function' ? d(sharedData) : d;
          isMultiplayer = true;
          saveDevData();
          console.log('[A1Zap Dev] Shared data updated:', sharedData);
          scheduleRender();
        },
        patchSharedData: (patch) => {
          const resolvedPatch = typeof patch === 'function' ? patch(sharedData) : patch;
          if (!isRecord(resolvedPatch)) {
            console.warn('[A1Zap Dev] patchSharedData expected an object patch:', resolvedPatch);
            return;
          }
          sharedData = { ...(isRecord(sharedData) ? sharedData : {}), ...resolvedPatch };
          isMultiplayer = true;
          saveDevData();
          console.log('[A1Zap Dev] Shared data patched:', sharedData);
          scheduleRender();
        },
        myPersonalData,
        setMyPersonalData: (d) => {
          myPersonalData = typeof d === 'function' ? d(myPersonalData) : d;
          saveDevData();
          console.log('[A1Zap Dev] Personal data updated:', myPersonalData);
          scheduleRender();
        },
        pushToSharedArray: (key, item) => {
          const base = isRecord(sharedData) ? sharedData : {};
          const current = Array.isArray(base[key]) ? base[key] : [];
          sharedData = { ...base, [key]: [...current, item] };
          isMultiplayer = true;
          saveDevData();
          console.log('[A1Zap Dev] Shared array pushed:', key, item);
          scheduleRender();
        },
        members,
        memberActivity,
      }));
    }

    function escapeHtml(str) {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    // Initial load
    loadApp();
  </script>
</body>
</html>`;
}

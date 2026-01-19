import type { AppConfig } from "../config.js";

/**
 * Generate the preview HTML for the dev server
 */
export function getPreviewHTML(config: AppConfig, port: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>${config.name} - A1Zap Dev</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/sucrase@3/dist/sucrase.min.js"></script>
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
    
    .dev-banner button:hover {
      background: #22c55e;
      transform: translateY(-1px);
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
  </style>
</head>
<body>
  <div class="dev-banner">
    <div class="dev-banner-left">
      <span class="dev-banner-logo">A1Zap</span>
      <span class="dev-banner-app">${config.name}</span>
      <span class="dev-banner-version">v${config.version}</span>
    </div>
    <button onclick="location.reload()">↻ Reload</button>
  </div>
  <div id="app-container">
    <div id="root">
      <div class="loading">Loading app...</div>
    </div>
  </div>
  
  <script>
    const mockUser = { 
      id: 'dev-user-123', 
      name: 'Developer', 
      email: 'dev@localhost',
      imageUrl: null
    };
    
    let appData = null;
    let sharedData = null;
    
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
        if (!res.ok) throw new Error('Failed to fetch app code');
        const code = await res.text();
        
        // Strip imports and transform
        let processed = code
          // Remove import statements
          .replace(/^import[\\s\\S]*?from\\s+['"][^'"]+['"];?\\s*\\n?/gm, '')
          // Handle default function export
          .replace(/export\\s+default\\s+function\\s+(\\w+)/g, 'function App')
          // Handle default const/expression export
          .replace(/export\\s+default\\s+/g, 'const App = ');
        
        const { code: transformed } = Sucrase.transform(
          \`(function(React, useState, useEffect, useMemo, useCallback, useRef, useContext, createContext) {
            const { createElement, Fragment } = React;
            \${processed}
            return typeof App !== 'undefined' ? App : function() { 
              return createElement('div', { style: { padding: 20 } }, 'No App component found');
            };
          })\`,
          { transforms: ['typescript', 'jsx'] }
        );
        
        const factory = eval(transformed);
        const App = factory(
          React,
          React.useState,
          React.useEffect,
          React.useMemo,
          React.useCallback,
          React.useRef,
          React.useContext,
          React.createContext
        );
        
        // Clear previous root
        const rootEl = document.getElementById('root');
        rootEl.innerHTML = '';
        
        // Create new root and render
        const root = ReactDOM.createRoot(rootEl);
        root.render(React.createElement(App, {
          user: mockUser,
          data: appData,
          setData: (d) => { 
            appData = typeof d === 'function' ? d(appData) : d;
            console.log('[A1Zap Dev] Data updated:', appData);
          },
          isMultiplayer: false,
          sharedData: sharedData,
          setSharedData: (d) => { 
            sharedData = typeof d === 'function' ? d(sharedData) : d;
            console.log('[A1Zap Dev] Shared data updated:', sharedData);
          },
          members: [mockUser],
          memberActivity: {},
        }));
        
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

import * as vscode from "vscode";

export function webviewHtml(webview: vscode.Webview, _extUri: vscode.Uri): string {
  const nonce = getNonce();
  const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: var(--vscode-editor-font-family), monospace;
         font-size: var(--vscode-editor-font-size, 13px);
         color: var(--vscode-editor-foreground);
         background: var(--vscode-editor-background); height: 100vh; display: flex; flex-direction: column; }
  header { display: flex; align-items: center; gap: 12px; padding: 8px 12px;
           border-bottom: 1px solid var(--vscode-panel-border); }
  header h1 { font-size: 13px; margin: 0; font-weight: 600; }
  header .spacer { flex: 1; }
  button { background: var(--vscode-button-background); color: var(--vscode-button-foreground);
           border: none; padding: 4px 10px; cursor: pointer; border-radius: 2px; font-size: 12px; }
  button:hover:not(:disabled) { background: var(--vscode-button-hoverBackground); }
  button:disabled { opacity: 0.5; cursor: not-allowed;
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground); }
  button.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
  button.mini { padding: 2px 6px; font-size: 11px; }
  button.danger { background: var(--vscode-errorForeground, #c74e39); color: #fff; }
  button.danger:hover:not(:disabled) { background: #d95f4a; }
  button.settings { background: transparent; border: 1px solid var(--vscode-panel-border);
                    color: var(--vscode-descriptionForeground, #888); padding: 2px 8px;
                    font-size: 10px; font-weight: 500; opacity: 0.7; }
  button.settings:hover:not(:disabled) { opacity: 1; background: var(--vscode-toolbar-hoverBackground, rgba(128,128,128,0.15)); }
  button.settings.warn { color: #d2b24c; border-color: rgba(210, 178, 76, 0.5); }
  button.settings.warn:hover:not(:disabled) { background: rgba(210, 178, 76, 0.12); }
  button.settings.ok { color: #73c991; border-color: rgba(115, 201, 145, 0.4); }
  .panes { flex: 1; display: grid; grid-template-columns: 1fr 1fr 1fr 14px; gap: 1px;
           background: var(--vscode-panel-border); overflow: hidden; }
  .pane { background: var(--vscode-editor-background); overflow: auto; display: flex; flex-direction: column; }
  .minimap { position: relative; background: var(--vscode-editorWidget-background); overflow: hidden; }
  .minimap-bar { position: absolute; left: 2px; right: 2px; min-height: 3px; border-radius: 1px; cursor: pointer; }
  .minimap-bar:hover { outline: 1px solid var(--vscode-focusBorder); }
  .minimap-bar.resolved { background: var(--vscode-testing-iconPassed, #73c991); opacity: 0.75; }
  .minimap-bar.unresolved { background: var(--vscode-editorWarning-foreground, #cca700); }
  .minimap-bar.current { outline: 1px solid var(--vscode-focusBorder); }
  .pane-header { padding: 6px 10px; font-size: 11px; font-weight: 600; text-transform: uppercase;
                 letter-spacing: 0.5px; border-bottom: 1px solid var(--vscode-panel-border);
                 position: sticky; top: 0; background: var(--vscode-editorWidget-background); z-index: 1; }
  .pane-body { padding: 4px 0; white-space: pre; line-height: 1.5; }
  .history-section { border-bottom: 1px solid var(--vscode-panel-border);
                     background: var(--vscode-editorWidget-background); font-size: 11px;
                     position: sticky; top: 27px; z-index: 1; }
  .history-toggle { padding: 3px 10px; cursor: pointer; user-select: none;
                    display: flex; align-items: center; gap: 4px; opacity: 0.75; font-size: 10px;
                    text-transform: uppercase; letter-spacing: 0.4px; font-weight: 600; }
  .history-toggle:hover { opacity: 1; }
  .history-toggle .caret { transition: transform 0.15s; font-size: 10px; }
  .history-section.collapsed .history-list { display: none; }
  .history-section.collapsed .history-toggle .caret { transform: rotate(-90deg); display: inline-block; }
  .history-list { padding: 0 8px 4px; max-height: 130px; overflow: auto; }
  .history-item { padding: 3px 4px; cursor: pointer; border-radius: 2px;
                  display: grid; grid-template-columns: auto auto 1fr; gap: 6px; align-items: baseline; }
  .history-item + .history-item { border-top: 1px dashed rgba(128,128,128,0.15); }
  .history-item:hover { background: rgba(128,128,128,0.1); }
  .history-item .hash { font-family: var(--vscode-editor-font-family), monospace;
                        color: var(--vscode-textPreformat-foreground, #d19a66); font-size: 10px; }
  .history-item .meta { opacity: 0.65; font-size: 10px; white-space: nowrap; }
  .history-item .subject { white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                           grid-column: 1 / -1; font-size: 11px; opacity: 0.9; }
  .history-empty { padding: 4px 10px; opacity: 0.5; font-style: italic; font-size: 10px; }
  .line { padding: 0 10px 0 24px; position: relative; }
  .line.common { color: var(--vscode-editor-foreground); opacity: 0.58; }
  .line.yours {
    background: var(--vscode-merge-currentContentBackground, rgba(64, 160, 255, 0.22));
    opacity: 1;
  }
  .line.yours::before {
    content: '−'; position: absolute; left: 8px; top: 0;
    color: var(--vscode-gitDecoration-deletedResourceForeground, #f97583);
    font-weight: 700; opacity: 0.9;
  }
  .line.theirs {
    background: var(--vscode-merge-incomingContentBackground, rgba(120, 200, 120, 0.22));
    opacity: 1;
  }
  .line.theirs::before {
    content: '+'; position: absolute; left: 8px; top: 0;
    color: var(--vscode-gitDecoration-untrackedResourceForeground, #85e89d);
    font-weight: 700; opacity: 0.9;
  }
  .line.base { background: rgba(180, 180, 180, 0.1); font-style: italic; opacity: 0.8; }
  .line.base::before { content: '·'; position: absolute; left: 8px; opacity: 0.5; }
  .conflict-block { margin: 4px 0; border: 1px solid var(--vscode-panel-border); border-radius: 3px; overflow: hidden;
                    transition: outline-color 0.3s ease; outline: 2px solid transparent; outline-offset: -1px; }
  .conflict-block.resolved { opacity: 0.6; }
  .conflict-block.unresolved { border-color: var(--vscode-editorWarning-foreground); }
  .conflict-block.focused { outline-color: var(--vscode-focusBorder); opacity: 1; }
  .conflict-sep {
    padding: 3px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;
    color: var(--vscode-descriptionForeground, #888); opacity: 0.85;
    border-top: 1px dashed var(--vscode-panel-border);
    border-bottom: 1px dashed var(--vscode-panel-border);
    text-align: center; background: var(--vscode-editorWidget-background);
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .conflict-sep .arrow { font-size: 13px; opacity: 0.8; }
  .conflict-slot { scroll-margin: 40px; position: relative; margin: 2px 0; }
  #yours .conflict-slot {
    border-left: 3px solid var(--vscode-merge-currentHeaderBackground, rgba(64, 160, 255, 0.75));
    background: rgba(64, 160, 255, 0.04);
  }
  #theirs .conflict-slot {
    border-right: 3px solid var(--vscode-merge-incomingHeaderBackground, rgba(120, 200, 120, 0.75));
    background: rgba(120, 200, 120, 0.04);
  }
  .slot-accept { position: absolute; top: 4px; z-index: 3;
                 width: 28px; height: 22px;
                 background: var(--vscode-button-background);
                 color: var(--vscode-button-foreground);
                 border: 1px solid rgba(0,0,0,0.25);
                 border-radius: 4px; cursor: pointer;
                 font-size: 14px; font-weight: 700; line-height: 1;
                 display: flex; align-items: center; justify-content: center;
                 box-shadow: 0 2px 5px rgba(0,0,0,0.35);
                 opacity: 0.65; transition: opacity 0.15s, transform 0.15s, background 0.15s; }
  .conflict-slot:hover .slot-accept { opacity: 1; }
  .slot-accept:hover { background: var(--vscode-button-hoverBackground); transform: scale(1.1); }
  .slot-accept.yours { right: 6px; }
  .slot-accept.theirs { left: 6px; }
  .btn-accept-yours { background: #2d7fd1 !important; color: #fff !important; font-weight: 600 !important; }
  .btn-accept-yours:hover:not(:disabled) { background: #3a8cde !important; }
  .btn-accept-theirs { background: #3f9a4f !important; color: #fff !important; font-weight: 600 !important; }
  .btn-accept-theirs:hover:not(:disabled) { background: #4aab5c !important; }
  .btn-ai { background: #7c5cff !important; color: #fff !important; font-weight: 600 !important; }
  .btn-ai:hover:not(:disabled) { background: #8b6dff !important; }
  .btn-ai:disabled { opacity: 0.6; }
  .btn-ai-accept { background: #6366f1 !important; color: #fff !important; font-weight: 600 !important; }
  .conflict-actions { gap: 6px !important; }
  .ai-preview { margin: 6px 8px 10px; padding: 8px; background: rgba(124,92,255,0.08);
                border: 1px solid rgba(124,92,255,0.35); border-radius: 4px; }
  .ai-preview-header { display: flex; align-items: center; gap: 8px; font-size: 11px;
                       font-weight: 600; margin-bottom: 6px; color: #a78bfa; }
  .ai-preview-header .spacer { flex: 1; }
  .ai-text { white-space: pre-wrap; font-family: var(--vscode-editor-font-family), monospace;
             font-size: 12px; line-height: 1.5; background: var(--vscode-editor-background);
             padding: 8px; border-radius: 3px; max-height: 300px; overflow: auto;
             border: 1px solid var(--vscode-panel-border); }
  .ai-loading { opacity: 0.7; font-style: italic; font-size: 11px; padding: 8px; }
  .ai-error { color: var(--vscode-errorForeground); font-size: 11px; padding: 8px; }
  .ai-dots::after { content: '.'; animation: dots 1.2s steps(4, end) infinite; }
  @keyframes dots { 0%,20% { content:'.'; } 40% { content:'..'; } 60%,100% { content:'...'; } }
  .conflict-header { padding: 4px 10px; font-size: 11px; background: var(--vscode-editorWidget-background);
                     display: flex; align-items: center; gap: 6px; }
  .conflict-header .label { font-weight: 600; }
  .conflict-actions { display: flex; gap: 4px; margin-left: auto; }
  .status-ok { color: var(--vscode-testing-iconPassed, #73c991); }
  .status-warn { color: var(--vscode-editorWarning-foreground, #cca700); }
</style>
</head>
<body>
<header>
  <h1 id="filename">Merge Resolver</h1>
  <span id="status" class="status-warn">—</span>
  <button id="ai-key" class="settings warn" title="Set Anthropic API key">⚠ AI key</button>
  <span class="spacer"></span>
  <button id="prev" class="secondary mini" title="Previous conflict (Shift+F7)">↑ Prev</button>
  <button id="next" class="secondary mini" title="Next conflict (F7)">↓ Next</button>
  <button id="undo" class="secondary mini" title="Undo last action (Cmd/Ctrl+Z)" disabled>↶ Undo</button>
  <button id="abort" class="danger mini" title="Abort merge/rebase and discard resolutions" style="display:none">✕ Abort</button>
  <button id="save" disabled>Save & Close</button>
</header>
<div class="panes">
  <div class="pane">
    <div class="pane-header" id="yours-label">Yours</div>
    <div class="history-section collapsed" id="yours-history-section">
      <div class="history-toggle" data-toggle="yours"><span class="caret">▾</span> <span>⌚ Recent commits</span></div>
      <div class="history-list" id="yours-history"></div>
    </div>
    <div class="pane-body" id="yours"></div>
  </div>
  <div class="pane"><div class="pane-header">Result</div><div class="pane-body" id="result"></div></div>
  <div class="pane">
    <div class="pane-header" id="theirs-label">Theirs</div>
    <div class="history-section collapsed" id="theirs-history-section">
      <div class="history-toggle" data-toggle="theirs"><span class="caret">▾</span> <span>⌚ Recent commits</span></div>
      <div class="history-list" id="theirs-history"></div>
    </div>
    <div class="pane-body" id="theirs"></div>
  </div>
  <div class="minimap" id="minimap" title="Click to jump"></div>
</div>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  let state = { chunks: [], resolutions: new Map(), canUndo: false, gitState: 'none', commitHistory: { yours: [], theirs: [] }, hasAiKey: false };
  let currentIdx = -1;
  let aiSuggestions = new Map();

  function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function renderLines(text, klass) {
    if (text === "") return '<div class="line '+klass+'">&nbsp;</div>';
    return text.split('\\n').map(l => '<div class="line '+klass+'">'+(esc(l)||'&nbsp;')+'</div>').join('');
  }

  function wrapSlot(id, side, inner) {
    const arrow = side === 'yours' ? '»' : '«';
    const title = side === 'yours' ? 'Accept Yours' : 'Accept Theirs';
    const btn = '<button class="slot-accept '+side+'" data-action="'+side+'" data-id="'+id+'" title="'+title+'">'+arrow+'</button>';
    return '<div class="conflict-slot" data-conflict-id="'+id+'">'+btn+inner+'</div>';
  }

  function render() {
    const yours = [], theirs = [], result = [];
    let unresolved = 0;

    for (const c of state.chunks) {
      if (c.kind === 'common') {
        yours.push(renderLines(c.text, 'common'));
        theirs.push(renderLines(c.text, 'common'));
        result.push(renderLines(c.text, 'common'));
        continue;
      }
      yours.push(wrapSlot(c.id, 'yours', renderLines(c.yours, 'yours')));
      theirs.push(wrapSlot(c.id, 'theirs', renderLines(c.theirs, 'theirs')));
      const res = state.resolutions.get(c.id);
      if (!res) unresolved++;
      result.push(renderConflictBlock(c, res));
    }

    document.getElementById('yours').innerHTML = yours.join('');
    document.getElementById('theirs').innerHTML = theirs.join('');
    document.getElementById('result').innerHTML = result.join('');

    const total = state.chunks.filter(c => c.kind==='conflict').length;
    const resolved = total - unresolved;
    const statusEl = document.getElementById('status');
    if (total === 0) { statusEl.textContent = 'No conflicts'; statusEl.className='status-ok'; }
    else { statusEl.textContent = resolved + '/' + total + ' resolved';
           statusEl.className = unresolved === 0 ? 'status-ok' : 'status-warn'; }

    const saveBtn = document.getElementById('save');
    if (unresolved > 0) {
      saveBtn.disabled = true;
      saveBtn.textContent = unresolved + ' conflict' + (unresolved === 1 ? '' : 's') + ' remaining';
    } else {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save & Close';
    }

    const navDisabled = total === 0;
    document.getElementById('prev').disabled = navDisabled;
    document.getElementById('next').disabled = navDisabled;
    document.getElementById('undo').disabled = !state.canUndo;

    updateMinimap();
  }

  function conflictIds() {
    return state.chunks.filter(c => c.kind === 'conflict').map(c => c.id);
  }

  function scrollToConflict(id) {
    const resultEl = document.querySelector('#result .conflict-block[data-conflict-id="'+id+'"]');
    if (resultEl) {
      resultEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      resultEl.classList.add('focused');
      setTimeout(() => resultEl.classList.remove('focused'), 1200);
    }
    for (const paneId of ['yours', 'theirs']) {
      const el = document.querySelector('#'+paneId+' .conflict-slot[data-conflict-id="'+id+'"]');
      if (el) el.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
    currentIdx = conflictIds().indexOf(id);
    highlightMinimapCurrent();
  }

  function nav(delta) {
    const ids = conflictIds();
    if (ids.length === 0) return;
    if (currentIdx < 0) currentIdx = delta > 0 ? -1 : 0;
    currentIdx = (currentIdx + delta + ids.length) % ids.length;
    scrollToConflict(ids[currentIdx]);
  }

  function updateMinimap() {
    const minimap = document.getElementById('minimap');
    const result = document.getElementById('result');
    const pane = result.closest('.pane');
    if (!pane) return;
    const total = pane.scrollHeight || 1;
    const bars = [];
    for (const c of state.chunks) {
      if (c.kind !== 'conflict') continue;
      const block = document.querySelector('#result .conflict-block[data-conflict-id="'+c.id+'"]');
      if (!block) continue;
      const top = (block.offsetTop / total) * 100;
      const height = Math.max(0.8, (block.offsetHeight / total) * 100);
      const resolved = state.resolutions.has(c.id);
      bars.push('<div class="minimap-bar '+(resolved?'resolved':'unresolved')+'" '+
        'style="top:'+top.toFixed(2)+'%;height:'+height.toFixed(2)+'%" '+
        'data-id="'+c.id+'" title="Conflict #'+(c.id+1)+(resolved?' (resolved)':'')+'"></div>');
    }
    minimap.innerHTML = bars.join('');
    highlightMinimapCurrent();
  }

  function highlightMinimapCurrent() {
    const ids = conflictIds();
    const curId = currentIdx >= 0 && currentIdx < ids.length ? ids[currentIdx] : -1;
    document.querySelectorAll('.minimap-bar').forEach(b => {
      b.classList.toggle('current', Number(b.dataset.id) === curId);
    });
  }

  const SEP = '<div class="conflict-sep"><span class="arrow">↓</span><span>or</span><span class="arrow">↓</span></div>';

  function renderConflictBlock(c, res) {
    const resolvedClass = res ? 'resolved' : 'unresolved';
    let body;
    if (!res) {
      body = renderLines(c.yours, 'yours') + SEP + renderLines(c.theirs, 'theirs');
    } else if (res.kind === 'yours') body = renderLines(c.yours, 'yours');
    else if (res.kind === 'theirs') body = renderLines(c.theirs, 'theirs');
    else if (res.kind === 'base') body = renderLines(c.base || '', 'base');
    else if (res.kind === 'both') {
      body = res.order === 'yt'
        ? renderLines(c.yours, 'yours') + SEP + renderLines(c.theirs, 'theirs')
        : renderLines(c.theirs, 'theirs') + SEP + renderLines(c.yours, 'yours');
    }

    const resetBtn = res ? '<button class="mini secondary" data-action="reset" data-id="'+c.id+'" title="Reset">⟲</button>' : '';
    const baseBtn = c.base !== null ? '<button class="mini secondary" data-action="base" data-id="'+c.id+'" title="Use base">Base</button>' : '';
    const ai = aiSuggestions.get(c.id);
    const aiBtnDisabled = ai && ai.status === 'loading' ? 'disabled' : '';
    const aiPreview = ai ? renderAiPreview(c.id, ai) : '';

    return '<div class="conflict-block '+resolvedClass+'" data-conflict-id="'+c.id+'">' +
      '<div class="conflict-header">' +
      '<span class="label">Conflict #'+(c.id+1)+'</span>' +
      '<div class="conflict-actions">' +
        '<button class="mini btn-accept-yours" data-action="yours" data-id="'+c.id+'" title="Accept Yours">» Yours</button>' +
        '<button class="mini btn-accept-theirs" data-action="theirs" data-id="'+c.id+'" title="Accept Theirs">Theirs «</button>' +
        '<button class="mini btn-ai" data-action="ai" data-id="'+c.id+'" title="AI Suggest" '+aiBtnDisabled+'>✨ AI</button>' +
        '<button class="mini secondary" data-action="both-yt" data-id="'+c.id+'" title="Both, Yours first">Both Y→T</button>' +
        '<button class="mini secondary" data-action="both-ty" data-id="'+c.id+'" title="Both, Theirs first">Both T→Y</button>' +
        baseBtn + resetBtn +
      '</div></div>' +
      '<div>'+body+'</div>' +
      aiPreview +
      '</div>';
  }

  function renderAiPreview(id, ai) {
    if (ai.status === 'loading') {
      return '<div class="ai-preview" data-ai-id="'+id+'">' +
        '<div class="ai-preview-header">✨ AI suggestion <span class="ai-dots"></span><span class="spacer"></span>' +
        '<button class="mini secondary" data-action="ai-dismiss" data-id="'+id+'">Cancel</button></div>' +
        '<div class="ai-text">'+esc(ai.text || '')+'</div></div>';
    }
    if (ai.status === 'error') {
      return '<div class="ai-preview" data-ai-id="'+id+'">' +
        '<div class="ai-preview-header">✨ AI error<span class="spacer"></span>' +
        '<button class="mini secondary" data-action="ai-retry" data-id="'+id+'">Retry</button>' +
        '<button class="mini secondary" data-action="ai-dismiss" data-id="'+id+'">Dismiss</button></div>' +
        '<div class="ai-error">'+esc(ai.error || 'Unknown error')+'</div></div>';
    }
    return '<div class="ai-preview" data-ai-id="'+id+'">' +
      '<div class="ai-preview-header">✨ AI suggestion<span class="spacer"></span>' +
      '<button class="mini btn-ai-accept" data-action="ai-accept" data-id="'+id+'">Accept</button>' +
      '<button class="mini secondary" data-action="ai-retry" data-id="'+id+'">Retry</button>' +
      '<button class="mini secondary" data-action="ai-dismiss" data-id="'+id+'">Dismiss</button></div>' +
      '<div class="ai-text">'+esc(ai.text || '')+'</div></div>';
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (btn) {
      const id = Number(btn.dataset.id);
      const action = btn.dataset.action;
      if (action === 'reset') { vscode.postMessage({ type:'reset', id }); return; }
      if (action === 'ai') {
        aiSuggestions.set(id, { status: 'loading', text: '' });
        render();
        vscode.postMessage({ type:'aiSuggest', id });
        return;
      }
      if (action === 'ai-accept') {
        const ai = aiSuggestions.get(id);
        if (ai && ai.status === 'done') {
          aiSuggestions.delete(id);
          vscode.postMessage({ type:'resolve', id, resolution: { kind:'custom', text: ai.text } });
        }
        return;
      }
      if (action === 'ai-retry') {
        aiSuggestions.set(id, { status: 'loading', text: '' });
        render();
        vscode.postMessage({ type:'aiSuggest', id });
        return;
      }
      if (action === 'ai-dismiss') {
        aiSuggestions.delete(id);
        render();
        return;
      }
      let resolution;
      if (action === 'yours') resolution = { kind:'yours' };
      else if (action === 'theirs') resolution = { kind:'theirs' };
      else if (action === 'base') resolution = { kind:'base' };
      else if (action === 'both-yt') resolution = { kind:'both', order:'yt' };
      else if (action === 'both-ty') resolution = { kind:'both', order:'ty' };
      vscode.postMessage({ type:'resolve', id, resolution });
    }
  });

  document.getElementById('save').addEventListener('click', () => {
    vscode.postMessage({ type:'save' });
  });
  document.getElementById('prev').addEventListener('click', () => nav(-1));
  document.getElementById('next').addEventListener('click', () => nav(1));
  document.getElementById('undo').addEventListener('click', () => vscode.postMessage({ type:'undo' }));
  document.getElementById('abort').addEventListener('click', () => vscode.postMessage({ type:'abort' }));
  document.getElementById('ai-key').addEventListener('click', () => vscode.postMessage({ type:'setAiKey' }));

  function renderHistory(side, commits) {
    const listEl = document.getElementById(side + '-history');
    const sectionEl = document.getElementById(side + '-history-section');
    if (!commits || commits.length === 0) {
      listEl.innerHTML = '<div class="history-empty">No commit history for this file</div>';
      sectionEl.style.display = 'none';
      return;
    }
    sectionEl.style.display = '';
    listEl.innerHTML = commits.map(c =>
      '<div class="history-item" data-hash="'+esc(c.hash)+'" title="Click to copy hash">' +
        '<span class="hash">'+esc(c.hash)+'</span>' +
        '<span class="meta">'+esc(c.author)+' · '+esc(c.when)+'</span>' +
        '<span></span>' +
        '<div class="subject">'+esc(c.subject)+'</div>' +
      '</div>'
    ).join('');
  }

  document.querySelectorAll('.history-toggle').forEach(t => {
    t.addEventListener('click', () => {
      const section = t.closest('.history-section');
      section.classList.toggle('collapsed');
    });
  });

  document.querySelectorAll('.history-list').forEach(l => {
    l.addEventListener('click', (e) => {
      const item = e.target.closest('.history-item');
      if (!item) return;
      const hash = item.dataset.hash;
      if (navigator.clipboard) navigator.clipboard.writeText(hash).catch(() => {});
      item.style.background = 'rgba(120,200,120,0.3)';
      setTimeout(() => { item.style.background = ''; }, 400);
    });
  });

  document.getElementById('minimap').addEventListener('click', (e) => {
    const bar = e.target.closest('.minimap-bar');
    if (bar) scrollToConflict(Number(bar.dataset.id));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'F7') { e.preventDefault(); nav(e.shiftKey ? -1 : 1); return; }
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault(); vscode.postMessage({ type:'undo' }); return;
    }
  });

  window.addEventListener('resize', updateMinimap);

  function updateAiText(id) {
    const el = document.querySelector('.ai-preview[data-ai-id="'+id+'"] .ai-text');
    if (el) {
      const ai = aiSuggestions.get(id);
      if (ai) el.textContent = ai.text || '';
    }
  }

  window.addEventListener('message', (ev) => {
    const m = ev.data;
    if (m.type === 'aiStart') {
      aiSuggestions.set(m.id, { status: 'loading', text: '' });
      render();
      return;
    }
    if (m.type === 'aiChunk') {
      const cur = aiSuggestions.get(m.id) || { status: 'loading', text: '' };
      cur.text = (cur.text || '') + m.text;
      aiSuggestions.set(m.id, cur);
      updateAiText(m.id);
      return;
    }
    if (m.type === 'aiDone') {
      aiSuggestions.set(m.id, { status: 'done', text: m.text });
      render();
      return;
    }
    if (m.type === 'aiError') {
      aiSuggestions.set(m.id, { status: 'error', text: '', error: m.error });
      render();
      return;
    }
    if (m.type === 'state') {
      state.chunks = m.chunks;
      state.resolutions = new Map(m.resolutions);
      state.canUndo = !!m.canUndo;
      state.gitState = m.gitState || 'none';
      state.commitHistory = m.commitHistory || { yours: [], theirs: [] };
      state.hasAiKey = !!m.hasAiKey;
      const keyBtn = document.getElementById('ai-key');
      if (state.hasAiKey) {
        keyBtn.textContent = '✓ AI key';
        keyBtn.className = 'settings ok';
        keyBtn.title = 'AI key is set — click to update or remove';
      } else {
        keyBtn.textContent = '⚠ AI key';
        keyBtn.className = 'settings warn';
        keyBtn.title = 'Set Anthropic API key to enable AI suggestions';
      }
      renderHistory('yours', state.commitHistory.yours);
      renderHistory('theirs', state.commitHistory.theirs);
      const abortBtn = document.getElementById('abort');
      if (state.gitState === 'rebasing') {
        abortBtn.style.display = '';
        abortBtn.textContent = '✕ Abort Rebase';
      } else if (state.gitState === 'merging') {
        abortBtn.style.display = '';
        abortBtn.textContent = '✕ Abort Merge';
      } else {
        abortBtn.style.display = 'none';
      }
      document.getElementById('filename').textContent = m.fileName.split('/').pop();
      const firstConflict = m.chunks.find(c => c.kind === 'conflict');
      if (firstConflict) {
        document.getElementById('yours-label').textContent = 'Yours · ' + firstConflict.yoursLabel;
        document.getElementById('theirs-label').textContent = 'Theirs · ' + firstConflict.theirsLabel;
      }
      render();
    }
  });

  vscode.postMessage({ type:'ready' });
</script>
</body>
</html>`;
}

function getNonce(): string {
  let s = "";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}

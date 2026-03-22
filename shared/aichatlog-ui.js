/* AIChatLog shared UI — single source of truth for both dashboards */
(function() {
  'use strict';

  // ── Markdown Initialization ──
  function initMarkdown() {
    var md = window.markdownit({
      html: false, linkify: true, typographer: true,
      highlight: function(str, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try { return hljs.highlight(str, {language: lang}).value; } catch(_) {}
        }
        try { return hljs.highlightAuto(str).value; } catch(_) {}
        return '';
      }
    });
    if (window.markdownitFootnote) md.use(window.markdownitFootnote);
    if (window.texmath) md.use(window.texmath, {engine: katex, delimiters: 'dollars'});
    return md;
  }

  // ── XML Tag Processing ──
  function stripXmlTags(text) {
    // 1. Large context blocks → badge + code block
    text = text.replace(/<(system-reminder|ide_selection|available-deferred-tools|task-notification|gitStatus|fast_mode_info|claudeMd|antml:thinking)>([\s\S]*?)<\/\1>/g, function(_, tag, body) {
      var n = body.trim().split('\n').length;
      return '\n`[' + tag + ' (' + n + ' lines)]`\n```\n' + body.trim() + '\n```\n';
    });
    // 2. File opened tags → file badge
    text = text.replace(/<ide_opened_file>[^<]*<\/ide_opened_file>/g, function(m) {
      var f = m.match(/file\s+([^\s]+)/);
      return f ? '`[Opened: ' + f[1].split('/').pop() + ']`' : '`[file opened]`';
    });
    // 3. Command/hook tags → badge + content
    text = text.replace(/<(command-name|command-message|command-args|local-command-caveat|local-command-stdout|user-prompt-submit-hook)>([\s\S]*?)<\/\1>/g, function(_, tag, body) {
      return '`[' + tag + ']` ' + body.trim();
    });
    // 4. Remaining paired tags (supports : in tag name) → badge + keep content
    text = text.replace(/<([a-zA-Z][a-zA-Z0-9_:-]*)(?:\s[^>]*)?>(([\s\S]*?))<\/\1>/g, function(_, tag, body) {
      if (!body.trim()) return '`[' + tag + ']`';
      return '`[' + tag + ']` ' + body.trim();
    });
    // 5. Self-closing tags → badge
    text = text.replace(/<[a-zA-Z][a-zA-Z0-9_:-]*(?:\s[^>]*)?\s*\/>/g, function(m) {
      var tag = m.match(/<([a-zA-Z][a-zA-Z0-9_:-]*)/);
      return tag ? '`[' + tag[1] + ']`' : '';
    });
    // 6. Orphan open/close tags → badge
    text = text.replace(/<\/?([a-zA-Z][a-zA-Z0-9_:-]*)(?:\s[^>]*)?>/g, function(_, tag) {
      return '`[' + tag + ']`';
    });
    return text;
  }

  // ── Content Rendering ──
  // Note: Uses DOMPurify.sanitize() to prevent XSS before setting innerHTML
  function renderContent(parent, text, md) {
    if (!text) return;
    text = stripXmlTags(text);
    var sanitized = DOMPurify.sanitize(md.render(text));
    var div = document.createElement('div');
    div.className = 'md-content';
    div.innerHTML = sanitized;
    parent.appendChild(div);
  }

  // ── Theme Management ──
  var currentTheme = localStorage.getItem('aichatlog-theme') || 'auto';

  function setTheme(mode) {
    currentTheme = mode;
    localStorage.setItem('aichatlog-theme', mode);
    applyTheme();
    updateThemeButtons();
  }

  function applyTheme() {
    var isDark = currentTheme === 'dark' || (currentTheme === 'auto' && window.matchMedia('(prefers-color-scheme:dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  }

  function updateThemeButtons() {
    ['auto','light','dark'].forEach(function(m, i) {
      var b = document.querySelectorAll('.theme-btn')[i];
      if (b) {
        b.classList.toggle('!border-blue-500', m === currentTheme);
        b.classList.toggle('!text-blue-500', m === currentTheme);
      }
    });
  }

  window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change', function() {
    if (currentTheme === 'auto') applyTheme();
  });

  // ── Public API ──
  window.AIChatLogUI = {
    initMarkdown: initMarkdown,
    stripXmlTags: stripXmlTags,
    renderContent: renderContent,
    setTheme: setTheme,
    applyTheme: applyTheme,
    updateThemeButtons: updateThemeButtons,
    getTheme: function() { return currentTheme; }
  };
})();

/**
 * app.js — SPA 路由 + 四个视图
 */
(function () {
  const app = document.getElementById('app');
  const breadcrumb = document.getElementById('breadcrumb');
  const cache = new Map();
  const DATA = window.TRIPITAKA_DATA;

  // --- Helpers ---
  function findCategory(id) {
    return DATA.find(c => c.id === id);
  }

  function findScriptureByPath(scriptPath) {
    for (const cat of DATA) {
      for (const s of cat.scriptures) {
        if (s.path === scriptPath) return { scripture: s, category: cat };
        if (s.children) {
          for (const child of s.children) {
            if (child.path === scriptPath) return { scripture: child, category: cat, parent: s };
          }
        }
      }
    }
    return null;
  }

  function setBreadcrumb(items) {
    breadcrumb.innerHTML = items.map((item, i) => {
      if (i === items.length - 1) return `<span>${item.text}</span>`;
      return `<a href="${item.href}">${item.text}</a><span class="sep">/</span>`;
    }).join('');
  }

  function encodePath(filePath) {
    return filePath.split('/').map(encodeURIComponent).join('/');
  }

  async function fetchMarkdown(filePath) {
    if (cache.has(filePath)) return cache.get(filePath);
    try {
      const resp = await fetch(encodePath(filePath));
      if (!resp.ok) throw new Error(resp.status);
      const text = await resp.text();
      cache.set(filePath, text);
      return text;
    } catch (e) {
      return null;
    }
  }

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Font size ---
  const FONT_SIZES = ['font-small', 'font-medium', 'font-large'];
  const FONT_LABELS = ['小', '中', '大'];
  let currentFontIdx = parseInt(localStorage.getItem('fontSize') || '1', 10);

  function applyFontSize() {
    document.body.classList.remove(...FONT_SIZES);
    document.body.classList.add(FONT_SIZES[currentFontIdx]);
  }

  // --- Pinyin toggle ---
  let pinyinHidden = localStorage.getItem('hidePinyin') === '1';

  function applyPinyin() {
    document.body.classList.toggle('hide-pinyin', pinyinHidden);
  }

  // --- Views ---

  function renderHome() {
    setBreadcrumb([{ text: '首页' }]);
    let html = '<h1 class="page-heading">乾隆大藏经</h1>';
    html += '<div class="category-grid">';
    for (const cat of DATA) {
      if (cat.scriptures.length === 0) continue;
      html += `<a class="category-card" href="#/category/${cat.id}">
        <div class="cat-id">第${cat.id}部</div>
        <div class="cat-name">${cat.name}</div>
        <div class="cat-count">${cat.scriptures.length} 部经典</div>
      </a>`;
    }
    html += '</div>';
    app.innerHTML = html;
  }

  function renderCategory(catId) {
    const cat = findCategory(catId);
    if (!cat) { renderHome(); return; }

    setBreadcrumb([
      { text: '首页', href: '#/' },
      { text: cat.name }
    ]);

    let html = `<h1 class="page-heading">${cat.name}</h1>`;
    html += '<ul class="scripture-list">';
    for (const s of cat.scriptures) {
      const encodedPath = encodeURIComponent(s.path);
      html += `<li class="scripture-item">
        <a href="#/scripture/${encodedPath}">
          <div class="s-title">${s.title || s.path}</div>
          <div class="s-meta">${s.translator || ''} ${s.volumes ? '· ' + s.volumes : ''}</div>
        </a>
      </li>`;
    }
    html += '</ul>';
    app.innerHTML = html;
  }

  function renderScripture(scriptPath) {
    const result = findScriptureByPath(scriptPath);
    if (!result) { renderHome(); return; }
    const { scripture, category, parent } = result;

    const crumbs = [{ text: '首页', href: '#/' }];
    crumbs.push({ text: category.name, href: `#/category/${category.id}` });
    if (parent) {
      crumbs.push({ text: parent.title, href: `#/scripture/${encodeURIComponent(parent.path)}` });
    }
    crumbs.push({ text: scripture.title });
    setBreadcrumb(crumbs);

    let html = '<div class="scripture-info">';
    html += `<h1>${scripture.title}</h1>`;
    if (scripture.translator) html += `<div class="meta-line">译者：${scripture.translator}</div>`;
    if (scripture.volumes) html += `<div class="meta-line">卷数：${scripture.volumes}</div>`;
    if (scripture.category) html += `<div class="meta-line">部类：${scripture.category}</div>`;
    if (scripture.brief) html += `<div class="brief">${scripture.brief}</div>`;
    html += '</div>';

    // Volume links
    if (scripture.files && scripture.files.length > 0) {
      html += '<h2>卷目录</h2>';
      html += '<div class="volume-grid">';
      for (const file of scripture.files) {
        const num = parseInt(file.replace('.md', ''), 10);
        const encodedPath = encodeURIComponent(scripture.path);
        html += `<a class="volume-link" href="#/read/${encodedPath}/${file}">卷 ${num}</a>`;
      }
      html += '</div>';
    }

    // Children
    if (scripture.children && scripture.children.length > 0) {
      html += '<div class="children-section"><h2>附属经品</h2>';
      html += '<ul class="scripture-list">';
      for (const child of scripture.children) {
        const encodedPath = encodeURIComponent(child.path);
        html += `<li class="scripture-item">
          <a href="#/scripture/${encodedPath}">
            <div class="s-title">${child.title}</div>
            <div class="s-meta">${child.volumes || ''}</div>
          </a>
        </li>`;
      }
      html += '</ul></div>';
    }

    app.innerHTML = html;
  }

  async function renderReader(scriptPath, file) {
    const result = findScriptureByPath(scriptPath);
    if (!result) { renderHome(); return; }
    const { scripture, category, parent } = result;

    const crumbs = [{ text: '首页', href: '#/' }];
    crumbs.push({ text: category.name, href: `#/category/${category.id}` });
    if (parent) {
      crumbs.push({ text: parent.title, href: `#/scripture/${encodeURIComponent(parent.path)}` });
    }
    crumbs.push({ text: scripture.title, href: `#/scripture/${encodeURIComponent(scripture.path)}` });
    const fileNum = parseInt(file.replace('.md', ''), 10);
    crumbs.push({ text: `卷 ${fileNum}` });
    setBreadcrumb(crumbs);

    // Show loading
    app.innerHTML = '<div class="loading">加载中...</div>';

    // Toolbar
    let toolbarHtml = '<div class="reader-toolbar">';
    toolbarHtml += '<span style="font-size:0.8rem;color:var(--text-light)">字号：</span>';
    for (let i = 0; i < FONT_SIZES.length; i++) {
      const active = i === currentFontIdx ? ' active' : '';
      toolbarHtml += `<button class="font-btn${active}" data-size="${i}">${FONT_LABELS[i]}</button>`;
    }
    toolbarHtml += `<button class="pinyin-btn">${pinyinHidden ? '显示拼音' : '隐藏拼音'}</button>`;
    toolbarHtml += '</div>';

    // Fetch content
    const filePath = scripture.path + '/' + file;
    const md = await fetchMarkdown(filePath);
    if (md === null) {
      app.innerHTML = toolbarHtml + '<div class="loading">加载失败</div>';
      return;
    }

    const contentHtml = window.MarkdownParser.parse(md);

    // Volume navigation
    const files = scripture.files || [];
    const idx = files.indexOf(file);
    const prevFile = idx > 0 ? files[idx - 1] : null;
    const nextFile = idx < files.length - 1 ? files[idx + 1] : null;
    const encodedPath = encodeURIComponent(scripture.path);

    let navHtml = '<div class="volume-nav">';
    if (prevFile) {
      const pNum = parseInt(prevFile.replace('.md', ''), 10);
      navHtml += `<a href="#/read/${encodedPath}/${prevFile}">← 卷 ${pNum}</a>`;
    } else {
      navHtml += '<span class="disabled">← 上一卷</span>';
    }
    navHtml += `<a href="#/scripture/${encodedPath}">返回目录</a>`;
    if (nextFile) {
      const nNum = parseInt(nextFile.replace('.md', ''), 10);
      navHtml += `<a href="#/read/${encodedPath}/${nextFile}">卷 ${nNum} →</a>`;
    } else {
      navHtml += '<span class="disabled">下一卷 →</span>';
    }
    navHtml += '</div>';

    app.innerHTML = toolbarHtml + '<div class="reader-content">' + contentHtml + '</div>' + navHtml;

    applyFontSize();
    applyPinyin();

    // Bind toolbar events
    app.querySelectorAll('.font-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentFontIdx = parseInt(btn.dataset.size, 10);
        localStorage.setItem('fontSize', currentFontIdx);
        applyFontSize();
        app.querySelectorAll('.font-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    const pinyinBtn = app.querySelector('.pinyin-btn');
    if (pinyinBtn) {
      pinyinBtn.addEventListener('click', () => {
        pinyinHidden = !pinyinHidden;
        localStorage.setItem('hidePinyin', pinyinHidden ? '1' : '0');
        applyPinyin();
        pinyinBtn.textContent = pinyinHidden ? '显示拼音' : '隐藏拼音';
      });
    }
  }

  // --- Router ---
  function route() {
    const hash = location.hash || '#/';
    scrollTop();

    // #/read/{path}/{file}
    const readMatch = hash.match(/^#\/read\/(.+)\/(\d{3}\.md)$/);
    if (readMatch) {
      renderReader(decodeURIComponent(readMatch[1]), readMatch[2]);
      return;
    }

    // #/scripture/{path}
    const scriptMatch = hash.match(/^#\/scripture\/(.+)$/);
    if (scriptMatch) {
      renderScripture(decodeURIComponent(scriptMatch[1]));
      return;
    }

    // #/category/{id}
    const catMatch = hash.match(/^#\/category\/(\d{2})$/);
    if (catMatch) {
      renderCategory(catMatch[1]);
      return;
    }

    // Default: home
    renderHome();
  }

  window.addEventListener('hashchange', route);
  applyFontSize();
  applyPinyin();
  route();

  // --- Back to top ---
  const backTopBtn = document.getElementById('back-top');
  window.addEventListener('scroll', () => {
    backTopBtn.classList.toggle('visible', window.scrollY > 400);
  });
  backTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // --- Dark mode ---
  const themeBtn = document.getElementById('theme-toggle');
  let darkMode = localStorage.getItem('darkMode') === '1';
  function applyTheme() {
    document.body.classList.toggle('dark-mode', darkMode);
    themeBtn.textContent = darkMode ? '☀️' : '🌙';
  }
  applyTheme();
  themeBtn.addEventListener('click', () => {
    darkMode = !darkMode;
    localStorage.setItem('darkMode', darkMode ? '1' : '0');
    applyTheme();
  });
})();

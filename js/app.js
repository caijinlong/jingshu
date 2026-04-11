/**
 * app.js — SPA 路由 + 侧边栏 + 四个视图
 */
(function () {
  'use strict';

  const app = document.getElementById('app');
  const breadcrumb = document.getElementById('breadcrumb');
  const sidebarNav = document.getElementById('sidebar-nav');
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
    let html = '';
    if (items.length > 1) {
      html += '<a href="javascript:void(0)" class="back-btn" onclick="history.back()">← 返回</a><span class="sep">|</span>';
    }
    html += items.map((item, i) => {
      if (i === items.length - 1) return '<span>' + item.text + '</span>';
      return '<a href="' + item.href + '">' + item.text + '</a><span class="sep">/</span>';
    }).join('');
    breadcrumb.innerHTML = html;
  }

  function encodePath(filePath) {
    return filePath.split('/').map(encodeURIComponent).join('/');
  }

  async function fetchMarkdown(filePath) {
    if (cache.has(filePath)) return cache.get(filePath);
    try {
      var resp = await fetch(encodePath(filePath));
      if (!resp.ok) throw new Error(resp.status);
      var text = await resp.text();
      cache.set(filePath, text);
      return text;
    } catch (e) {
      return null;
    }
  }

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Build sidebar navigation ---
  function buildSidebar() {
    let html = '<div class="nav-section">目录</div>';
    html += '<a href="#/" data-id="home">首页</a>';
    for (const cat of DATA) {
      if (cat.scriptures.length === 0) continue;
      html += '<a href="#/category/' + cat.id + '" data-id="' + cat.id + '">' + cat.name + '</a>';
    }
    sidebarNav.innerHTML = html;
  }

  function updateSidebarActive() {
    const hash = location.hash || '#/';
    sidebarNav.querySelectorAll('a').forEach(function (link) {
      link.classList.remove('active');
    });

    if (hash === '#/' || hash === '#') {
      const homeLink = sidebarNav.querySelector('a[data-id="home"]');
      if (homeLink) homeLink.classList.add('active');
      return;
    }

    var catMatch = hash.match(/^#\/category\/(\d{2})/);
    if (catMatch) {
      var link = sidebarNav.querySelector('a[data-id="' + catMatch[1] + '"]');
      if (link) link.classList.add('active');
      return;
    }

    // For scripture/reader, find which category it belongs to
    var scriptMatch = hash.match(/^#\/(?:scripture|read)\/(.+?)(?:\/\d{3}\.md)?$/);
    if (scriptMatch) {
      var path = decodeURIComponent(scriptMatch[1]);
      var result = findScriptureByPath(path);
      if (result) {
        var link = sidebarNav.querySelector('a[data-id="' + result.category.id + '"]');
        if (link) link.classList.add('active');
      }
    }
  }

  // --- Font size ---
  const FONT_SIZES = ['font-small', 'font-medium', 'font-large', 'font-xlarge'];
  const FONT_LABELS = ['小', '中', '大', '特大'];
  let currentFontIdx = parseInt(localStorage.getItem('fontSize') || '2', 10);

  function applyFontSize() {
    document.body.classList.remove(...FONT_SIZES);
    document.body.classList.add(FONT_SIZES[currentFontIdx]);
    var btn = document.getElementById('font-toggle');
    if (btn) btn.textContent = '字 ' + FONT_LABELS[currentFontIdx];
  }

  // --- Pinyin toggle ---
  let pinyinHidden = localStorage.getItem('hidePinyin') === '1';

  function applyPinyin() {
    document.body.classList.toggle('hide-pinyin', pinyinHidden);
    var btn = document.getElementById('pinyin-toggle');
    if (btn) {
      btn.textContent = pinyinHidden ? '拼音 关' : '拼音 开';
      btn.classList.toggle('active', !pinyinHidden);
    }
  }

  // --- Theme ---
  function getPreferredTheme() {
    var saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    var btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀ 浅色' : '☾ 深色';
  }

  // --- Sidebar mobile ---
  function openSidebar() {
    document.querySelector('.sidebar').classList.add('open');
    document.querySelector('.sidebar-overlay').classList.add('open');
  }

  function closeSidebar() {
    document.querySelector('.sidebar').classList.remove('open');
    document.querySelector('.sidebar-overlay').classList.remove('open');
  }

  // --- Views ---

  function renderHome() {
    setBreadcrumb([{ text: '首页' }]);

    let html = '<div class="hero">';
    html += '<h1>乾隆大藏经</h1>';
    html += '<p>收录乾隆大藏经全部经典，以汉语拼音标注读音，方便学习与诵读。</p>';
    html += '</div>';

    html += '<div class="card-grid">';
    for (const cat of DATA) {
      if (cat.scriptures.length === 0) continue;
      html += '<a class="category-card" href="#/category/' + cat.id + '">';
      html += '<div class="cat-id">第' + cat.id + '部</div>';
      html += '<div class="cat-name">' + cat.name + '</div>';
      html += '<div class="cat-count">' + cat.scriptures.length + ' 部经典</div>';
      html += '</a>';
    }
    html += '</div>';

    html += '<div class="info-section" style="margin-top: 2rem;">';
    html += '<h2>关于本站</h2>';
    html += '<ul>';
    html += '<li>使用标准汉语拼音，带声调符号</li>';
    html += '<li>按诵读节奏分句，便于断句</li>';
    html += '<li>经文原文以乾隆大藏经通行本为准</li>';
    html += '<li>支持拼音显隐、字号切换、护眼模式</li>';
    html += '</ul>';
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

    let html = '<h1 class="page-heading">' + cat.name + '</h1>';
    html += '<ul class="scripture-list">';
    for (const s of cat.scriptures) {
      const encodedPath = encodeURIComponent(s.path);
      html += '<li class="scripture-item">';
      html += '<a href="#/scripture/' + encodedPath + '">';
      html += '<div class="s-title">' + (s.title || s.path) + '</div>';
      html += '<div class="s-meta">' + (s.translator || '') + (s.volumes ? ' · ' + s.volumes : '') + '</div>';
      html += '</a>';
      html += '</li>';
    }
    html += '</ul>';
    app.innerHTML = html;
  }

  function renderScripture(scriptPath) {
    const result = findScriptureByPath(scriptPath);
    if (!result) { renderHome(); return; }
    const { scripture, category, parent } = result;

    const crumbs = [{ text: '首页', href: '#/' }];
    crumbs.push({ text: category.name, href: '#/category/' + category.id });
    if (parent) {
      crumbs.push({ text: parent.title, href: '#/scripture/' + encodeURIComponent(parent.path) });
    }
    crumbs.push({ text: scripture.title });
    setBreadcrumb(crumbs);

    let html = '<div class="scripture-info">';
    html += '<h1>' + scripture.title + '</h1>';
    if (scripture.translator) html += '<div class="meta-line">译者：' + scripture.translator + '</div>';
    if (scripture.volumes) html += '<div class="meta-line">卷数：' + scripture.volumes + '</div>';
    if (scripture.category) html += '<div class="meta-line">部类：' + scripture.category + '</div>';
    if (scripture.brief) html += '<div class="brief">' + scripture.brief + '</div>';
    html += '</div>';

    // Volume links
    if (scripture.files && scripture.files.length > 0) {
      html += '<h2 class="section-heading">卷目录</h2>';
      html += '<div class="volume-grid">';
      for (const file of scripture.files) {
        const num = parseInt(file.replace('.md', ''), 10);
        const encodedPath = encodeURIComponent(scripture.path);
        html += '<a class="volume-link" href="#/read/' + encodedPath + '/' + file + '">卷 ' + num + '</a>';
      }
      html += '</div>';
    }

    // Children
    if (scripture.children && scripture.children.length > 0) {
      html += '<div class="children-section"><h2>附属经品</h2>';
      html += '<ul class="scripture-list">';
      for (const child of scripture.children) {
        const encodedPath = encodeURIComponent(child.path);
        html += '<li class="scripture-item">';
        html += '<a href="#/scripture/' + encodedPath + '">';
        html += '<div class="s-title">' + child.title + '</div>';
        html += '<div class="s-meta">' + (child.volumes || '') + '</div>';
        html += '</a>';
        html += '</li>';
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
    crumbs.push({ text: category.name, href: '#/category/' + category.id });
    if (parent) {
      crumbs.push({ text: parent.title, href: '#/scripture/' + encodeURIComponent(parent.path) });
    }
    crumbs.push({ text: scripture.title, href: '#/scripture/' + encodeURIComponent(scripture.path) });
    const fileNum = parseInt(file.replace('.md', ''), 10);
    crumbs.push({ text: '卷 ' + fileNum });
    setBreadcrumb(crumbs);

    // Show loading
    app.innerHTML = '<div class="loading">加载中...</div>';

    // Fetch content
    const filePath = scripture.path + '/' + file;
    const md = await fetchMarkdown(filePath);
    if (md === null) {
      app.innerHTML = '<div class="loading">加载失败</div>';
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
      navHtml += '<a href="#/read/' + encodedPath + '/' + prevFile + '">← 卷 ' + pNum + '</a>';
    } else {
      navHtml += '<span class="disabled">← 上一卷</span>';
    }
    navHtml += '<a href="#/scripture/' + encodedPath + '">返回目录</a>';
    if (nextFile) {
      const nNum = parseInt(nextFile.replace('.md', ''), 10);
      navHtml += '<a href="#/read/' + encodedPath + '/' + nextFile + '">卷 ' + nNum + ' →</a>';
    } else {
      navHtml += '<span class="disabled">下一卷 →</span>';
    }
    navHtml += '</div>';

    app.innerHTML = '<div class="reader-content">' + contentHtml + '</div>' + navHtml;

    applyFontSize();
    applyPinyin();
  }

  // --- Router ---
  function route() {
    const hash = location.hash || '#/';
    scrollTop();
    updateSidebarActive();

    // Close sidebar on navigation (mobile)
    if (window.innerWidth <= 768) closeSidebar();

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

  // --- Init ---
  buildSidebar();
  applyTheme(getPreferredTheme());
  applyFontSize();
  applyPinyin();

  window.addEventListener('hashchange', route);
  route();

  // --- Back to top ---
  const backTopBtn = document.getElementById('back-top');
  window.addEventListener('scroll', function () {
    backTopBtn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  backTopBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // --- Toolbar: Theme toggle ---
  document.getElementById('theme-toggle').addEventListener('click', function () {
    var current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  // --- Toolbar: Font size toggle ---
  document.getElementById('font-toggle').addEventListener('click', function () {
    currentFontIdx = (currentFontIdx + 1) % FONT_SIZES.length;
    localStorage.setItem('fontSize', currentFontIdx);
    applyFontSize();
  });

  // --- Toolbar: Pinyin toggle ---
  document.getElementById('pinyin-toggle').addEventListener('click', function () {
    pinyinHidden = !pinyinHidden;
    localStorage.setItem('hidePinyin', pinyinHidden ? '1' : '0');
    applyPinyin();
  });

  // --- Hamburger ---
  document.querySelector('.hamburger').addEventListener('click', openSidebar);
  document.querySelector('.sidebar-overlay').addEventListener('click', closeSidebar);

  // --- Keyboard navigation (← → to switch volumes) ---
  document.addEventListener('keydown', function (e) {
    if (!(location.hash || '').startsWith('#/read/')) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const nav = document.querySelector('.volume-nav');
    if (!nav) return;
    const links = nav.querySelectorAll('a');
    if (e.key === 'ArrowLeft') {
      const prev = links[0];
      if (prev && prev.getAttribute('href')) prev.click();
    } else if (e.key === 'ArrowRight') {
      const next = links[links.length - 1];
      if (next && next.textContent.includes('→')) next.click();
    }
  });
})();

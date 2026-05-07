/* PRONOIA CORE SYSTEM */

const NavigationEngine = {
  injectHeader() {
    const headerContainer = document.getElementById('pronoia-nav-container');
    if (!headerContainer) return;

    const path = window.location.pathname;
    let activePage = '';
    let badgeText = 'SYSTEM / PORTAL';

    if (path.includes('protocol.html')) { activePage = 'protocol'; badgeText = 'PROTOCOL / AGENT'; }
    else if (path.includes('vault.html')) { activePage = 'vault'; badgeText = 'VAULT / CONTEXT'; }
    else if (path.includes('labs.html')) { activePage = 'labs'; badgeText = 'LABS / R&D'; }
    else if (path.includes('health.html')) { activePage = 'health'; badgeText = 'HEALTH / BIO'; }
    else { activePage = 'index'; badgeText = 'IDENTITY / PORTAL'; }

    const isIndex = activePage === 'index';

    const identifyBtn = isIndex ? `<li><a href="#diagnosis" class="btn-ghost" data-de="IDENTIFIKATION &rarr;" data-en="IDENTIFY &rarr;">IDENTIFY &rarr;</a></li>` : '';
    const systemAttrs = isIndex ? `id="nav-system" class="system-locked" data-de="SYSTEM" data-en="SYSTEM"` : `class="${activePage === 'protocol' ? 'active' : ''}"`;

    const navHTML = `
      <nav id="header">
        <div class="header-left">
            <a href="index.html"><img class="nav-logo" src="graphic assets/pronoia_logo.png" alt="Pronoia Logo"></a>
            <div class="header-divider"></div>
            <div class="session-badge" id="session-id">${badgeText}</div>
            <div id="header-clock" class="mono" style="font-size: .75rem; color: var(--text2); margin-left: 1rem; opacity: 0.6;">--:--:--</div>
        </div>
        <div class="header-right">
            <ul class="nav-links">
                <li><a href="protocol.html" ${systemAttrs}>SYSTEM</a></li>
                <li><a href="vault.html" class="${activePage === 'vault' ? 'active' : ''}" ${isIndex ? 'data-de="VAULT" data-en="VAULT"' : ''}>VAULT</a></li>
                <li><a href="labs.html" class="${activePage === 'labs' ? 'active' : ''}" ${isIndex ? 'data-de="LABS" data-en="LABS"' : ''}>LABS</a></li>
                <li><a href="health.html" class="${activePage === 'health' ? 'active' : ''}" ${isIndex ? 'data-de="HEALTH" data-en="HEALTH"' : ''}>HEALTH</a></li>
                ${identifyBtn}
            </ul>
            <div class="header-divider"></div>
            <div id="theme-toggle-container">
                <button id="theme-toggle-btn" class="theme-toggle" onclick="ThemeEngine.toggle()">DARK</button>
            </div>
        </div>
      </nav>
    `;

    headerContainer.innerHTML = navHTML;
  }
};

const ThemeEngine = {
  init() {
    const savedTheme = localStorage.getItem('px_theme') || 'light';
    this.setTheme(savedTheme);
    this.startClock();
    
    window.addEventListener('scroll', () => {
      const header = document.getElementById('header');
      if (header) {
        if (window.scrollY > 20) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
      }
    });
  },
  setTheme(theme) {
    if (theme === 'dark') document.body.classList.add('dark-theme');
    else document.body.classList.remove('dark-theme');
    localStorage.setItem('px_theme', theme);
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.innerHTML = theme === 'dark' ? 'LIGHT' : 'DARK';
  },
  toggle() {
    const isDark = document.body.classList.contains('dark-theme');
    this.setTheme(isDark ? 'light' : 'dark');
  },
  startClock() {
    // Initial clock update to prevent delay
    const clock = document.getElementById('header-clock');
    if (clock) {
      const now = new Date();
      clock.textContent = now.toLocaleTimeString('de-DE', { hour12: false });
    }
    setInterval(() => {
      const clock = document.getElementById('header-clock');
      if (!clock) return;
      const now = new Date();
      clock.textContent = now.toLocaleTimeString('de-DE', { hour12: false });
    }, 1000);
  }
};

document.addEventListener('DOMContentLoaded', () => {
    NavigationEngine.injectHeader();
    ThemeEngine.init();
});

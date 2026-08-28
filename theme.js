(() => {
  const themeStyles = document.createElement('style');
  themeStyles.textContent = `
    body.light-theme {
      background: #f4f1ea !important;
      color: #222 !important;
    }
    body.light-theme .home-bar,
    body.light-theme .top-bar,
    body.light-theme .nav {
      background: #e2ddd2 !important;
    }
    body.light-theme .button,
    body.light-theme .nav button,
    body.light-theme .theme-toggle {
      background: #fff !important;
      color: #222 !important;
    }
    body.light-theme .secondary-button,
    body.light-theme .mode-text,
    body.light-theme .status,
    body.light-theme .field-help,
    body.light-theme .schedule-hint,
    body.light-theme .user-info {
      color: #555 !important;
    }
    body.light-theme .date-box,
    body.light-theme .day-col,
    body.light-theme .room-card,
    body.light-theme .host-panel {
      background: #fff !important;
      color: #222 !important;
    }
    body.light-theme .agenda-item,
    body.light-theme .room-card h3,
    body.light-theme .session-box {
      color: #222 !important;
    }
    body.light-theme .session-box {
      background: #e8e4da !important;
      border-color: #aaa !important;
    }
    body.light-theme .current-session {
      background: #f2c14e !important;
    }
    body.light-theme .agenda-dialog {
      background: #fff !important;
      color: #222 !important;
    }
    body.light-theme .agenda-dialog label,
    body.light-theme .agenda-dialog legend {
      color: #222 !important;
    }
    body.light-theme .right-panel {
      background: #f4f1ea !important;
      color: #222 !important;
    }
    body.light-theme .panel-body a {
      color: #222 !important;
    }
    body.light-theme .login-card {
      background: #fff !important;
      color: #222 !important;
    }
  `;
  document.head.appendChild(themeStyles);

  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.body.classList.toggle('light-theme', savedTheme === 'light');

  const button = document.getElementById('themeToggle');
  if (!button) return;
  const icon = button.querySelector('img');
  const lightIcon = icon ? icon.src.replace(/sun\.png$/, 'moon.png') : '';
  const darkIcon = icon ? icon.src : '';

  const updateLabel = () => {
    const isLight = document.body.classList.contains('light-theme');
    if (icon) {
      icon.src = isLight ? lightIcon : darkIcon;
      icon.alt = isLight ? 'Switch to dark mode' : 'Switch to light mode';
    } else {
      button.textContent = isLight ? 'Dark mode' : 'Light mode';
    }
    button.setAttribute('aria-label', `Switch to ${isLight ? 'dark' : 'light'} mode`);
  };

  updateLabel();
  button.addEventListener('click', () => {
    const isLight = !document.body.classList.contains('light-theme');
    document.body.classList.toggle('light-theme', isLight);
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    updateLabel();
    window.dispatchEvent(new Event('themechange'));
  });
})();

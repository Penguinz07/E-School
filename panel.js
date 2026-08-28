document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('panelToggle');
  const close = document.getElementById('closePanel');
  const dim = document.getElementById('pageDim');
  const body = document.body;
  if (!toggle) return;

  const setOpen = (open) => {
    body.classList.toggle('show-right', open);
    const panel = document.getElementById('rightPanel');
    if (panel) panel.setAttribute('aria-hidden', String(!open));
  };

  toggle.addEventListener('click', () => setOpen(!body.classList.contains('show-right')));
  if (close) close.addEventListener('click', () => setOpen(false));
  if (dim) dim.addEventListener('click', () => setOpen(false));
  const logout = document.getElementById('logoutBtnPanel');
  if (logout) {
    logout.addEventListener('click', () => {
      ['loggedIn', 'username', 'role', 'section', 'sections'].forEach((key) => sessionStorage.removeItem(key));
      window.location.href = '../login/login.html';
    });
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });
});

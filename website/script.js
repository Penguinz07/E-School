function clearSession() {
  ['loggedIn', 'username', 'role', 'section', 'sections'].forEach((key) => sessionStorage.removeItem(key));
}

async function getAgendasByDate() {
  if (typeof supabaseClient !== 'undefined') {
    const { data, error } = await supabaseClient
      .from('agendas')
      .select('subject, section, agenda_date')
      .order('agenda_date', { ascending: true });
    if (!error) {
      const agendasByDate = {};
      data.forEach((item) => {
        const date = item.agenda_date || 'No Date';
        agendasByDate[date] ||= [];
        agendasByDate[date].push({ session: item.subject, section: item.section });
      });
      return agendasByDate;
    }
    console.error('Could not load chart data from Supabase:', error.message);
  }
  return JSON.parse(localStorage.getItem('agendasByDate') || '{}');
}

async function renderAgendaChart() {
  const agendasByDate = await getAgendasByDate();
  const groups = {};
  Object.entries(agendasByDate).forEach(([date, items]) => {
    groups[date] = [...new Set((items || []).map((item) => item.session).filter(Boolean))];
  });

  const dates = Object.keys(groups).sort();
  const subjects = [...new Set(Object.values(groups).flat())].sort();
  const colors = ['#ff0045', '#00ec9a', '#00e4ff', '#ffa07a', '#040081', '#ffff00', '#0076ff', '#ff0000', '#8c00bf'];
  const isLight = localStorage.getItem('theme') === 'light';
  const data = subjects.map((subject, index) => ({
    type: 'bar',
    name: subject,
    color: colors[index % colors.length],
    dataPoints: dates.map((date) => ({ label: date, y: groups[date].includes(subject) ? 1 : 0 }))
  }));

  if (!data.length) {
    data.push({ type: 'bar', name: 'No data', color: '#999', dataPoints: [{ label: 'No data', y: 0 }] });
  }

  new CanvasJS.Chart('chartContainer', {
    animationEnabled: true,
    backgroundColor: isLight ? '#f4f1ea' : '#172a3a',
    theme: isLight ? 'light2' : 'dark2',
    title: { text: 'Agendas for the week', fontColor: isLight ? '#222' : '#f0f0f0' },
    axisX: { title: 'Dates', titleFontColor: isLight ? '#222' : '#f0f0f0', labelFontColor: isLight ? '#222' : '#f0f0f0' },
    axisY: { title: 'Sessions', titleFontColor: isLight ? '#222' : '#f0f0f0', labelFontColor: isLight ? '#222' : '#f0f0f0', interval: 1 },
    legend: { verticalAlign: 'bottom', horizontalAlign: 'center', fontColor: isLight ? '#222' : '#fff', cursor: 'pointer' },
    data
  }).render();
}

window.addEventListener('themechange', renderAgendaChart);

document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const panel = document.getElementById('rightPanel');
  const closePanel = () => {
    body.classList.remove('show-right');
    panel.setAttribute('aria-hidden', 'true');
  };

  document.getElementById('panelToggle').addEventListener('click', () => {
    body.classList.toggle('show-right');
    panel.setAttribute('aria-hidden', String(!body.classList.contains('show-right')));
  });
  document.getElementById('closePanel').addEventListener('click', closePanel);
  document.getElementById('pageDim').addEventListener('click', closePanel);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePanel();
  });
  document.getElementById('panelLogout').addEventListener('click', () => {
    if (!confirm('Log out now?')) return;
    clearSession();
    window.location.href = '../login/login.html';
  });

  renderAgendaChart();
});

document.addEventListener('DOMContentLoaded', () => {
  const addButton = document.getElementById('addAgendaBtn');
  const clearButton = document.getElementById('clearBtn');
  const output = document.getElementById('output');
  const userInfo = document.getElementById('userInfo');
  const logoutButton = document.getElementById('logoutBtn');
  const agendaDialog = document.getElementById('agendaDialog');
  const agendaForm = document.getElementById('agendaForm');
  const sectionOptions = document.getElementById('sectionOptions');
  const sectionError = document.getElementById('sectionError');
  const subjectOptions = document.getElementById('subjectOptions');
  const subjectError = document.getElementById('subjectError');
  const cancelAgendaButton = document.getElementById('cancelAgendaBtn');
  const storageStatus = document.getElementById('storageStatus');

  const username = sessionStorage.getItem('username');
  const role = sessionStorage.getItem('role');
  const canManageAgendas = role === 'teacher' || role === 'admin';
  userInfo.textContent = username ? `Signed in: ${username}${role ? ` (${role})` : ''}` : 'Not signed in';
  logoutButton.hidden = !username;
  addButton.hidden = !canManageAgendas;
  clearButton.hidden = !canManageAgendas;

  let agendasByDate = {
    date: [
      { agenda: 'read chapter 3...', session: 'English', section: '8C' },
      { agenda: 'worksheet on...', session: 'Math', section: '8C' }
    ]
  };

  const loadFromStorage = async () => {
    if (typeof supabaseClient !== 'undefined') {
      const { data, error } = await supabaseClient
        .from('agendas')
        .select('id, agenda, subject, section, agenda_date')
        .order('agenda_date', { ascending: true });
      if (!error) {
        agendasByDate = {};
        data.forEach((item) => {
          const date = item.agenda_date || 'No Date';
          agendasByDate[date] ||= [];
          agendasByDate[date].push({
            agenda: item.agenda,
            session: item.subject,
            section: item.section
          });
        });
        storageStatus.textContent = 'Connected: agendas are shared online.';
        return;
      }
      storageStatus.textContent = 'Supabase table not ready. Showing local agendas.';
      console.error('Could not load agendas from Supabase:', error.message);
    }
    const stored = localStorage.getItem('agendasByDate');
    if (!stored) return;
    try {
      agendasByDate = JSON.parse(stored) || {};
    } catch {
      agendasByDate = {};
    }
  };

  const saveToStorage = () => {
    localStorage.setItem('agendasByDate', JSON.stringify(agendasByDate));
  };

  const saveToSupabase = async (items) => {
    if (typeof supabaseClient === 'undefined') return false;
    const { error } = await supabaseClient.from('agendas').insert(items.map((item) => ({
      agenda: item.agenda,
      subject: item.session,
      section: item.section,
      agenda_date: item.date
    })));
    if (error) {
      storageStatus.textContent = 'Could not save online. Check your Supabase table and policies.';
      console.error('Could not save agenda:', error.message);
      return false;
    }
    storageStatus.textContent = 'Saved online. Other users can now see this agenda.';
    return true;
  };

  const clearSupabase = async () => {
    if (typeof supabaseClient === 'undefined') return false;
    const { error } = await supabaseClient.from('agendas').delete().gte('id', 0);
    if (error) {
      storageStatus.textContent = 'Could not clear online agendas. Check your Supabase policies.';
      console.error('Could not clear agendas:', error.message);
      return false;
    }
    storageStatus.textContent = 'Online agendas cleared.';
    return true;
  };

  const getUserSections = () => {
    const storedSections = sessionStorage.getItem('sections');
    if (storedSections) {
      try {
        const sections = JSON.parse(storedSections);
        if (Array.isArray(sections)) return sections.map((section) => section.toUpperCase());
      } catch {
        // Fall back to the legacy single-section value below.
      }
    }
    return (sessionStorage.getItem('section') || '')
      .split(',')
      .map((section) => section.trim().toUpperCase())
      .filter(Boolean);
  };

  const availableSections = ['8A', '8B', '8C', '8D'];
  const schedules = {
    '8A': [
      ['Robotics', 'Math', 'Arabic', 'History', 'Physics', 'English'],
      ['Arabic', 'Arabic', 'Chemistry', 'Math', 'Biology', 'English'],
      ['Math', 'English', 'English', 'Robotics', 'Chemistry', 'Arabic'],
      ['Math', 'Math', 'English', 'Physics', 'Arabic', 'Biology'],
      ['Sport', 'Islamic Religion', 'Geography', 'English', 'English', 'Math', 'Arabic']
    ],
    '8B': [
      ['Arabic', 'Robotics', 'English', 'Math', 'Math', 'Geography'],
      ['Biology', 'Sport', 'English', 'Math', 'Arabic', 'History'],
      ['Arabic', 'English', 'Robotics', 'Math', 'Physics', 'Biology'],
      ['English', 'Math', 'English', 'Chemistry', 'Physics', 'Arabic'],
      ['English', 'Arabic', 'English', 'Math', 'Islamic Religion', 'Arabic', 'Chemistry']
    ],
    '8C': [
      ['Math', 'English', 'Physics', 'Robotics', 'History', 'Arabic'],
      ['English', 'Arabic', 'Biology', 'English', 'Arabic', 'Math'],
      ['Arabic', 'Math', 'Chemistry', 'English', 'Sport', 'English'],
      ['Robotics', 'English', 'Math', 'Math', 'Arabic', 'Geography'],
      ['Arabic', 'Physics', 'Islamic Religion', 'Chemistry', 'Biology', 'Math', 'English']
    ],
    '8D': [
      ['English', 'Math', 'Robotics', 'Biology', 'English', 'Arabic'],
      ['English', 'Math', 'Arabic', 'Chemistry', 'English', 'Physics'],
      ['Biology', 'History', 'Sport', 'English', 'Arabic', 'Math'],
      ['Arabic', 'Arabic', 'Math', 'Math', 'Geography', 'English'],
      ['Arabic', 'Chemistry', 'Math', 'English', 'Robotics', 'Islamic Religion', 'Physics']
    ]
  };
  const formSections = role === 'admin'
    ? availableSections
    : getUserSections().filter((section) => availableSections.includes(section));

  const formSubjects = [...new Set(formSections.flatMap((section) => schedules[section].flat()))].sort();

  formSections.forEach((section) => {
    const label = document.createElement('label');
    label.className = 'section-option';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = 'sections';
    checkbox.value = section;
    label.append(checkbox, section);
    sectionOptions.appendChild(label);
  });

  formSubjects.forEach((subject) => {
    const label = document.createElement('label');
    label.className = 'subject-option';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = 'subjects';
    checkbox.value = subject;
    label.append(checkbox, subject);
    subjectOptions.appendChild(label);
  });

  function renderAgendas() {
    output.replaceChildren();
    const userRole = sessionStorage.getItem('role') || '';
    const userSections = getUserSections();

    for (const date of Object.keys(agendasByDate).sort()) {
      const dateBox = document.createElement('section');
      dateBox.className = 'date-box';
      const header = document.createElement('div');
      header.className = 'date-header';
      header.textContent = date || 'No Date';
      dateBox.appendChild(header);

      for (const item of agendasByDate[date] || []) {
        const itemSections = (item.section || '')
          .split(',')
          .map((section) => section.trim().toUpperCase())
          .filter(Boolean);
        if (userRole !== 'admin' && userSections.length && !itemSections.some((section) => userSections.includes(section))) continue;

        const itemElement = document.createElement('div');
        itemElement.className = 'agenda-item';
        itemElement.append(document.createTextNode(item.agenda || ''));
        const notes = [item.session, item.section && `Grade: ${item.section}`].filter(Boolean);
        if (notes.length) {
          const noteElement = document.createElement('i');
          noteElement.textContent = ` (${notes.join(' - ')})`;
          itemElement.appendChild(noteElement);
        }
        dateBox.appendChild(itemElement);
      }

      if (dateBox.querySelector('.agenda-item')) output.appendChild(dateBox);
    }
  }

  addButton.addEventListener('click', () => {
    if (!canManageAgendas) return;
    agendaForm.reset();
    sectionError.hidden = true;
    subjectError.hidden = true;
    agendaDialog.showModal();
  });

  cancelAgendaButton.addEventListener('click', () => agendaDialog.close());

  agendaForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const selectedSections = [...agendaForm.querySelectorAll('input[name="sections"]:checked')]
      .map((checkbox) => checkbox.value);
    const selectedSubjects = [...agendaForm.querySelectorAll('input[name="subjects"]:checked')]
      .map((checkbox) => checkbox.value);
    if (!selectedSections.length) {
      sectionError.hidden = false;
    }
    if (!selectedSubjects.length) subjectError.hidden = false;
    if (!selectedSections.length || !selectedSubjects.length) return;

    const agenda = document.getElementById('agendaInput').value.trim();
    const date = document.getElementById('dateInput').value;
    const dateKey = date || 'No Date';
    agendasByDate[dateKey] ||= [];
    const newItems = [];
    selectedSections.forEach((section) => {
      selectedSubjects.forEach((subject) => {
        const item = {
          agenda,
          session: subject,
          section
        };
        newItems.push({ ...item, date: dateKey });
        agendasByDate[dateKey].push(item);
      });
    });
    const savedOnline = await saveToSupabase(newItems);
    if (!savedOnline) saveToStorage();
    renderAgendas();
    agendaDialog.close();
  });

  clearButton.addEventListener('click', async () => {
    if (!canManageAgendas) return;
    const clearedOnline = await clearSupabase();
    agendasByDate = {};
    if (!clearedOnline) saveToStorage();
    renderAgendas();
  });

  logoutButton.addEventListener('click', () => {
    ['loggedIn', 'username', 'role', 'section', 'sections'].forEach((key) => sessionStorage.removeItem(key));
    window.location.href = '../login/login.html';
  });

  loadFromStorage().then(renderAgendas);
});

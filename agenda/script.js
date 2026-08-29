document.addEventListener('DOMContentLoaded', () => {
  const addButton = document.getElementById('addAgendaBtn');
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
  const agendaDialogTitle = document.getElementById('agendaDialogTitle');
  const saveAgendaButton = document.getElementById('saveAgendaButton');
  const dateFilter = document.getElementById('dateFilter');
  const sectionFilter = document.getElementById('sectionFilter');
  const subjectFilter = document.getElementById('subjectFilter');

  const username = sessionStorage.getItem('username');
  const role = sessionStorage.getItem('role');
  const canManageAgendas = role === 'teacher' || role === 'admin';
  userInfo.textContent = username ? `Signed in: ${username}${role ? ` (${role})` : ''}` : 'Not signed in';
  logoutButton.hidden = !username;
  addButton.hidden = !canManageAgendas;

  let agendasByDate = {
    date: [
      { agenda: 'read chapter 3...', session: 'English', section: '8C' },
      { agenda: 'worksheet on...', session: 'Math', section: '8C' }
    ]
  };
  let completionNamesByAgendaId = {};
  let editingItem;

  const completionStorageKey = (item) => `agenda-completion:${item.id || `${item.agenda}|${item.session}|${item.section}|${item.date || ''}`}`;

  const loadCompletions = async () => {
    if (typeof supabaseClient !== 'undefined') {
      try {
        const { data, error } = await supabaseClient
          .from('agenda_completions')
          .select('agenda_id, username');
        if (!error) {
          completionNamesByAgendaId = {};
          data.forEach((item) => {
            completionNamesByAgendaId[item.agenda_id] ||= [];
            completionNamesByAgendaId[item.agenda_id].push(item.username);
          });
          return;
        }
        console.error('Could not load agenda completions:', error.message);
      } catch (error) {
        console.error('Could not connect to Supabase for completions:', error);
      }
    }
  };

  const loadFromStorage = async () => {
    if (typeof supabaseClient !== 'undefined') {
      try {
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
              id: item.id,
              agenda: item.agenda,
              session: item.subject,
              section: item.section,
              date
            });
          });
          storageStatus.textContent = 'Connected: agendas are shared online.';
          await loadCompletions();
          return;
        }
        storageStatus.textContent = 'Supabase rejected the request. Check the table and policies.';
        console.error('Could not load agendas from Supabase:', error.message);
      } catch (error) {
        storageStatus.textContent = 'Supabase is unreachable. Check the project URL and your connection.';
        console.error('Could not connect to Supabase:', error);
      }
    }
    const stored = localStorage.getItem('agendasByDate');
    if (!stored) {
      await loadCompletions();
      return;
    }
    try {
      agendasByDate = JSON.parse(stored) || {};
    } catch {
      agendasByDate = {};
    }
    await loadCompletions();
  };

  const saveToStorage = () => {
    localStorage.setItem('agendasByDate', JSON.stringify(agendasByDate));
  };

  const saveToSupabase = async (items) => {
    if (typeof supabaseClient === 'undefined') return false;
    try {
      const { data, error } = await supabaseClient.from('agendas').insert(items.map((item) => ({
        agenda: item.agenda,
        subject: item.session,
        section: item.section,
        agenda_date: item.date
      }))).select('id');
      if (error) {
        storageStatus.textContent = 'Could not save online. Check your Supabase table and policies.';
        console.error('Could not save agenda:', error.message);
        return false;
      }
      data.forEach((item, index) => { items[index].id = item.id; });
      storageStatus.textContent = 'Saved online. Other users can now see this agenda.';
      return true;
    } catch (error) {
      storageStatus.textContent = 'Supabase is unreachable. Agenda saved only on this device.';
      console.error('Could not connect to Supabase while saving:', error);
      return false;
    }
  };

  const setAgendaCompletion = async (item, completed) => {
    const username = sessionStorage.getItem('username') || 'Student';
    const localKey = completionStorageKey(item);
    if (completed) {
      localStorage.setItem(localKey, '1');
    } else {
      localStorage.removeItem(localKey);
    }

    if (!item.id || typeof supabaseClient === 'undefined') return true;
    try {
      if (completed) {
        const { error } = await supabaseClient.from('agenda_completions').upsert({
          agenda_id: item.id,
          username
        }, { onConflict: 'agenda_id,username' });
        if (error) throw error;
      } else {
        const { error } = await supabaseClient
          .from('agenda_completions')
          .delete()
          .eq('agenda_id', item.id)
          .eq('username', username);
        if (error) throw error;
      }
      const { data } = await supabaseClient
        .from('agenda_completions')
        .select('agenda_id, username')
        .eq('agenda_id', item.id);
      completionNamesByAgendaId[item.id] = (data || []).map((entry) => entry.username);
      return true;
    } catch (error) {
      storageStatus.textContent = 'Saved on this device. Create the agenda_completions table to share status.';
      console.error('Could not save agenda completion:', error.message || error);
      return false;
    }
  };

  const deleteAgenda = async (item, date) => {
    if (item.id && typeof supabaseClient !== 'undefined') {
      try {
        const { error } = await supabaseClient.from('agendas').delete().eq('id', item.id);
        if (error) throw error;
      } catch (error) {
        storageStatus.textContent = 'Could not delete online agenda. Check your Supabase policies.';
        console.error('Could not delete agenda:', error.message || error);
        return;
      }
    }
    agendasByDate[date] = (agendasByDate[date] || []).filter((entry) => entry !== item);
    if (!agendasByDate[date].length) delete agendasByDate[date];
    saveToStorage();
    renderAgendas();
  };

  const updateAgenda = async (item, date, values) => {
    if (item.id && typeof supabaseClient !== 'undefined') {
      const { error } = await supabaseClient.from('agendas').update({
        agenda: values.agenda,
        subject: values.session,
        section: values.section,
        agenda_date: values.date
      }).eq('id', item.id);
      if (error) {
        storageStatus.textContent = 'Could not edit online agenda. Check your Supabase policies.';
        console.error('Could not edit agenda:', error.message);
        return false;
      }
    }
    const list = agendasByDate[date] || [];
    const index = list.indexOf(item);
    if (index === -1) return false;
    list.splice(index, 1);
    agendasByDate[values.date] ||= [];
    agendasByDate[values.date].push({ ...item, agenda: values.agenda, session: values.session, section: values.section, date: values.date });
    saveToStorage();
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
    const currentDate = new Date();
    const today = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    const visibleDates = Object.keys(agendasByDate)
      .filter((date) => date !== today)
      .filter((date) => dateFilter.value === 'all' || date === dateFilter.value);

    const allItems = Object.values(agendasByDate).flat();
    const dates = [...new Set(Object.keys(agendasByDate).filter((date) => date !== today))].sort();
    const sections = [...new Set(allItems.flatMap((item) => item.section.split(',').map((section) => section.trim().toUpperCase())))].sort();
    const subjects = [...new Set(allItems.map((item) => item.session).filter(Boolean))].sort();
    const updateOptions = (select, values, label) => {
      const current = select.value;
      select.replaceChildren(new Option(label, 'all'), ...values.map((value) => new Option(value, value)));
      select.value = values.includes(current) ? current : 'all';
    };
    updateOptions(dateFilter, dates, 'All dates');
    updateOptions(sectionFilter, sections, 'All sections');
    updateOptions(subjectFilter, subjects, 'All subjects');

    for (const date of visibleDates.sort()) {
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
        if (sectionFilter.value !== 'all' && !itemSections.includes(sectionFilter.value)) continue;
        if (subjectFilter.value !== 'all' && item.session !== subjectFilter.value) continue;

        const itemElement = document.createElement('div');
        itemElement.className = 'agenda-item';
        itemElement.append(document.createTextNode(item.agenda || ''));
        const notes = [item.session, item.section && `Grade: ${item.section}`].filter(Boolean);
        if (notes.length) {
          const noteElement = document.createElement('i');
          noteElement.textContent = ` (${notes.join(' - ')})`;
          itemElement.appendChild(noteElement);
        }
        const controls = document.createElement('div');
        controls.className = 'agenda-controls';
        if (userRole !== 'teacher' && userRole !== 'admin') {
          const doneLabel = document.createElement('label');
          doneLabel.className = 'done-control';
          const doneCheckbox = document.createElement('input');
          doneCheckbox.type = 'checkbox';
          doneCheckbox.checked = (item.id && (completionNamesByAgendaId[item.id] || []).includes(username))
            || localStorage.getItem(completionStorageKey(item)) === '1';
          doneCheckbox.addEventListener('change', async () => {
            doneCheckbox.disabled = true;
            await setAgendaCompletion(item, doneCheckbox.checked);
            doneCheckbox.disabled = false;
            renderAgendas();
          });
          doneLabel.append(doneCheckbox, ' Done');
          controls.appendChild(doneLabel);
        } else {
          const completedBy = completionNamesByAgendaId[item.id] || [];
          const completedText = document.createElement('span');
          completedText.className = 'completed-by';
          completedText.textContent = completedBy.length
            ? `Done by: ${completedBy.join(', ')}`
            : 'Not completed yet';
          controls.appendChild(completedText);
        }
        if (canManageAgendas) {
          const editButton = document.createElement('button');
          editButton.className = 'edit-agenda-button';
          editButton.type = 'button';
          editButton.textContent = 'Edit';
          editButton.addEventListener('click', () => openEditDialog(item, date));
          controls.appendChild(editButton);
          const deleteButton = document.createElement('button');
          deleteButton.className = 'delete-agenda-button';
          deleteButton.type = 'button';
          deleteButton.textContent = 'Delete';
          deleteButton.addEventListener('click', () => deleteAgenda(item, date));
          controls.appendChild(deleteButton);
        }
        itemElement.appendChild(controls);
        dateBox.appendChild(itemElement);
      }

      if (dateBox.querySelector('.agenda-item')) output.appendChild(dateBox);
    }
  }

  const openEditDialog = (item, date) => {
    editingItem = { item, date };
    agendaDialogTitle.textContent = 'Edit agenda';
    saveAgendaButton.textContent = 'Save changes';
    document.getElementById('agendaInput').value = item.agenda;
    document.getElementById('dateInput').value = item.date || date;
    agendaForm.querySelectorAll('input[name="sections"]').forEach((checkbox) => {
      checkbox.checked = item.section.split(',').map((section) => section.trim()).includes(checkbox.value);
    });
    agendaForm.querySelectorAll('input[name="subjects"]').forEach((checkbox) => {
      checkbox.checked = checkbox.value === item.session;
    });
    sectionError.hidden = true;
    subjectError.hidden = true;
    agendaDialog.showModal();
  };

  addButton.addEventListener('click', () => {
    if (!canManageAgendas) return;
    agendaForm.reset();
    editingItem = undefined;
    agendaDialogTitle.textContent = 'Add agenda';
    saveAgendaButton.textContent = 'Add agenda';
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
    if (editingItem) {
      const values = { agenda, date: dateKey, session: selectedSubjects[0], section: selectedSections.join(',') };
      const updated = await updateAgenda(editingItem.item, editingItem.date, values);
      if (updated) {
        editingItem = undefined;
        agendaDialog.close();
        renderAgendas();
      }
      return;
    }
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

  [dateFilter, sectionFilter, subjectFilter].forEach((filter) => filter.addEventListener('change', renderAgendas));

  logoutButton.addEventListener('click', () => {
    sessionStorage.clear();
    window.location.href = '../login/login.html';
  });

  const logoutBtnPanel = document.getElementById('logoutBtnPanel');
  if (logoutBtnPanel) {
    logoutBtnPanel.addEventListener('click', () => {
      sessionStorage.clear();
      window.location.href = '../login/login.html';
    });
  }

  loadFromStorage().then(renderAgendas);
});

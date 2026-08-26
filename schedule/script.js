const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
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

const storedSections = sessionStorage.getItem('sections');
const userRole = sessionStorage.getItem('role');
let userSections = [];
try {
  userSections = storedSections ? JSON.parse(storedSections) : [];
} catch {
  userSections = [];
}
if (!Array.isArray(userSections) || !userSections.length) {
  userSections = (sessionStorage.getItem('section') || '8A').split(',');
}
if (userRole === 'admin') {
  userSections = Object.keys(schedules);
}
userSections = userSections.map((item) => item.trim().toUpperCase()).filter((item) => schedules[item]);
if (!userSections.length) userSections = ['8A'];

const sectionSelect = document.getElementById('sectionSelect');
userSections.forEach((item) => {
  const option = document.createElement('option');
  option.value = item;
  option.textContent = item;
  sectionSelect.appendChild(option);
});

const section = userSections[0];
const username = sessionStorage.getItem('username') || 'Guest';
const info = document.createElement('p');
info.className = 'user-info';
info.textContent = `User: ${username}`;
document.querySelector('main').insertBefore(info, document.getElementById('columns'));

const columns = document.getElementById('columns');
function renderSchedule(selectedSection) {
  columns.replaceChildren();
  info.textContent = `User: ${username}   Section: ${selectedSection}`;
  schedules[selectedSection].forEach((sessions, dayIndex) => {
  const column = document.createElement('section');
  column.className = 'day-col';
  const heading = document.createElement('h2');
  heading.textContent = dayNames[dayIndex];
  column.appendChild(heading);
  sessions.forEach((session) => {
    const sessionBox = document.createElement('div');
    sessionBox.className = 'session-box';
    sessionBox.textContent = session;
    column.appendChild(sessionBox);
  });
    columns.appendChild(column);
  });
}

sectionSelect.addEventListener('change', () => renderSchedule(sectionSelect.value));
renderSchedule(section);

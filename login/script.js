const credentials = {
  teacher: { password: 'Pa$$w0rd', role: 'teacher', sections: ['8A', '8B'] },
  admin: { password: 'AdminPass123', role: 'admin', sections: ['8A', '8B', '8C', '8D'] },
  1031: { password: '5t8m', role: 'student', sections: ['8B'] },
  1032: { password: '9u2n', role: 'student', sections: ['8C'] },
  1033: { password: '3p4q', role: 'student', sections: ['8D'] },
  1034: { password: '7r1v', role: 'student', sections: ['8F'] },
  student: { password: 's3cret', role: 'student', sections: ['8A'] } 
};

const form = document.getElementById('loginForm');
const message = document.getElementById('message');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  message.textContent = '';
  message.className = 'message';

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const credential = credentials[username];

  if (!credential || credential.password !== password) {
    message.textContent = 'Invalid username or password.';
    message.classList.add('error');
    return;
  }

  message.textContent = 'Login successful.';
  message.classList.add('success');
  sessionStorage.setItem('loggedIn', '1');
  sessionStorage.setItem('username', username);
  sessionStorage.setItem('role', credential.role || 'user');
  const sections = credential.sections || (credential.section ? [credential.section] : []);
  if (sections.length) {
    sessionStorage.setItem('sections', JSON.stringify(sections));
    sessionStorage.setItem('section', sections[0]);
  }
  setTimeout(() => { window.location.href = '../website/website.html'; }, 600);
});

document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('loggedIn') !== '1') {
    window.location.href = '../login/login.html';
    return;
  }

  const role = sessionStorage.getItem('role') || 'student';
  const username = sessionStorage.getItem('username') || 'Student';
  const isHost = role === 'teacher' || role === 'admin';
  const modeText = document.getElementById('modeText');
  const roleBadge = document.getElementById('roleBadge');
  const status = document.getElementById('status');

  roleBadge.textContent = isHost ? `${role} host` : 'student viewer';
  modeText.textContent = isHost
    ? 'You can present your screen to the class.'
    : 'You are watching the teacher’s live class.';

  if (typeof JitsiMeetExternalAPI === 'undefined') {
    status.textContent = 'The classroom service could not load. Check your connection and refresh.';
    return;
  }

  const roomName = 'EschoolAlImamAlRidaLiveClass';
  const toolbarButtons = isHost
    ? ['microphone', 'camera', 'desktop', 'chat', 'raisehand', 'tileview', 'fullscreen']
    : ['fullscreen', 'tileview'];

  const api = new JitsiMeetExternalAPI('meet.jit.si', {
    roomName,
    parentNode: document.getElementById('meet'),
    width: '100%',
    height: '100%',
    userInfo: { displayName: username },
    configOverwrite: {
      prejoinPageEnabled: false,
      startWithAudioMuted: !isHost,
      startWithVideoMuted: true
    },
    interfaceConfigOverwrite: {
      TOOLBAR_BUTTONS: toolbarButtons,
      SHOW_JITSI_WATERMARK: false,
      MOBILE_APP_PROMO: false
    }
  });

  api.addEventListener('videoConferenceJoined', () => {
    status.textContent = isHost
      ? 'You are live. Use the screen button to present.'
      : 'Connected. The teacher’s screen will appear here.';
  });

  api.addEventListener('readyToClose', () => {
    status.textContent = 'The classroom has ended.';
  });
});

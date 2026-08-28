document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('loggedIn') !== '1') {
    window.location.href = '../login/login.html';
    return;
  }

  const role = (sessionStorage.getItem('role') || 'student').toLowerCase();
  const username = sessionStorage.getItem('username') || 'Student';
  const isHost = role === 'teacher' || role === 'admin';
  let storedSections = [];
  try {
    storedSections = JSON.parse(sessionStorage.getItem('sections') || '[]');
  } catch {
    storedSections = [];
  }
  const userSections = role === 'admin'
    ? ['8A', '8B', '8C', '8D']
    : (Array.isArray(storedSections) ? storedSections : []);
  const modeText = document.getElementById('modeText');
  const roleBadge = document.getElementById('roleBadge');
  const status = document.getElementById('status');
  const hostPanel = document.getElementById('hostPanel');
  const roomForm = document.getElementById('roomForm');
  const roomSectionInput = document.getElementById('roomSectionInput');
  const roomList = document.getElementById('roomList');
  const roomDirectory = document.getElementById('roomDirectory');
  const classroom = document.getElementById('classroom');
  const meet = document.getElementById('meet');
  const activeRoomName = document.getElementById('activeRoomName');
  let rooms = [];
  let api;
  let activeRoom;
  let roomStatusTimer;

  roleBadge.textContent = isHost ? `${role} host` : 'student viewer';
  modeText.textContent = isHost
    ? 'Create a classroom for one section and session.'
    : 'Choose a classroom for one of your sections.';
  hostPanel.hidden = !isHost;

  userSections.forEach((section) => {
    const option = document.createElement('option');
    option.value = section;
    option.textContent = section;
    roomSectionInput.appendChild(option);
  });

  const showStatus = (message) => {
    roomList.textContent = message;
  };

  const roomKey = (room) => room.room_key || `Classroom-${room.id}`;

  const loadRooms = async () => {
    if (typeof supabaseClient === 'undefined') {
      showStatus('The classroom directory is unavailable.');
      return;
    }
    const { data, error } = await supabaseClient
      .from('live_classrooms')
      .select('id, room_name, session, section, room_key')
      .order('created_at', { ascending: false });
    if (error) {
      showStatus('Create the live_classrooms table in Supabase to use classrooms.');
      console.error('Could not load classrooms:', error.message);
      return;
    }
    rooms = data || [];
    renderRooms();
  };

  const renderRooms = () => {
    roomList.replaceChildren();
    const visibleRooms = rooms.filter((room) => room.section
      .split(',')
      .map((section) => section.trim())
      .some((section) => userSections.includes(section)));
    if (!visibleRooms.length) {
      showStatus(isHost ? 'Create a classroom to get started.' : 'No classrooms are available for your sections.');
      return;
    }
    visibleRooms.forEach((room) => {
      const card = document.createElement('article');
      card.className = 'room-card';
      const title = document.createElement('h3');
      title.textContent = room.room_name;
      const details = document.createElement('p');
      details.textContent = `${room.session} | Sections ${room.section}`;
      const joinButton = document.createElement('button');
      joinButton.className = 'button';
      joinButton.type = 'button';
      joinButton.textContent = 'Join classroom';
      joinButton.addEventListener('click', () => joinRoom(room));
      const actions = document.createElement('div');
      actions.className = 'room-card-actions';
      actions.appendChild(joinButton);
      if (isHost) {
        const endButton = document.createElement('button');
        endButton.className = 'button danger-button';
        endButton.type = 'button';
        endButton.textContent = 'End session';
        endButton.addEventListener('click', () => endRoom(room));
        actions.appendChild(endButton);
      }
      card.append(title, details, actions);
      roomList.appendChild(card);
    });
  };

  const endRoom = async (room) => {
    if (!window.confirm(`End "${room.room_name}" for everyone?`)) return;
    const { error } = await supabaseClient
      .from('live_classrooms')
      .delete()
      .eq('id', room.id);
    if (error) {
      status.textContent = 'Could not end the session. Check your Supabase delete policy.';
      console.error('Could not end classroom:', error.message);
      return;
    }
    if (activeRoom && activeRoom.id === room.id) {
      if (api) api.dispose();
      clearInterval(roomStatusTimer);
      activeRoom = undefined;
      classroom.hidden = true;
      roomDirectory.hidden = false;
    }
    status.textContent = 'Session ended.';
    await loadRooms();
  };

  const joinRoom = (room) => {
    if (typeof JitsiMeetExternalAPI === 'undefined') {
      status.textContent = 'The classroom service could not load. Check your connection and refresh.';
      return;
    }
    roomDirectory.hidden = true;
    classroom.hidden = false;
    activeRoom = room;
    clearInterval(roomStatusTimer);
    activeRoomName.textContent = room.room_name;
    meet.replaceChildren();
    const toolbarButtons = isHost
      ? ['microphone', 'camera', 'desktop', 'chat', 'raisehand', 'tileview', 'fullscreen']
      : ['microphone', 'fullscreen', 'raisehand', 'tileview', 'chat'];
    api = new JitsiMeetExternalAPI('meet.jit.si', {
      roomName: roomKey(room),
      parentNode: meet,
      width: '100%',
      height: '100%',
      userInfo: { displayName: username },
      configOverwrite: {
        prejoinPageEnabled: false,
        startWithAudioMuted: !isHost,
        startWithVideoMuted: true,
        disableTileView: !isHost,
        filmstrip: { disable: !isHost }
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: toolbarButtons,
        SHOW_JITSI_WATERMARK: false,
        SHOW_BRAND_WATERMARK: false,
        SHOW_POWERED_BY: false,
        MOBILE_APP_PROMO: false
      }
    });
    api.addEventListener('videoConferenceJoined', () => {
      status.textContent = isHost
        ? 'You are live. Use the screen button to present.'
        : 'Connected. The teacher’s screen will appear here.';
    });
    roomStatusTimer = setInterval(async () => {
      const { data } = await supabaseClient
        .from('live_classrooms')
        .select('id')
        .eq('id', room.id)
        .maybeSingle();
      if (!data) {
        clearInterval(roomStatusTimer);
        if (api) api.dispose();
        activeRoom = undefined;
        classroom.hidden = true;
        roomDirectory.hidden = false;
        status.textContent = 'The host ended this session.';
        await loadRooms();
      }
    }, 10000);
  };

  roomForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!isHost) return;
    const formData = new FormData(roomForm);
    const roomName = formData.get('roomName').trim();
    const session = formData.get('session').trim();
    const sections = formData.getAll('sections');
    if (!roomName || !session || !sections.length) {
      status.textContent = 'Enter a classroom name, session, and at least one section.';
      return;
    }
    const section = sections.join(',');
    const slug = roomName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    try {
      const { error } = await supabaseClient.from('live_classrooms').insert({
        room_name: roomName,
        session,
        section,
        room_key: `${slug || 'classroom'}-${section}-${Date.now()}`
      });
      if (error) throw error;
    } catch (error) {
      status.textContent = `Could not create the classroom: ${error.message || 'check Supabase table and policies.'}`;
      console.error('Could not create classroom:', error);
      return;
    }
    roomForm.reset();
    status.textContent = 'Classroom created.';
    await loadRooms();
  });

  document.getElementById('refreshRooms').addEventListener('click', loadRooms);
  document.getElementById('leaveRoom').addEventListener('click', () => {
    if (api) api.dispose();
    clearInterval(roomStatusTimer);
    activeRoom = undefined;
    classroom.hidden = true;
    roomDirectory.hidden = false;
    status.textContent = 'Choose a classroom to join.';
  });

  loadRooms();
});

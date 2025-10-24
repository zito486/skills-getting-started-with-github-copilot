document.addEventListener('DOMContentLoaded', () => {
  const activitiesList = document.getElementById('activities-list');
  const activitySelect = document.getElementById('activity');
  const signupForm = document.getElementById('signup-form');
  const messageEl = document.getElementById('message');

  function showMessage(text, type = 'info') {
    messageEl.className = `message ${type}`;
    messageEl.textContent = text;
    messageEl.classList.remove('hidden');
    setTimeout(() => {
      // keep visible for a few seconds then hide
      messageEl.classList.add('hidden');
    }, 5000);
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function renderParticipantsList(participants, activityName) {
    if (!participants || participants.length === 0) {
      return '<p class="info">No participants yet.</p>';
    }
    // Add a delete icon (button) next to each participant
    return '<ul class="participants-list">' + participants.map(p =>
      `<li><span class="participant-name">${escapeHTML(p)}</span> <button class="delete-participant" title="Remove participant" data-activity="${escapeHTML(activityName)}" data-email="${escapeHTML(p)}">&#128465;</button></li>`
    ).join('') + '</ul>';
  }

  function renderActivities(data) {
    activitiesList.innerHTML = '';
    Object.entries(data).forEach(([name, info]) => {
      const card = document.createElement('div');
      card.className = 'activity-card';
      card.innerHTML = `
        <h4>${escapeHTML(name)}</h4>
        <p>${escapeHTML(info.description)}</p>
        <p><strong>Schedule:</strong> ${escapeHTML(info.schedule)}</p>
        <p><strong>Spots:</strong> ${info.participants.length}/${info.max_participants}</p>
        <div class="participants">
          <h5 class="participants-title">Participants</h5>
          ${renderParticipantsList(info.participants, name)}
        </div>
      `;
      activitiesList.appendChild(card);
    });
    // Add event listeners for delete buttons
    activitiesList.querySelectorAll('.delete-participant').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const activity = btn.getAttribute('data-activity');
        const email = btn.getAttribute('data-email');
        if (!activity || !email) return;
        if (!confirm(`Remove ${email} from ${activity}?`)) return;
        try {
          const url = `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`;
          const res = await fetch(url, { method: 'DELETE' });
          const payload = await res.json();
          if (!res.ok) throw new Error(payload.detail || payload.message || 'Unregister failed');
          showMessage(payload.message || 'Participant removed', 'success');
          await fetchActivities();
        } catch (err) {
          showMessage(err.message || 'Unregister failed', 'error');
        }
      });
    });
  }

  function populateSelect(data) {
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
    Object.keys(data).forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      activitySelect.appendChild(opt);
    });
  }

  async function fetchActivities() {
    activitiesList.innerHTML = '<p>Loading activities...</p>';
    try {
      // Add a cache-busting query parameter
      const res = await fetch(`/activities?_=${Date.now()}`);
      if (!res.ok) throw new Error('Failed to load activities');
      const data = await res.json();
      renderActivities(data);
      populateSelect(data);
    } catch (err) {
      activitiesList.innerHTML = '<p class="error">Unable to load activities.</p>';
      showMessage(err.message || 'Error loading activities', 'error');
    }
  }

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const activity = activitySelect.value;
    if (!email || !activity) {
      showMessage('Please provide an email and select an activity.', 'error');
      return;
    }
    try {
      const url = `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`;
      const res = await fetch(url, { method: 'POST' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.detail || payload.message || 'Signup failed');
      showMessage(payload.message || 'Signed up successfully', 'success');
      // refresh activities to show the new participant
      await fetchActivities();
      signupForm.reset();
    } catch (err) {
      showMessage(err.message || 'Signup failed', 'error');
    }
  });

  // initial load
  fetchActivities();
});

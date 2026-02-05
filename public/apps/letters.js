const LETTER_KEY = 'fiaos_letters_v1';
const moods = ['Liebe', 'Dankbar', 'Traurig', 'Streit', 'Hoffnung'];
let selectedMood = moods[0];
let letters = JSON.parse(localStorage.getItem(LETTER_KEY) || '[]');

const renderMoods = () => {
  const wrap = document.getElementById('moods');
  wrap.innerHTML = '';
  moods.forEach(mood => {
    const chip = document.createElement('button');
    chip.className = `chip ${selectedMood === mood ? 'active' : ''}`;
    chip.textContent = mood;
    chip.onclick = () => {
      selectedMood = mood;
      renderMoods();
    };
    wrap.appendChild(chip);
  });
};

const renderLetters = () => {
  const root = document.getElementById('letters');
  root.innerHTML = '';
  letters.slice().reverse().forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div style="font-size:16px;font-weight:700;">${item.title}</div>
      <div class="meta">${item.mood} • ${new Date(item.createdAt).toLocaleString('de-DE')}</div>
      <div style="margin-top:8px;white-space:pre-wrap;line-height:1.4;">${item.text}</div>
    `;
    root.appendChild(card);
  });
};

window.saveLetter = () => {
  const title = document.getElementById('titleInput').value.trim();
  const text = document.getElementById('textInput').value.trim();
  if (!title || !text) return;
  letters.push({ id: Date.now(), title, text, mood: selectedMood, createdAt: Date.now() });
  localStorage.setItem(LETTER_KEY, JSON.stringify(letters));
  document.getElementById('titleInput').value = '';
  document.getElementById('textInput').value = '';
  renderLetters();
};

renderMoods();
renderLetters();

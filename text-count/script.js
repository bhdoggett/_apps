const editor = document.getElementById('editor');
const wordCount = document.getElementById('word-count');
const charCount = document.getElementById('char-count');

editor.addEventListener('input', update);

function update() {
  const text = editor.value;
  charCount.textContent = text.length;
  wordCount.textContent = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

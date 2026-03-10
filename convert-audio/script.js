const dropZone       = document.getElementById('drop-zone');
const fileInput      = document.getElementById('file-input');
const browseBtn      = document.getElementById('browse-btn');
const previewSection = document.getElementById('preview-section');
const audioPlayer    = document.getElementById('audio-player');
const fileInfo       = document.getElementById('file-info');
const statusMsg      = document.getElementById('status-msg');
const errorMsg       = document.getElementById('error-msg');
const resetBtn       = document.getElementById('reset-btn');

let currentFile = null;
let audioBuffer = null;

// ---- Load file ----

browseBtn.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('click', (e) => {
  if (e.target !== browseBtn) fileInput.click();
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) loadFile(fileInput.files[0]);
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) loadFile(file);
});

function loadFile(file) {
  if (!file.type.startsWith('audio/')) {
    showError('unsupported file type');
    return;
  }

  currentFile = file;
  const url = URL.createObjectURL(file);
  audioPlayer.src = url;

  dropZone.classList.add('hidden');
  previewSection.classList.remove('hidden');
  audioPlayer.classList.add('hidden');
  showStatus('loading');

  const ctx = new AudioContext();
  file.arrayBuffer().then(buf => ctx.decodeAudioData(buf)).then(decoded => {
    audioBuffer = decoded;
    const mins = Math.floor(decoded.duration / 60);
    const secs = Math.floor(decoded.duration % 60).toString().padStart(2, '0');
    fileInfo.textContent = `${file.name}  ·  ${mins}:${secs}  ·  ${decoded.numberOfChannels === 1 ? 'mono' : 'stereo'}  ·  ${Math.round(decoded.sampleRate / 1000)}kHz`;
    hideError();
    hideStatus();
    audioPlayer.classList.remove('hidden');
  }).catch(() => {
    hideStatus();
    showError('could not decode audio — try a different format');
  });
}

// ---- Convert ----

document.querySelectorAll('.convert-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!audioBuffer) return;
    const format = btn.dataset.format;
    const name = currentFile.name.replace(/\.[^.]+$/, '');

    setButtons(true);
    audioPlayer.classList.add('hidden');
    showStatus('loading');

    setTimeout(() => {
      try {
        const blob = format === 'mp3' ? encodeMP3(audioBuffer) : encodeWAV(audioBuffer);
        download(blob, `${name}.${format}`);
      } catch (e) {
        showError('encoding failed');
      }
      hideStatus();
      audioPlayer.classList.remove('hidden');
      setButtons(false);
    }, 500);
  });
});

// ---- WAV encoder ----

function encodeWAV(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate  = buffer.sampleRate;
  const samples     = interleave(buffer);
  const dataLen     = samples.length * 2;
  const arrayBuf    = new ArrayBuffer(44 + dataLen);
  const view        = new DataView(arrayBuf);

  writeStr(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLen, true);
  writeStr(view, 8, 'WAVE');
  writeStr(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeStr(view, 36, 'data');
  view.setUint32(40, dataLen, true);

  const int16 = new Int16Array(arrayBuf, 44);
  for (let i = 0; i < samples.length; i++) {
    int16[i] = Math.max(-1, Math.min(1, samples[i])) * 0x7fff;
  }

  return new Blob([arrayBuf], { type: 'audio/wav' });
}

function writeStr(view, offset, str) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

// ---- MP3 encoder (lamejs) ----

function encodeMP3(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate  = buffer.sampleRate;
  const bitrate     = 128;
  const encoder     = new lamejs.Mp3Encoder(numChannels, sampleRate, bitrate);
  const blockSize   = 1152;
  const mp3Data     = [];

  const left  = toInt16(buffer.getChannelData(0));
  const right  = numChannels > 1 ? toInt16(buffer.getChannelData(1)) : left;

  for (let i = 0; i < left.length; i += blockSize) {
    const l = left.subarray(i, i + blockSize);
    const r = right.subarray(i, i + blockSize);
    const chunk = numChannels > 1
      ? encoder.encodeBuffer(l, r)
      : encoder.encodeBuffer(l);
    if (chunk.length) mp3Data.push(chunk);
  }

  const final = encoder.flush();
  if (final.length) mp3Data.push(final);

  return new Blob(mp3Data, { type: 'audio/mp3' });
}

function toInt16(float32) {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    int16[i] = Math.max(-1, Math.min(1, float32[i])) * 0x7fff;
  }
  return int16;
}

function interleave(buffer) {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);
  const l = buffer.getChannelData(0);
  const r = buffer.getChannelData(1);
  const out = new Float32Array(l.length * 2);
  for (let i = 0; i < l.length; i++) {
    out[i * 2]     = l[i];
    out[i * 2 + 1] = r[i];
  }
  return out;
}

// ---- Download ----

function download(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---- Reset ----

resetBtn.addEventListener('click', () => {
  currentFile = null;
  audioBuffer = null;
  audioPlayer.src = '';
  fileInput.value = '';
  previewSection.classList.add('hidden');
  dropZone.classList.remove('hidden');
  hideError();
  hideStatus();
});

// ---- UI helpers ----

function setButtons(disabled) {
  document.querySelectorAll('.convert-btn').forEach(b => b.disabled = disabled);
}

let statusInterval = null;
const statusDots = ['', ' .', ' . .', ' . . .'];

function showStatus(msg) {
  let step = 0;
  statusMsg.textContent = msg;
  statusMsg.classList.remove('hidden');
  statusInterval = setInterval(() => {
    step = (step + 1) % statusDots.length;
    statusMsg.textContent = msg + statusDots[step];
  }, 400);
}

function hideStatus() {
  clearInterval(statusInterval);
  statusInterval = null;
  statusMsg.classList.add('hidden');
}
function showError(msg)  { errorMsg.textContent = msg; errorMsg.classList.remove('hidden'); }
function hideError()     { errorMsg.classList.add('hidden'); }

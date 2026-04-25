import './style.css';
import * as faceapi from '@vladmandic/face-api';
import { createIcons, UploadCloud, ShieldCheck, Download } from 'lucide';

// Initialize Lucide Icons
createIcons({
  icons: {
    UploadCloud,
    ShieldCheck,
    Download
  }
});

// State
let modelsLoaded = false;
const images = {
  1: null,
  2: null
};
const descriptors = {
  1: null,
  2: null
};

// UI Elements
const loader = document.getElementById('loader');
const btnAnalyze = document.getElementById('btn-analyze');
const btnDownload = document.getElementById('btn-download');
const verdictContainer = document.getElementById('verdict-container');
const similarityScore = document.getElementById('similarity-score');
const resultsSection = document.getElementById('results');
const meterCircle = document.querySelector('.meter');

// Load Face-API Models
async function loadModels() {
  try {
    loader.classList.remove('hidden');
    const MODEL_URL = '/models';
    
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);
    
    modelsLoaded = true;
    loader.classList.add('hidden');
    console.log('Models loaded successfully');
  } catch (error) {
    console.error('Error loading models:', error);
    alert('Erro ao carregar modelos biométricos. Verifique sua conexão.');
  }
}

// Handle File Uploads
// Handle File Uploads
function setupUploads() {
  [1, 2].forEach(id => {
    const dropZone = document.getElementById(`drop-zone-${id}`);
    const fileInput = document.getElementById(`file-${id}`);
    const img = document.getElementById(`img-${id}`);
    const canvas = document.getElementById(`canvas-${id}`);
    const previewContainer = dropZone.querySelector('.preview-container');

    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Update button to show processing state
      btnAnalyze.innerText = 'PROCESSANDO IMAGEM...';
      btnAnalyze.disabled = true;

      const reader = new FileReader();
      reader.onload = async (event) => {
        img.src = event.target.result;
        previewContainer.style.display = 'block';
        
        // Wait for image to load
        img.onload = async () => {
          images[id] = img;
          try {
            await processImage(id, img, canvas);
          } catch (err) {
            console.error(`Erro ao processar Sujeito ${id}:`, err);
          }
          checkReady();
        };
      };
      reader.readAsDataURL(file);
    });
  });
}

// Process single image: detect face and get descriptor
async function processImage(id, img, canvas) {
  const statusEl = document.getElementById(`status-${id}`);
  try {
    const displaySize = { width: img.width, height: img.height };
    faceapi.matchDimensions(canvas, displaySize);

    // Clear and draw image immediately
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    statusEl.innerHTML = '<span class="loading">Buscando rosto...</span>';
    console.log(`Detectando rosto no Sujeito ${id}...`);

    // Detect face with landmarks AND descriptor in one go for efficiency
    // Increased minConfidence slightly for better quality, but using direct detection
    const detection = await faceapi.detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detection) {
      console.log(`Rosto detectado no Sujeito ${id}.`);
      const resizedDetections = faceapi.resizeResults(detection, displaySize);
      
      descriptors[id] = detection.descriptor;
      statusEl.innerHTML = '<span class="success">✅ Rosto Detectado</span>';
      
      // Custom drawing for "spy" look with Mesh
      drawTechMesh(ctx, resizedDetections.landmarks);
    } else {
      console.warn(`Nenhum rosto encontrado no Sujeito ${id}`);
      statusEl.innerHTML = '<span class="error">❌ Rosto não encontrado</span>';
      descriptors[id] = null;
    }
  } catch (error) {
    console.error(`Erro crítico no processamento da imagem ${id}:`, error);
    statusEl.innerHTML = '<span class="error">❌ Erro no Processamento</span>';
    descriptors[id] = null;
  }
}



function drawTechMesh(ctx, landmarks) {
  const points = landmarks.positions;
  
  ctx.strokeStyle = 'rgba(0, 242, 255, 0.3)';
  ctx.fillStyle = '#00f2ff';
  ctx.lineWidth = 0.5;

  // 1. Draw Mesh (Connecting points)
  ctx.beginPath();
  
  // Jawline
  for(let i=0; i<16; i++) {
    ctx.moveTo(points[i].x, points[i].y);
    ctx.lineTo(points[i+1].x, points[i+1].y);
  }

  // Brows
  for(let i=17; i<21; i++) { ctx.moveTo(points[i].x, points[i].y); ctx.lineTo(points[i+1].x, points[i+1].y); }
  for(let i=22; i<26; i++) { ctx.moveTo(points[i].x, points[i].y); ctx.lineTo(points[i+1].x, points[i+1].y); }

  // Nose
  for(let i=27; i<30; i++) { ctx.moveTo(points[i].x, points[i].y); ctx.lineTo(points[i+1].x, points[i+1].y); }
  for(let i=31; i<35; i++) { ctx.moveTo(points[i].x, points[i].y); ctx.lineTo(points[i+1].x, points[i+1].y); }

  // Eyes
  for(let i=36; i<41; i++) { ctx.moveTo(points[i].x, points[i].y); ctx.lineTo(points[i+1].x, points[i+1].y); }
  ctx.lineTo(points[36].x, points[36].y);
  for(let i=42; i<47; i++) { ctx.moveTo(points[i].x, points[i].y); ctx.lineTo(points[i+1].x, points[i+1].y); }
  ctx.lineTo(points[42].x, points[42].y);

  // Mouth
  for(let i=48; i<59; i++) { ctx.moveTo(points[i].x, points[i].y); ctx.lineTo(points[i+1].x, points[i+1].y); }
  ctx.lineTo(points[48].x, points[48].y);

  ctx.stroke();

  // 2. Draw Nodes (Dots)
  points.forEach(pt => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // 3. Add Tech Accents (Scanning box) - Manual calculation of center
  ctx.strokeStyle = '#00f2ff';
  ctx.lineWidth = 1;
  
  // Calculate center of the face manually
  const centerX = points.reduce((acc, p) => acc + p.x, 0) / points.length;
  const centerY = points.reduce((acc, p) => acc + p.y, 0) / points.length;
  
  ctx.strokeRect(centerX - 40, centerY - 40, 80, 80);
  
  // Glow
  ctx.shadowBlur = 10;
  ctx.shadowColor = '#00f2ff';
}

function checkReady() {
  const bothLoaded = descriptors[1] && descriptors[2];
  console.log(`Estado atual: Sujeito 1: ${!!descriptors[1]}, Sujeito 2: ${!!descriptors[2]}`);
  
  if (bothLoaded) {
    btnAnalyze.disabled = false;
    btnAnalyze.innerText = 'INICIAR ESCANEAMENTO';
  } else {
    btnAnalyze.disabled = true;
    if (!descriptors[1] && !descriptors[2]) {
      btnAnalyze.innerText = 'ENVIE AS DUAS IMAGENS';
    } else if (!descriptors[1]) {
      btnAnalyze.innerText = 'SUJEITO A SEM ROSTO';
    } else if (!descriptors[2]) {
      btnAnalyze.innerText = 'SUJEITO B SEM ROSTO';
    }
  }
}

// Similarity Calculation
async function runAnalysis() {
  if (!descriptors[1] || !descriptors[2]) return;

  const isGeneticMode = timeTravelToggle.checked;
  btnAnalyze.innerText = 'PROCESSANDO...';
  btnAnalyze.disabled = true;
  
  // Adding "scanning" class for animation
  document.querySelectorAll('.upload-card').forEach(c => c.classList.add('scanning'));

  // Artificial delay for dramatic effect (shorter if just toggling)
  if (resultsSection.classList.contains('hidden')) {
    await new Promise(r => setTimeout(r, 1500));
  } else {
    await new Promise(r => setTimeout(r, 500));
  }

  // Euclidean Distance
  const distance = faceapi.euclideanDistance(descriptors[1], descriptors[2]);
  
  // NEW GENEROUS FORMULA FOR FAMILY
  // Child/Parent distance usually around 0.6 - 0.75
  // We want 0.6 to be ~90% and 0.8 to be ~55%
  const isGenetic = timeTravelToggle.checked;
  const baseThreshold = isGenetic ? 1.15 : 1.05;
  
  // Exponential scaling for better feel
  let score = Math.pow((baseThreshold - distance) / 0.6, 1.2);
  
  if (score < 0) score = Math.random() * 0.08;
  if (score > 0.99) score = 0.98 + (Math.random() * 0.015);
  
  const percentage = Math.round(score * 100);
  
  updateResultsUI(percentage, distance);
  
  document.querySelectorAll('.upload-card').forEach(c => c.classList.remove('scanning'));
  btnAnalyze.innerText = 'ESCANEAMENTO CONCLUÍDO';
  resultsSection.classList.remove('hidden');
  btnDownload.classList.remove('hidden');
}

function updateResultsUI(pct, distance) {
  // Update main gauge
  similarityScore.innerText = `${pct}%`;
  const offset = 283 - (283 * pct) / 100;
  meterCircle.style.strokeDashoffset = offset;

  // VERDICT LOGIC
  verdictContainer.classList.remove('hidden');
  if (pct >= 85) {
    verdictContainer.innerText = "DNA ESPELHADO: Parentesco de 1º Grau (Direto)";
    verdictContainer.style.borderColor = "#00ff88";
  } else if (pct >= 65) {
    verdictContainer.innerText = "HERANÇA FORTE: Traços Genéticos Compartilhados";
    verdictContainer.style.borderColor = "var(--accent-color)";
  } else if (pct >= 40) {
    verdictContainer.innerText = "VÍNCULO BIOMÉTRICO: Similaridade Moderada";
    verdictContainer.style.borderColor = "#ffcc00";
  } else {
    verdictContainer.innerText = "TRAÇOS ÚNICOS: Baixa Similaridade Estrutural";
    verdictContainer.style.borderColor = "#ff4d4d";
  }

  // Feature Breakdown
  const variance = timeTravelToggle.checked ? 3 : 8;
  const features = {
    brows: Math.min(100, pct + (Math.random() * variance - variance/2)),
    eyes: Math.min(100, pct + (Math.random() * variance - variance/2)),
    nasolabial: Math.min(100, pct + (Math.random() * variance - variance/2)),
    jaw: Math.min(100, pct + (Math.random() * variance - variance/2))
  };

  Object.keys(features).forEach(key => {
    const val = Math.max(0, Math.round(features[key]));
    const item = document.querySelector(`[data-feature="${key}"]`);
    item.querySelector('.bar').style.width = `${val}%`;
    item.querySelector('.val').innerText = `${val}%`;
  });
}

// Init
const timeTravelToggle = document.getElementById('time-travel-mode');

timeTravelToggle.addEventListener('change', (e) => {
  const isChecked = e.target.checked;
  
  // Apply visual effect to CANVASES (not hidden images)
  document.querySelectorAll('.preview-container canvas').forEach(canvas => {
    if (isChecked) {
      canvas.style.filter = 'sepia(100%) hue-rotate(150deg) brightness(1.2) contrast(1.2)';
    } else {
      canvas.style.filter = 'none';
    }
  });

  // Re-run analysis if results are already showing
  if (!resultsSection.classList.contains('hidden')) {
    runAnalysis();
  }
});

// Download Result as Certificate
async function handleDownload() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 1080;
  canvas.height = 1350; // Instagram Portrait size

  // Background
  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw header
  ctx.fillStyle = '#00f2ff';
  ctx.font = 'bold 60px Orbitron';
  ctx.textAlign = 'center';
  ctx.fillText('ANCESTRYLENS', canvas.width/2, 120);
  
  ctx.fillStyle = '#94a3b8';
  ctx.font = '30px Inter';
  ctx.fillText('RELATÓRIO DE COMPATIBILIDADE BIOMÉTRICA', canvas.width/2, 170);

  // Draw Subject A
  const imgA = images[1];
  ctx.drawImage(imgA, 100, 250, 400, 500);
  ctx.strokeStyle = '#00f2ff';
  ctx.lineWidth = 5;
  ctx.strokeRect(100, 250, 400, 500);
  
  // Draw Subject B
  const imgB = images[2];
  ctx.drawImage(imgB, 580, 250, 400, 500);
  ctx.strokeRect(580, 250, 400, 500);

  // Draw Result Circle
  ctx.beginPath();
  ctx.arc(canvas.width/2, 900, 150, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 242, 255, 0.1)';
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#00f2ff';
  ctx.font = 'bold 100px Orbitron';
  ctx.fillText(similarityScore.innerText, canvas.width/2, 930);

  // Draw Verdict
  ctx.fillStyle = '#fff';
  ctx.font = '40px Inter';
  ctx.fillText(verdictContainer.innerText, canvas.width/2, 1100);

  // Footer Credit
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '24px Orbitron';
  ctx.fillText('DESENVOLVIDO POR STEPHANY LIMA DE MATTOS', canvas.width/2, 1280);

  // Download
  const link = document.createElement('a');
  link.download = 'AncestryLens-Resultado.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

btnDownload.addEventListener('click', handleDownload);
btnAnalyze.addEventListener('click', runAnalysis);
loadModels().then(setupUploads);

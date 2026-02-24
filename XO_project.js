// ─── THREE.JS 3D BACKGROUND ───────────────────────────────────────────────
const canvas = document.getElementById('three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 30;

// Floating geometric shapes
const shapes = [];
const geometries = [
  new THREE.TorusGeometry(1, 0.3, 16, 60),
  new THREE.OctahedronGeometry(1),
  new THREE.TetrahedronGeometry(1),
  new THREE.IcosahedronGeometry(1),
];
const materials = [
  new THREE.MeshStandardMaterial({ color: 0xff4d6d, wireframe: true, transparent: true, opacity: 0.4 }),
  new THREE.MeshStandardMaterial({ color: 0x4cc9f0, wireframe: true, transparent: true, opacity: 0.4 }),
  new THREE.MeshStandardMaterial({ color: 0x7b5ea7, wireframe: true, transparent: true, opacity: 0.3 }),
];

for (let i = 0; i < 30; i++) {
  const geo = geometries[Math.floor(Math.random() * geometries.length)];
  const mat = materials[Math.floor(Math.random() * materials.length)];
  const mesh = new THREE.Mesh(geo, mat.clone());
  const scale = Math.random() * 1.5 + 0.3;
  mesh.scale.set(scale, scale, scale);
  mesh.position.set(
    (Math.random() - 0.5) * 60,
    (Math.random() - 0.5) * 40,
    (Math.random() - 0.5) * 20 - 10
  );
  mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  mesh.userData = {
    rx: (Math.random() - 0.5) * 0.008,
    ry: (Math.random() - 0.5) * 0.012,
    floatSpeed: Math.random() * 0.0005 + 0.0002,
    floatOffset: Math.random() * Math.PI * 2,
  };
  scene.add(mesh);
  shapes.push(mesh);
}

// Particle field
const particleCount = 500;
const pGeo = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount * 3; i++) {
  positions[i] = (Math.random() - 0.5) * 80;
}
pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const pMat = new THREE.PointsMaterial({ color: 0x4444aa, size: 0.12, transparent: true, opacity: 0.6 });
const particles = new THREE.Points(pGeo, pMat);
scene.add(particles);

// Grid lines (XO grid in 3D)
function createLine3D(x1, y1, z1, x2, y2, z2, color) {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(x1, y1, z1),
    new THREE.Vector3(x2, y2, z2)
  ]);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.2 });
  return new THREE.Line(geo, mat);
}
const gridGroup = new THREE.Group();
gridGroup.position.z = -5;
for (let i = -10; i <= 10; i += 5) {
  gridGroup.add(createLine3D(i, -15, 0, i, 15, 0, 0x4444ff));
  gridGroup.add(createLine3D(-15, i, 0, 15, i, 0, 0x4444ff));
}
scene.add(gridGroup);

// Lighting
const ambientLight = new THREE.AmbientLight(0x111133, 2);
scene.add(ambientLight);
const pointLight1 = new THREE.PointLight(0xff4d6d, 2, 50);
pointLight1.position.set(10, 10, 10);
scene.add(pointLight1);
const pointLight2 = new THREE.PointLight(0x4cc9f0, 2, 50);
pointLight2.position.set(-10, -10, 10);
scene.add(pointLight2);

let t = 0;
function animate3D() {
  requestAnimationFrame(animate3D);
  t += 0.01;

  shapes.forEach(mesh => {
    mesh.rotation.x += mesh.userData.rx;
    mesh.rotation.y += mesh.userData.ry;
    mesh.position.y += Math.sin(t + mesh.userData.floatOffset) * mesh.userData.floatSpeed;
  });

  particles.rotation.y += 0.0003;
  gridGroup.rotation.z += 0.0005;

  pointLight1.position.x = Math.sin(t * 0.5) * 15;
  pointLight1.position.y = Math.cos(t * 0.3) * 10;
  pointLight2.position.x = Math.cos(t * 0.4) * 15;
  pointLight2.position.y = Math.sin(t * 0.6) * 10;

  renderer.render(scene, camera);
}
animate3D();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── GAME LOGIC (FIXED) ───────────────────────────────────────────────────
const WIN_COMBOS = [
  [0,1,2],[3,4,5],[6,7,8], // rows
  [0,3,6],[1,4,7],[2,5,8], // cols
  [0,4,8],[2,4,6],         // diagonals
];

let board = Array(9).fill('');   // '' | 'X' | 'O'
let currentPlayer = null;        // 'X' | 'O' — the human's chosen symbol
let currentTurn = null;          // whose turn it is right now
let gameActive = false;
let scores = { X: 0, O: 0, D: 0 };

function choosePlayer(symbol) {
  currentPlayer = symbol;
  currentTurn = 'X'; // X always goes first
  gameActive = true;

  document.getElementById('choose-x').classList.toggle('active', symbol === 'X');
  document.getElementById('choose-o').classList.toggle('active', symbol === 'O');

  setStatus('');
  updateTurnIndicator();
}

function makeMove(index) {
  if (!gameActive) { setStatus('SELECT X OR O TO PLAY'); return; }
  if (board[index] !== '') return; // cell taken

  const cell = document.getElementById('c' + index);
  board[index] = currentTurn;

  if (currentTurn === 'X') {
    cell.textContent = '✕';
    cell.classList.add('x-cell', 'taken');
  } else {
    cell.textContent = '○';
    cell.classList.add('o-cell', 'taken');
  }

  const result = evalBoard();
  if (result) {
    endGame(result);
    return;
  }

  currentTurn = currentTurn === 'X' ? 'O' : 'X';
  updateTurnIndicator();
}

function evalBoard() {
  for (const [a, b, c] of WIN_COMBOS) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return { winner: board[a], combo: [a, b, c] };
    }
  }
  if (board.every(v => v !== '')) return { winner: 'DRAW' };
  return null;
}

function checkWinner() {
  if (!gameActive) { setStatus('START A GAME FIRST'); return; }
  const result = evalBoard();
  if (result) endGame(result);
  else setStatus('GAME STILL IN PROGRESS...');
}

function endGame(result) {
  gameActive = false;
  if (result.winner === 'DRAW') {
    setStatus('⬡  DRAW — NOBODY WINS!');
    scores.D++;
    document.getElementById('score-d').textContent = scores.D;
  } else {
    const label = result.winner === currentPlayer ? 'YOU WIN' : 'YOU LOSE';
    const emoji = result.winner === 'X' ? '✕' : '○';
    setStatus(`${emoji} ${result.winner} WINS! ${label}!`);
    scores[result.winner]++;
    document.getElementById('score-x').textContent = scores.X;
    document.getElementById('score-o').textContent = scores.O;
    // Highlight winning cells
    result.combo.forEach(i => {
      document.getElementById('c' + i).classList.add('win-cell');
    });
  }
  document.getElementById('turn-indicator').textContent = '── GAME OVER ──';
  document.getElementById('turn-indicator').className = 'turn-indicator';
}

function restartGame() {
  board = Array(9).fill('');
  currentTurn = null;
  currentPlayer = null;
  gameActive = false;

  for (let i = 0; i < 9; i++) {
    const cell = document.getElementById('c' + i);
    cell.textContent = '';
    cell.className = 'cell';
  }
  document.getElementById('choose-x').classList.remove('active');
  document.getElementById('choose-o').classList.remove('active');
  document.getElementById('turn-indicator').textContent = 'SELECT X OR O TO START';
  document.getElementById('turn-indicator').className = 'turn-indicator';
  setStatus('');
}

function updateTurnIndicator() {
  const ti = document.getElementById('turn-indicator');
  const isMyTurn = currentTurn === currentPlayer;
  if (currentTurn === 'X') {
    ti.textContent = isMyTurn ? '✕ YOUR TURN — PLAY X' : '✕ X IS THINKING...';
    ti.className = 'turn-indicator active-x';
  } else {
    ti.textContent = isMyTurn ? '○ YOUR TURN — PLAY O' : '○ O IS THINKING...';
    ti.className = 'turn-indicator active-o';
  }
}

function setStatus(msg) {
  document.getElementById('status').textContent = msg;
}
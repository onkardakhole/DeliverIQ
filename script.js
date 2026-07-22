const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');
const instructions = document.getElementById('instructions');
const resetBtn = document.getElementById('resetBtn');

const GRID_SIZE = 10;
const SPACING = 60;

let nodes = [];
let startNode = null;
let endNode = null;

// Generate grid of nodes
function createGrid() {
  nodes = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      nodes.push({
        row,
        col,
        x: col * SPACING + 30,
        y: row * SPACING + 30
      });
    }
  }
}

// Draw all nodes + connecting lines between neighbors
function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // draw faint grid lines connecting neighbors
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  nodes.forEach(node => {
    const right = nodes.find(n => n.row === node.row && n.col === node.col + 1);
    const below = nodes.find(n => n.row === node.row + 1 && n.col === node.col);
    if (right) {
      ctx.beginPath();
      ctx.moveTo(node.x, node.y);
      ctx.lineTo(right.x, right.y);
      ctx.stroke();
    }
    if (below) {
      ctx.beginPath();
      ctx.moveTo(node.x, node.y);
      ctx.lineTo(below.x, below.y);
      ctx.stroke();
    }
  });

  // draw nodes on top
  nodes.forEach(node => {
    ctx.beginPath();
    ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);

    if (node === startNode) {
      ctx.fillStyle = '#4ade80';
    } else if (node === endNode) {
      ctx.fillStyle = '#f87171';
    } else {
      ctx.fillStyle = '#888';
    }

    ctx.fill();
  });
}

function getClickedNode(mouseX, mouseY) {
  return nodes.find(node => {
    const dx = node.x - mouseX;
    const dy = node.y - mouseY;
    return Math.sqrt(dx * dx + dy * dy) < 10;
  });
}

function updateInstructions() {
  if (!startNode) {
    instructions.textContent = 'Click a node to set START';
  } else if (!endNode) {
    instructions.textContent = 'Now click a node to set END';
  } else {
    instructions.textContent = 'Start and End set! Click Reset to try again.';
  }
}

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const clickedNode = getClickedNode(mouseX, mouseY);
  if (!clickedNode) return;

  if (!startNode) {
    startNode = clickedNode;
  } else if (!endNode && clickedNode !== startNode) {
    endNode = clickedNode;
  } else {
    startNode = clickedNode;
    endNode = null;
  }

  drawGrid();
  updateInstructions();
});

resetBtn.addEventListener('click', () => {
  startNode = null;
  endNode = null;
  drawGrid();
  updateInstructions();
});

// Initialize
createGrid();
drawGrid();
updateInstructions();
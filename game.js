// Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = Math.min(window.innerWidth - 20, 1000);
canvas.height = Math.min(window.innerHeight - 20, 700);

window.addEventListener('resize', () => {
    canvas.width = Math.min(window.innerWidth - 20, 1000);
    canvas.height = Math.min(window.innerHeight - 20, 700);
});

// Game State
let gameRunning = false;
let gameState = {
    player: {
        x: canvas.width / 2,
        y: canvas.height - 100,
        width: 30,
        height: 30,
        hp: 100,
        maxHp: 100,
        level: 1,
        exp: 0,
        expNeeded: 100,
        gold: 0,
        potions: 0,
        speed: 5,
        damage: 15,
        direction: 0,
        moving: false,
        attacking: false,
        attackCooldown: 0,
        invulnerableCooldown: 0
    },
    enemies: [],
    projectiles: [],
    particles: [],
    room: 1,
    roomEnemyCount: 0,
    wave: 1,
    keys: {},
    mouse: { x: 0, y: 0 }
};

// Input Handling
window.addEventListener('keydown', (e) => {
    gameState.keys[e.key.toLowerCase()] = true;
    
    if (e.key === ' ' && gameRunning) {
        e.preventDefault();
        gameState.player.attacking = true;
    }
    if (e.key.toLowerCase() === 'p' && gameRunning) {
        usePotion();
    }
});

window.addEventListener('keyup', (e) => {
    gameState.keys[e.key.toLowerCase()] = false;
});

window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    gameState.mouse.x = e.clientX - rect.left;
    gameState.mouse.y = e.clientY - rect.top;
});

canvas.addEventListener('click', () => {
    if (gameRunning) gameState.player.attacking = true;
});

// UI Buttons
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);
document.getElementById('instructionsBtn').addEventListener('click', () => {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('instructions').style.display = 'flex';
});
document.getElementById('backBtn').addEventListener('click', () => {
    document.getElementById('instructions').style.display = 'none';
    document.getElementById('menu').style.display = 'flex';
});

// Mobile Controls
document.querySelectorAll('.dpadBtn').forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
        const dir = e.target.dataset.dir;
        gameState.keys[dir] = true;
    });
    btn.addEventListener('pointerup', (e) => {
        const dir = e.target.dataset.dir;
        gameState.keys[dir] = false;
    });
});

document.getElementById('attackBtn')?.addEventListener('pointerdown', () => {
    if (gameRunning) gameState.player.attacking = true;
});

document.getElementById('potionBtn')?.addEventListener('pointerdown', () => {
    if (gameRunning) usePotion();
});

// Utility Functions
function distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

function createParticles(x, y, count = 5, color = '#ffaa00') {
    for (let i = 0; i < count; i++) {
        gameState.particles.push({
            x: x,
            y: y,
            vx: randomRange(-3, 3),
            vy: randomRange(-5, -1),
            life: 30,
            color: color
        });
    }
}

// Player Functions
function updatePlayer() {
    // Movement
    let moveX = 0;
    let moveY = 0;
    
    if (gameState.keys['arrowup'] || gameState.keys['w']) moveY = -gameState.player.speed;
    if (gameState.keys['arrowdown'] || gameState.keys['s']) moveY = gameState.player.speed;
    if (gameState.keys['arrowleft'] || gameState.keys['a']) moveX = -gameState.player.speed;
    if (gameState.keys['arrowright'] || gameState.keys['d']) moveX = gameState.player.speed;
    if (gameState.keys['up']) moveY = -gameState.player.speed;
    if (gameState.keys['down']) moveY = gameState.player.speed;
    if (gameState.keys['left']) moveX = -gameState.player.speed;
    if (gameState.keys['right']) moveX = gameState.player.speed;
    
    // Update position
    gameState.player.x = Math.max(gameState.player.width / 2, 
        Math.min(canvas.width - gameState.player.width / 2, gameState.player.x + moveX));
    gameState.player.y = Math.max(gameState.player.height / 2, 
        Math.min(canvas.height - gameState.player.height / 2, gameState.player.y + moveY));
    
    // Direction towards mouse
    gameState.player.direction = Math.atan2(
        gameState.mouse.y - gameState.player.y,
        gameState.mouse.x - gameState.player.x
    );
    
    // Cooldowns
    gameState.player.attackCooldown = Math.max(0, gameState.player.attackCooldown - 1);
    gameState.player.invulnerableCooldown = Math.max(0, gameState.player.invulnerableCooldown - 1);
    
    // Attack
    if (gameState.player.attacking && gameState.player.attackCooldown === 0) {
        playerAttack();
        gameState.player.attackCooldown = 20;
        gameState.player.attacking = false;
    }
}

function playerAttack() {
    const angle = gameState.player.direction;
    const damage = gameState.player.damage;
    
    // Create slash effect
    createParticles(gameState.player.x + Math.cos(angle) * 25, 
                   gameState.player.y + Math.sin(angle) * 25, 3, '#ffff00');
    
    // Check for enemy hits
    gameState.enemies.forEach((enemy, index) => {
        const dist = distance(gameState.player.x, gameState.player.y, enemy.x, enemy.y);
        if (dist < 60) {
            enemy.hp -= damage;
            createParticles(enemy.x, enemy.y, 5, '#ff0000');
            if (enemy.hp <= 0) {
                gameState.enemies.splice(index, 1);
                gameState.player.gold += enemy.gold;
                gainExp(enemy.exp);
            }
        }
    });
}

function usePotion() {
    if (gameState.player.potions > 0 && gameState.player.hp < gameState.player.maxHp) {
        gameState.player.potions--;
        gameState.player.hp = Math.min(gameState.player.maxHp, gameState.player.hp + 50);
        createParticles(gameState.player.x, gameState.player.y, 8, '#00ff00');
    }
}

function gainExp(amount) {
    gameState.player.exp += amount;
    if (gameState.player.exp >= gameState.player.expNeeded) {
        gameState.player.exp -= gameState.player.expNeeded;
        gameState.player.level++;
        gameState.player.maxHp += 20;
        gameState.player.hp = gameState.player.maxHp;
        gameState.player.damage += 5;
        gameState.player.expNeeded += 50;
        createParticles(gameState.player.x, gameState.player.y, 15, '#00ffff');
    }
}

// Enemy Functions
function spawnEnemy() {
    const side = Math.random();
    let x, y;
    
    if (side < 0.25) {
        x = randomRange(0, canvas.width);
        y = -20;
    } else if (side < 0.5) {
        x = randomRange(0, canvas.width);
        y = canvas.height + 20;
    } else if (side < 0.75) {
        x = -20;
        y = randomRange(0, canvas.height);
    } else {
        x = canvas.width + 20;
        y = randomRange(0, canvas.height);
    }
    
    const enemy = {
        x: x,
        y: y,
        width: 25,
        height: 25,
        hp: 30 + gameState.room * 5,
        maxHp: 30 + gameState.room * 5,
        speed: 2 + gameState.room * 0.5,
        damage: 10 + gameState.room * 2,
        exp: 10 + gameState.room * 5,
        gold: 5 + gameState.room * 3,
        attackCooldown: 0
    };
    
    gameState.enemies.push(enemy);
    gameState.roomEnemyCount++;
}

function updateEnemies() {
    gameState.enemies.forEach((enemy, index) => {
        // Move towards player
        const dx = gameState.player.x - enemy.x;
        const dy = gameState.player.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist > 0) {
            enemy.x += (dx / dist) * enemy.speed;
            enemy.y += (dy / dist) * enemy.speed;
        }
        
        // Attack
        enemy.attackCooldown--;
        if (dist < 50 && enemy.attackCooldown < 0) {
            enemyAttack(enemy);
            enemy.attackCooldown = 60;
        }
    });
}

function enemyAttack(enemy) {
    const dx = gameState.player.x - enemy.x;
    const dy = gameState.player.y - enemy.y;
    const angle = Math.atan2(dy, dx);
    
    gameState.projectiles.push({
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        radius: 5,
        damage: enemy.damage,
        owner: 'enemy'
    });
}

// Projectile Functions
function updateProjectiles() {
    gameState.projectiles = gameState.projectiles.filter(proj => {
        proj.x += proj.vx;
        proj.y += proj.vy;
        
        // Check collision with player
        if (proj.owner === 'enemy') {
            const dist = distance(proj.x, proj.y, gameState.player.x, gameState.player.y);
            if (dist < gameState.player.width / 2 + proj.radius && gameState.player.invulnerableCooldown === 0) {
                gameState.player.hp -= proj.damage;
                gameState.player.invulnerableCooldown = 30;
                createParticles(proj.x, proj.y, 5, '#ff5555');
                return false;
            }
        }
        
        // Out of bounds
        return proj.x > -20 && proj.x < canvas.width + 20 && proj.y > -20 && proj.y < canvas.height + 20;
    });
}

// Particle Functions
function updateParticles() {
    gameState.particles = gameState.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life--;
        return p.life > 0;
    });
}

// Drawing Functions
function drawPlayer() {
    ctx.save();
    ctx.translate(gameState.player.x, gameState.player.y);
    ctx.rotate(gameState.player.direction);
    
    // Body
    ctx.fillStyle = gameState.player.invulnerableCooldown > 0 && Math.random() > 0.5 ? '#ffff00' : '#0099ff';
    ctx.fillRect(-gameState.player.width / 2, -gameState.player.height / 2, 
                 gameState.player.width, gameState.player.height);
    
    // Weapon
    ctx.fillStyle = '#888';
    ctx.fillRect(gameState.player.width / 2 - 5, -5, 15, 10);
    
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.fillRect(-5, -5, 5, 5);
    ctx.fillRect(5, -5, 5, 5);
    
    ctx.restore();
    
    // Health bar
    const barWidth = 50;
    const barHeight = 5;
    ctx.fillStyle = '#333';
    ctx.fillRect(gameState.player.x - barWidth / 2, gameState.player.y - gameState.player.height / 2 - 15, barWidth, barHeight);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(gameState.player.x - barWidth / 2, gameState.player.y - gameState.player.height / 2 - 15, 
                 barWidth * (gameState.player.hp / gameState.player.maxHp), barHeight);
}

function drawEnemies() {
    gameState.enemies.forEach(enemy => {
        // Body
        ctx.fillStyle = '#ff5555';
        ctx.fillRect(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, enemy.width, enemy.height);
        
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.fillRect(enemy.x - 8, enemy.y - 5, 4, 4);
        ctx.fillRect(enemy.x + 4, enemy.y - 5, 4, 4);
        
        // Health bar
        const barWidth = 30;
        ctx.fillStyle = '#333';
        ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.height / 2 - 10, barWidth, 3);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.height / 2 - 10, 
                     barWidth * (enemy.hp / enemy.maxHp), 3);
    });
}

function drawProjectiles() {
    gameState.projectiles.forEach(proj => {
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        ctx.fillStyle = proj.owner === 'enemy' ? '#ff5555' : '#ffff00';
        ctx.fill();
    });
}

function drawParticles() {
    gameState.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 30;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        ctx.globalAlpha = 1;
    });
}

function drawDoor() {
    const doorX = canvas.width - 40;
    const doorY = canvas.height - 50;
    const doorWidth = 30;
    const doorHeight = 50;
    
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(doorX - doorWidth / 2, doorY - doorHeight / 2, doorWidth, doorHeight);
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    ctx.strokeRect(doorX - doorWidth / 2, doorY - doorHeight / 2, doorWidth, doorHeight);
    
    // Door handle
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(doorX + 5, doorY, 3, 0, Math.PI * 2);
    ctx.fill();
}

function draw() {
    // Background
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Draw game objects
    drawEnemies();
    drawProjectiles();
    drawParticles();
    drawPlayer();
    drawDoor();
    
    // Draw cursor
    const radius = 8;
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(gameState.mouse.x, gameState.mouse.y, radius, 0, Math.PI * 2);
    ctx.stroke();
}

// Update HUD
function updateHUD() {
    document.getElementById('hpText').textContent = 
        `${Math.ceil(gameState.player.hp)}/${gameState.player.maxHp}`;
    document.getElementById('hpFill').style.width = 
        `${(gameState.player.hp / gameState.player.maxHp) * 100}%`;
    
    document.getElementById('expText').textContent = 
        `${gameState.player.exp}/${gameState.player.expNeeded}`;
    document.getElementById('expFill').style.width = 
        `${(gameState.player.exp / gameState.player.expNeeded) * 100}%`;
    
    document.getElementById('levelText').textContent = gameState.player.level;
    document.getElementById('goldText').textContent = gameState.player.gold;
    document.getElementById('potionText').textContent = gameState.player.potions;
    document.getElementById('roomText').textContent = `Room ${gameState.room}`;
    document.getElementById('enemyCount').textContent = `Enemies: ${gameState.enemies.length}`;
}

// Room progression
function checkRoomCompletion() {
    if (gameState.enemies.length === 0 && gameState.roomEnemyCount > 0) {
        // Drop potions randomly
        if (Math.random() > 0.6) gameState.player.potions++;
        
        // Next room
        gameState.room++;
        gameState.roomEnemyCount = 0;
        gameState.wave = Math.ceil(gameState.room / 2);
        
        // Spawn new enemies
        const enemyCount = 3 + gameState.room * 2;
        for (let i = 0; i < enemyCount; i++) {
            setTimeout(() => spawnEnemy(), i * 300);
        }
    }
}

function checkDoorCollision() {
    const doorX = canvas.width - 40;
    const doorY = canvas.height - 50;
    const dist = distance(gameState.player.x, gameState.player.y, doorX, doorY);
    
    if (dist < 40 && gameState.enemies.length === 0 && gameState.roomEnemyCount > 0) {
        checkRoomCompletion();
    }
}

// Game Loop
function gameLoop() {
    if (!gameRunning) return;
    
    updatePlayer();
    updateEnemies();
    updateProjectiles();
    updateParticles();
    checkDoorCollision();
    
    draw();
    updateHUD();
    
    // Check game over
    if (gameState.player.hp <= 0) {
        endGame();
        return;
    }
    
    requestAnimationFrame(gameLoop);
}

// Start Game
function startGame() {
    gameState = {
        player: {
            x: canvas.width / 2,
            y: canvas.height - 100,
            width: 30,
            height: 30,
            hp: 100,
            maxHp: 100,
            level: 1,
            exp: 0,
            expNeeded: 100,
            gold: 0,
            potions: 3,
            speed: 5,
            damage: 15,
            direction: 0,
            moving: false,
            attacking: false,
            attackCooldown: 0,
            invulnerableCooldown: 0
        },
        enemies: [],
        projectiles: [],
        particles: [],
        room: 1,
        roomEnemyCount: 0,
        wave: 1,
        keys: {},
        mouse: { x: canvas.width / 2, y: canvas.height / 2 }
    };
    
    document.getElementById('menu').style.display = 'none';
    document.getElementById('instructions').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    
    gameRunning = true;
    
    // Spawn initial enemies
    for (let i = 0; i < 3; i++) {
        setTimeout(() => spawnEnemy(), i * 300);
    }
    
    gameLoop();
}

// End Game
function endGame() {
    gameRunning = false;
    
    document.getElementById('finalLevel').textContent = gameState.player.level;
    document.getElementById('finalEnemies').textContent = gameState.roomEnemyCount;
    document.getElementById('finalGold').textContent = gameState.player.gold;
    document.getElementById('gameOver').style.display = 'flex';
}
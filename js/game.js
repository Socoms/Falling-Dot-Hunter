// Canvas와 Context 초기화
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 캔버스 크기 명시적 설정 (UI에 맞게 조정)
canvas.width = 600;
canvas.height = 400;
const scoreSpan = document.getElementById("score");
const levelSpan = document.getElementById("level");
const livesSpan = document.getElementById("lives");
const timerSpan = document.getElementById("timer");
const highScoreSpan = document.getElementById("highScore");

// 게임 상태 변수들
let gameState = 'modeSelection'; // 'modeSelection', 'menu', 'playing', 'paused', 'gameOver', 'leaderboard'
let currentMode = 'timer'; // 'timer', 'infinite', 'leaderboard'
let score = 0;
let level = 1;
let lives = 3;
let timeLeft = 60; // 60초 타이머
let soundEnabled = true; // 효과음 설정 (전역 변수)
let gameSpeed = 1;
let circles = [];
let particles = [];
let gameStarted = false; // 게임이 실제로 시작되었는지 추적
let gameStartTime = 0;
let lastCircleSpawn = 0;

// 각 모드별 별도 점수 시스템
let highScores = {
    timer: parseInt(localStorage.getItem('fallingDotHighScore_timer') || '0'),
    infinite: parseInt(localStorage.getItem('fallingDotHighScore_infinite') || '0'),
    leaderboard: parseInt(localStorage.getItem('fallingDotHighScore_leaderboard') || '0')
};

// 무한도전 모드 설정
const INFINITE_MODE_MAX_LEVEL = 20; // 최대 레벨 제한
const INFINITE_MODE_MAX_SPEED = 5; // 최대 속도 제한
const INFINITE_MODE_MIN_RADIUS = 10; // 최소 반지름 제한

// 리더보드 데이터 (로컬 스토리지 사용)
let leaderboardData = JSON.parse(localStorage.getItem('fallingDotLeaderboard') || '[]');

// 색상별 점수 설정
const colorScores = {
    'red': 3,
    'blue': 1,
    'green': 2,
    'orange': 2,
    'purple': 4,
    'teal': 1,
    'yellow': 5,
    'pink': 3
};

// 원 객체 생성 함수
function createCircle() {
    let radius, speed;
    
    if (currentMode === 'infinite') {
        // 무한도전 모드: 난이도 상한선 적용
        const cappedLevel = Math.min(level, INFINITE_MODE_MAX_LEVEL);
        radius = Math.max(INFINITE_MODE_MIN_RADIUS, 40 - cappedLevel * 1.5);
        speed = Math.min(INFINITE_MODE_MAX_SPEED, 0.5 + cappedLevel * 0.2 + Math.random() * 0.5);
    } else {
        // 타이머/기록 모드: 기존 로직
        radius = Math.max(15, 40 - level * 2);
        speed = 0.5 + level * 0.3 + Math.random() * 1;
    }
    
    return {
        x: Math.random() * (canvas.width - 60) + 30,
        y: -30,
        r: radius,
        speed: speed,
        color: getRandomColor(),
        id: Date.now() + Math.random()
    };
}

// 랜덤 색상 함수 생성
function getRandomColor() {
    const colors = Object.keys(colorScores);
    return colors[Math.floor(Math.random() * colors.length)]; // 랜덤 색상 반환
}

// 파티클 생성 함수
function createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 30,
            color: color
        });
    }
}

// 파티클 업데이트
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.vx *= 0.98;
        p.vy *= 0.98;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// 파티클 그리기
function drawParticles() {
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life / 30;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// 원 그리기 함수
function drawCircle(circle) {
    // 그림자 효과
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2);
    ctx.fillStyle = circle.color;
    ctx.fill();
    ctx.closePath();
    
    // 테두리
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();
}

// 게임 초기화
function initGame(mode) {
    currentMode = mode;
    gameState = 'playing';
    gameStarted = true; // 게임 시작 플래그 설정
    score = 0;
    level = 1;
    circles = [];
    particles = [];
    gameStartTime = Date.now();
    lastCircleSpawn = 0;
    
    // 모드에 따른 설정
    if (mode === 'infinite') {
        lives = 5; // 무한도전 모드는 목숨 5개
        timeLeft = null; // 시간 제한 없음
    } else if (mode === 'leaderboard') {
        // 기록 모드는 타이머 모드와 동일하지만 리더보드에 기록
        lives = 3;
        timeLeft = 60;
    } else {
        // 타이머 모드
        lives = 3;
        timeLeft = 60;
    }
    
    // 게임 시작 시 첫 번째 원 즉시 생성
    circles.push(createCircle());
    
    updateUI();
    showGameInterface();
}

// 게임 리셋
function resetGame() {
    gameState = 'menu';
    gameStarted = false; // 게임 시작 플래그 리셋
    circles = [];
    particles = [];
    updateUI();
}

// UI 업데이트
function updateUI() {
    if (scoreSpan) scoreSpan.textContent = score;
    if (levelSpan) levelSpan.textContent = level;
    if (livesSpan) livesSpan.textContent = lives;
    if (timerSpan) timerSpan.textContent = timeLeft;
    
    // 현재 모드의 최고점수 표시
    if (highScoreSpan) {
        highScoreSpan.textContent = highScores[currentMode] || 0;
    }
    
    // 모드 표시 업데이트
    const modeElement = document.getElementById('currentModeDisplay');
    if (modeElement) {
        const modeNames = {
            'timer': '⏰ 타이머 모드',
            'infinite': '♾️ 무한도전 모드',
            'leaderboard': '🏆 기록 모드'
        };
        modeElement.textContent = modeNames[currentMode] || '⏰ 타이머 모드';
    }
    
    // 타이머 아이템 표시/숨김
    const timerItem = document.getElementById('timerItem');
    if (timerItem) {
        timerItem.style.display = (currentMode === 'infinite') ? 'none' : 'flex';
    }
}

// 게임 인터페이스 표시
function showGameInterface() {
    document.getElementById('modeSelection').style.display = 'none';
    document.getElementById('gameInfo').style.display = 'flex';
    document.getElementById('gameCanvas').style.display = 'block';
    document.getElementById('leaderboard').style.display = 'none';
}

// 모드 선택 화면 표시
function showModeSelection() {
    document.getElementById('modeSelection').style.display = 'block';
    document.getElementById('gameInfo').style.display = 'none';
    document.getElementById('gameCanvas').style.display = 'none';
    document.getElementById('leaderboard').style.display = 'none';
}

// 리더보드 화면 표시
function showLeaderboard() {
    gameState = 'leaderboard'; // 게임 상태를 리더보드로 설정
    document.getElementById('modeSelection').style.display = 'none';
    document.getElementById('gameInfo').style.display = 'none';
    document.getElementById('gameCanvas').style.display = 'none';
    document.getElementById('leaderboard').style.display = 'block';
    updateLeaderboard();
}

// 리더보드 업데이트
function updateLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    const myBestScore = document.getElementById('myBestScore');
    const myRank = document.getElementById('myRank');
    
    // 리더보드 정렬 (점수 높은 순)
    leaderboardData.sort((a, b) => b.score - a.score);
    
    // TOP 10 표시
    leaderboardList.innerHTML = '';
    for (let i = 0; i < Math.min(10, leaderboardData.length); i++) {
        const player = leaderboardData[i];
        const item = document.createElement('div');
        item.className = `leaderboard-item rank-${i + 1}`;
        item.innerHTML = `
            <span class="rank">${i + 1}</span>
            <span class="player-name">${player.name}</span>
            <span class="player-score">${player.score}</span>
        `;
        leaderboardList.appendChild(item);
    }
    
    // 나의 기록 표시 (기록 모드 최고점수)
    const myBest = highScores.leaderboard;
    myBestScore.textContent = myBest;
    
    // 나의 순위 찾기
    const myRankIndex = leaderboardData.findIndex(player => player.score <= myBest);
    myRank.textContent = myRankIndex >= 0 ? myRankIndex + 1 : leaderboardData.length + 1;
}

// 리더보드에 점수 추가
function addToLeaderboard(playerName, playerScore) {
    const newEntry = {
        name: playerName,
        score: playerScore,
        date: new Date().toISOString()
    };
    
    leaderboardData.push(newEntry);
    leaderboardData.sort((a, b) => b.score - a.score);
    
    // 상위 50개만 유지
    if (leaderboardData.length > 50) {
        leaderboardData = leaderboardData.slice(0, 50);
    }
    
    localStorage.setItem('fallingDotLeaderboard', JSON.stringify(leaderboardData));
}

// 레벨 업데이트
function updateLevel() {
    const newLevel = Math.floor(score / 10) + 1;
    if (newLevel > level) {
        level = newLevel;
        // 레벨업 시 효과
        createParticles(canvas.width / 2, canvas.height / 2, 'gold');
    }
}

// 원 스폰 관리
function spawnCircles() {
    const now = Date.now();
    const spawnRate = Math.max(2000, 4000 - level * 150); // 레벨이 올라갈수록 더 자주 스폰 (더 느리게)
    
    // 첫 번째 원이 화면을 벗어났거나 원이 없을 때 새 원 생성
    if (circles.length === 0 || (now - lastCircleSpawn > spawnRate)) {
        circles.push(createCircle());
        lastCircleSpawn = now;
    }
}

// 게임 업데이트 함수
function updateGame() {
    if (gameState !== 'playing') {
        return;
    }
    
    // 타이머 업데이트 (무한도전 모드가 아닌 경우만)
    if (currentMode !== 'infinite') {
        const now = Date.now();
        timeLeft = Math.max(0, 60 - Math.floor((now - gameStartTime) / 1000));
    }
    
    // 원 스폰
    spawnCircles();
    
    // 원들 업데이트
    for (let i = circles.length - 1; i >= 0; i--) {
        const circle = circles[i];
        circle.y += circle.speed;
        
        // 원 그리기
        drawCircle(circle);
        
        // 바닥에 닿았을 때
    if (circle.y - circle.r > canvas.height) {
            circles.splice(i, 1);
            lives--;
            if (lives <= 0) {
                gameOver();
                return;
            }
        }
    }
    
    // 파티클 업데이트
    updateParticles();
    drawParticles();
    
    // 레벨 업데이트
    updateLevel();
    
    // UI 업데이트
    updateUI();
    
    // 시간 종료 체크 (무한도전 모드가 아닌 경우만)
    if (currentMode !== 'infinite' && timeLeft <= 0) {
        gameOver();
        return;
    }
}

// 게임 오버
function gameOver() {
    gameState = 'gameOver';
    
    // 현재 모드의 최고점수 업데이트
    if (score > highScores[currentMode]) {
        highScores[currentMode] = score;
        localStorage.setItem(`fallingDotHighScore_${currentMode}`, score.toString());
    }
    
    // 기록 모드인 경우 리더보드에 추가 (실제로 게임을 플레이했을 때만)
    if (currentMode === 'leaderboard' && gameStarted && score > 0) {
        const playerName = prompt('기록을 저장할 이름을 입력하세요:', 'Player');
        if (playerName && playerName.trim()) {
            addToLeaderboard(playerName.trim(), score);
        }
    }
    
    // 게임 시작 플래그 리셋
    gameStarted = false;
    
    updateUI();
    showGameOverScreen();
}

// 게임 오버 화면 표시
function showGameOverScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 80);
    
    ctx.font = '24px Arial';
    ctx.fillText(`최종 점수: ${score}`, canvas.width / 2, canvas.height / 2 - 30);
    ctx.fillText(`${currentMode === 'timer' ? '타이머' : currentMode === 'infinite' ? '무한도전' : '기록'} 모드 최고점수: ${highScores[currentMode]}`, canvas.width / 2, canvas.height / 2);
    ctx.fillText('클릭하여 같은 모드로 다시 시작', canvas.width / 2, canvas.height / 2 + 40);
    ctx.fillText('ESC: 모드 선택으로 돌아가기', canvas.width / 2, canvas.height / 2 + 80);
}

// 메뉴 화면 표시
function showMenu() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Falling Dot Hunter', canvas.width / 2, canvas.height / 2 - 100);
    
    ctx.font = '20px Arial';
    ctx.fillText('클릭하여 시작', canvas.width / 2, canvas.height / 2 - 50);
    ctx.fillText('스페이스바: 일시정지', canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillText(`최고 점수: ${highScore}`, canvas.width / 2, canvas.height / 2 + 20);
}

// 모드 선택 이벤트
document.addEventListener('DOMContentLoaded', function() {
    // 모드 선택 버튼들
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const mode = this.getAttribute('data-mode');
            initGame(mode);
        });
    });
    
    // 메인메뉴 토글 버튼
    const menuToggleBtn = document.getElementById('menuToggle');
    const sidebarMenu = document.getElementById('sidebarMenu');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const closeMenuBtn = document.getElementById('closeMenu');
    
    // 뒤돌아가기 버튼
    const backButton = document.getElementById('backButton');
    
    // 햄버거 메뉴 토글 함수
    function toggleSidebar() {
        const isOpen = sidebarMenu.classList.contains('active');
        
        if (isOpen) {
            // 사이드바 닫기
            sidebarMenu.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        } else {
            // 사이드바 열기
            sidebarMenu.classList.add('active');
            sidebarOverlay.classList.add('active');
        }
    }
    
    if (menuToggleBtn) {
        menuToggleBtn.addEventListener('click', function() {
            toggleSidebar();
        });
    }
    
    // 뒤돌아가기 버튼 이벤트 리스너
    if (backButton) {
        backButton.addEventListener('click', function() {
            // 현재 게임 상태에 따라 적절한 화면으로 돌아가기
            if (gameState === 'playing' || gameState === 'paused' || gameState === 'gameOver') {
                // 게임 중이면 모드 선택으로 돌아가기
                showModeSelection();
            } else if (gameState === 'leaderboard') {
                // 리더보드 화면이면 모드 선택으로 돌아가기
                showModeSelection();
            }
        });
    }
    
    if (closeMenuBtn) {
        closeMenuBtn.addEventListener('click', toggleSidebar);
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function() {
            sidebarMenu.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }
    
    // 게임 설정 버튼 이벤트 리스너
    const gameSettingsBtn = document.getElementById('gameSettings');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettings');
    const soundEnabledCheckbox = document.getElementById('soundEnabled');
    const saveSettingsBtn = document.getElementById('saveSettings');
    
    // 설정 변경 추적 변수
    let hasUnsavedChanges = false;
    
    // 설정 로드
    function loadSettings() {
        const savedSoundSetting = localStorage.getItem('soundEnabled');
        if (savedSoundSetting !== null) {
            soundEnabled = savedSoundSetting === 'true';
            soundEnabledCheckbox.checked = soundEnabled;
        }
    }
    
    // 설정 저장
    function saveSettings() {
        localStorage.setItem('soundEnabled', soundEnabled.toString());
        hasUnsavedChanges = false;
        saveSettingsBtn.disabled = true;
    }
    
    // 저장 버튼 상태 업데이트
    function updateSaveButton() {
        hasUnsavedChanges = true;
        saveSettingsBtn.disabled = false;
    }
    
    if (gameSettingsBtn) {
        gameSettingsBtn.addEventListener('click', function() {
            settingsModal.classList.add('active');
            // 사이드바 닫기
            sidebarMenu.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }
    
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', function() {
            settingsModal.classList.remove('active');
        });
    }
    
    // 효과음 설정 변경
    if (soundEnabledCheckbox) {
        soundEnabledCheckbox.addEventListener('change', function() {
            soundEnabled = this.checked;
            updateSaveButton();
        });
    }
    
    // 저장하기 버튼
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', function() {
            saveSettings();
        });
    }
    
    // 설정 모달 외부 클릭 시 닫기
    if (settingsModal) {
        settingsModal.addEventListener('click', function(e) {
            if (e.target === settingsModal) {
                settingsModal.classList.remove('active');
            }
        });
    }
    
        // 도움말 버튼 이벤트 리스너
        const helpBtn = document.getElementById('help');
        const helpModal = document.getElementById('helpModal');
        const closeHelpBtn = document.getElementById('closeHelp');
        
        if (helpBtn) {
            helpBtn.addEventListener('click', function() {
                helpModal.classList.add('active');
                // 사이드바 닫기
                sidebarMenu.classList.remove('active');
                sidebarOverlay.classList.remove('active');
            });
        }
        
        if (closeHelpBtn) {
            closeHelpBtn.addEventListener('click', function() {
                helpModal.classList.remove('active');
            });
        }
        
        // 개발자 정보 버튼 이벤트 리스너
        const developerBtn = document.getElementById('developerInfo');
        const developerModal = document.getElementById('developerModal');
        const closeDeveloperBtn = document.getElementById('closeDeveloper');
        
        if (developerBtn) {
            developerBtn.addEventListener('click', function() {
                developerModal.classList.add('active');
                // 사이드바 닫기
                sidebarMenu.classList.remove('active');
                sidebarOverlay.classList.remove('active');
            });
        }
        
        if (closeDeveloperBtn) {
            closeDeveloperBtn.addEventListener('click', function() {
                developerModal.classList.remove('active');
            });
        }
        
        // 버전 정보 버튼 이벤트 리스너
        const versionBtn = document.getElementById('versionInfo');
        const versionModal = document.getElementById('versionModal');
        const closeVersionBtn = document.getElementById('closeVersion');
        
        if (versionBtn) {
            versionBtn.addEventListener('click', function() {
                versionModal.classList.add('active');
                // 사이드바 닫기
                sidebarMenu.classList.remove('active');
                sidebarOverlay.classList.remove('active');
            });
        }
        
        if (closeVersionBtn) {
            closeVersionBtn.addEventListener('click', function() {
                versionModal.classList.remove('active');
            });
        }
        
        // 개발자 아이콘 클릭 카운터
        let iconClickCount = 0;
        const devIcon = document.querySelector('.dev-icon-large');
        const easterEggBtn = document.getElementById('easterEgg');
        const easterEggModal = document.getElementById('easterEggModal');
        const closeEasterEggBtn = document.getElementById('closeEasterEgg');
        
        if (devIcon) {
            devIcon.addEventListener('click', function() {
                iconClickCount++;
                
                // 클릭 애니메이션 효과
                this.classList.add('clicked');
                setTimeout(() => {
                    this.classList.remove('clicked');
                }, 300);
                
                // 클릭 사운드 재생
                playSound();
                
                // 10번 클릭 시 이스터에그 표시
                if (iconClickCount >= 10) {
                    if (easterEggBtn) {
                        easterEggBtn.style.display = 'flex';
                        easterEggBtn.style.animation = 'easterEggBounce 0.5s ease';
                    }
                }
                
                // 클릭 횟수 표시 (개발자용)
                console.log(`개발자 아이콘 클릭 횟수: ${iconClickCount}/10`);
            });
        }
        
        // 이스터에그 버튼 이벤트 리스너
        if (easterEggBtn) {
            easterEggBtn.addEventListener('click', function() {
                easterEggModal.classList.add('active');
                // 사이드바 닫기
                sidebarMenu.classList.remove('active');
                sidebarOverlay.classList.remove('active');
            });
        }
        
        if (closeEasterEggBtn) {
            closeEasterEggBtn.addEventListener('click', function() {
                easterEggModal.classList.remove('active');
            });
        }
        
    
    // 도움말 모달 외부 클릭 시 닫기
    if (helpModal) {
        helpModal.addEventListener('click', function(e) {
            if (e.target === helpModal) {
                helpModal.classList.remove('active');
            }
        });
    }
    
    // 설정 로드
    loadSettings();
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (helpModal && helpModal.classList.contains('active')) {
                helpModal.classList.remove('active');
            }
            if (settingsModal && settingsModal.classList.contains('active')) {
                settingsModal.classList.remove('active');
            }
            if (developerModal && developerModal.classList.contains('active')) {
                developerModal.classList.remove('active');
            }
            if (versionModal && versionModal.classList.contains('active')) {
                versionModal.classList.remove('active');
            }
            if (easterEggModal && easterEggModal.classList.contains('active')) {
                easterEggModal.classList.remove('active');
            }
        }
    });
    
    // 리더보드 보기 버튼
    const viewLeaderboardBtn = document.getElementById('viewLeaderboard');
    if (viewLeaderboardBtn) {
        viewLeaderboardBtn.addEventListener('click', function() {
            showLeaderboard();
        });
    }
    
});

// 원 클릭 이벤트
canvas.addEventListener("click", function (e) {
    e.preventDefault(); // 기본 동작 방지
    
    if (gameState === 'menu') {
        initGame('timer');
        return;
    }
    
    if (gameState === 'gameOver') {
        // 같은 모드로 다시 시작
        initGame(currentMode);
        return;
    }
    
    if (gameState !== 'playing') return;
    
    // 캔버스의 실제 크기와 표시 크기 고려
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    // 디버깅을 위한 클릭 위치 표시
    console.log(`클릭 위치: (${mouseX}, ${mouseY}), 캔버스 크기: ${canvas.width}x${canvas.height}`);
    
    // 모든 원에 대해 충돌 검사
    for (let i = circles.length - 1; i >= 0; i--) {
        const circle = circles[i];
        const dx = mouseX - circle.x;
        const dy = mouseY - circle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        console.log(`원 ${i}: 위치(${circle.x}, ${circle.y}), 반지름: ${circle.r}, 거리: ${distance}, 판정: ${distance < circle.r + 2 ? '성공' : '실패'}`);
        
        // 클릭 판정 (2픽셀 여유로 조정)
        if (distance < circle.r + 2) {
            // 클릭 성공
            const points = colorScores[circle.color] || 1;
            score += points;
            
            // 파티클 효과
            createParticles(circle.x, circle.y, circle.color);
            
            // 원 제거
            circles.splice(i, 1);
            
            // 효과음 재생 (간단한 beep)
            playSound();
            
            // 하나의 원만 클릭되도록 즉시 반복문 종료
            console.log(`클릭 성공! 점수: +${points}, 총 점수: ${score}`);
            break;
        }
    }
});

// 터치 이벤트 지원 (모바일)
canvas.addEventListener("touchstart", function (e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent("click", {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
});

// 키보드 이벤트
document.addEventListener("keydown", function(e) {
    if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'playing') {
            gameState = 'paused';
        } else if (gameState === 'paused') {
            gameState = 'playing';
        }
    } else if (e.code === 'Escape') {
        e.preventDefault();
        if (gameState === 'gameOver') {
            showModeSelection();
        } else if (gameState === 'playing' || gameState === 'paused') {
            showModeSelection();
        }
    }
});

// 효과음 재생 (간단한 버전)
function playSound() {
    // 효과음이 비활성화되어 있으면 재생하지 않음
    if (typeof soundEnabled !== 'undefined' && !soundEnabled) return;
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

// 메인 게임 루프
function gameLoop() {
    // Canvas 기본 회색 배경 (기획서 요구사항)
    ctx.fillStyle = '#808080'; // 회색 배경
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (gameState === 'modeSelection') {
        // 모드 선택 화면은 HTML로 처리
    } else if (gameState === 'leaderboard') {
        // 리더보드 화면은 HTML로 처리
    } else if (gameState === 'menu') {
        showMenu();
    } else if (gameState === 'playing') {
updateGame();
    } else if (gameState === 'paused') {
        // 일시정지 화면
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('일시정지', canvas.width / 2, canvas.height / 2);
        ctx.font = '20px Arial';
        ctx.fillText('스페이스바를 눌러 계속', canvas.width / 2, canvas.height / 2 + 40);
    } else if (gameState === 'gameOver') {
        showGameOverScreen();
    }
    
    requestAnimationFrame(gameLoop);
}

// 게임 시작
updateUI();
gameLoop();

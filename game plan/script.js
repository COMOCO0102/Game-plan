const GRID_SIZE = 10;
const BLACK_CELL_PERCENTAGE = 0.2;
const totalCells = GRID_SIZE * GRID_SIZE;

// 獲取網頁元素
const grid = document.getElementById('grid');
const mapContainer = document.getElementById('map-container'); 
const timerDisplay = document.getElementById('timer-display'); // 新增的計時器顯示元素

let scale = 1;

// ***** 追蹤變數 *****
let redCellIndex = -1;
let redCellElement = null;
let blueCellIndex = -1;
let blueCellElement = null;
let cellsArray = [];
let lastRedCellIndex = -1;
let blueMoveIntervalId;
let blueMoveDelay = 500; 

// ***** 勝利與計時追蹤變數 *****
let isBlueTrappedState = false; 
let hasTouchedBoundaries = { 
    top: false, 
    bottom: false, 
    left: false, 
    right: false 
};
let alertShownForTrappedBlue = false; 

let countdownTimerId = null; 
const MAX_COUNTDOWN = 10; // 倒數時間 (秒)
let currentCountdown = MAX_COUNTDOWN; 


// --- 輔助函式 ---

/**
 * 輔助函式：啟動倒數計時器
 */
function startCountdown() {
    // 確保計時器只啟動一次
    if (countdownTimerId !== null) return;
    
    currentCountdown = MAX_COUNTDOWN;
    if (timerDisplay) {
        timerDisplay.textContent = `倒數：${currentCountdown} 秒`;
    }

    countdownTimerId = setInterval(() => {
        currentCountdown--;
        if (timerDisplay) {
            timerDisplay.textContent = `倒數：${currentCountdown} 秒`;
        }

        if (currentCountdown <= 0) {
            clearInterval(countdownTimerId);
            countdownTimerId = null; 
            handleTimeOutFailure();
        }
    }, 1000); // 每秒執行一次
}

/**
 * 輔助函式：處理計時結束失敗
 */
function handleTimeOutFailure() {
    // 檢查是否已困住藍格子
    if (isBlueTrappedState) {
        // 檢查勝利條件是否達成
        const allBoundariesTouched = Object.values(hasTouchedBoundaries).every(status => status === true);

        if (!allBoundariesTouched) {
            clearInterval(blueMoveIntervalId); 
            window.removeEventListener('keydown', handleMovement); 
            window.removeEventListener('keydown', handleSpacebar); 
            
            // 確保計時器顯示最終狀態
            if (timerDisplay) {
                timerDisplay.textContent = "時間到！遊戲失敗。";
            }
            
            alert("時間到！紅格子未在 10 秒內觸碰所有邊界，遊戲失敗。"); 
            
            // 失敗後重啟遊戲
            restartGame(); 
        }
    }
}

/**
 * 輔助函式：處理遊戲重啟
 */
function restartGame() {
    // 清除舊的定時器
    clearInterval(blueMoveIntervalId); 
    
    // **清除並重設倒數計時器**
    if (countdownTimerId !== null) {
        clearInterval(countdownTimerId);
        countdownTimerId = null;
    }
    if (timerDisplay) {
        timerDisplay.textContent = ''; // 清空顯示
    }
    currentCountdown = MAX_COUNTDOWN;

    // 1. 清除舊的網格內容
    grid.innerHTML = '';
    cellsArray = [];

    // 2. 重設追蹤變數和狀態
    scale = 1;
    mapContainer.style.transform = `scale(${scale})`;
    redCellIndex = -1;
    blueCellIndex = -1;
    lastRedCellIndex = -1;
    
    // 重設勝利條件追蹤變數
    isBlueTrappedState = false;
    hasTouchedBoundaries = { 
        top: false, 
        bottom: false, 
        left: false, 
        right: false 
    };
    alertShownForTrappedBlue = false;
    
    // 移除邊界視覺回饋類別
    mapContainer.classList.remove(
        'border-top-touched', 
        'border-bottom-touched', 
        'border-left-touched', 
        'border-right-touched'
    );

    getDifficulty(); 
    
    // 3. 重新建立格子和物件
    createGrid();

    // 4. 重新設定藍色格子的定時移動 (使用新的 blueMoveDelay)
    blueMoveIntervalId = setInterval(autoMoveBlueCell, blueMoveDelay);

    // 5. 重新附加鍵盤事件監聽器
    window.addEventListener('keydown', handleMovement);
    window.addEventListener('keydown', handleSpacebar); 
}

/**
 * 輔助函式：處理勝利條件
 */
function handleWin() {
    const allBoundariesTouched = Object.values(hasTouchedBoundaries).every(status => status === true);
    
    if (isBlueTrappedState && allBoundariesTouched) {
        // 最終勝利
        clearInterval(blueMoveIntervalId); 
        window.removeEventListener('keydown', handleMovement); 
        window.removeEventListener('keydown', handleSpacebar); 
        
        // **清除倒數計時器**
        if (countdownTimerId !== null) {
            clearInterval(countdownTimerId);
            countdownTimerId = null;
        }
        if (timerDisplay) {
            timerDisplay.textContent = "勝利！";
        }
        
        alert("恭喜！藍色格子已被困住，且紅格子已觸碰所有邊界，你贏了！"); 
        
        restartGame(); 
    } else if (isBlueTrappedState && !allBoundariesTouched) {
        // 藍格子被困住，但邊界條件未達成，檢查是否需要彈出提示
        if (!alertShownForTrappedBlue) {
            alert("藍色格子已被困住！接下來，請操作紅格子觸碰所有四個邊界 (上、下、左、右) 來獲勝。你只有 10 秒！");
            alertShownForTrappedBlue = true;
        }
    }
}

/**
 * 輔助函式：檢查藍色格子是否被困住 (黑格子 + 邊界)
 */
function isBlueTrapped() {
    const moves = [-GRID_SIZE, GRID_SIZE, -1, 1]; 
    const currentBlueCol = blueCellIndex % GRID_SIZE;

    for (const move of moves) {
        let newBlueIndex = blueCellIndex + move;
        let isBoundary = false;

        if (newBlueIndex < 0 || newBlueIndex >= totalCells) {
            isBoundary = true;
        } else if (Math.abs(move) === 1) { 
            const newBlueCol = newBlueIndex % GRID_SIZE;
            if (Math.abs(currentBlueCol - newBlueCol) !== 1) {
                isBoundary = true;
            }
        }
        
        if (isBoundary) {
            continue; 
        }

        const targetCell = cellsArray[newBlueIndex];
        
        if (!targetCell.classList.contains('black')) {
            return false; 
        }
    }

    return true;
}


/**
 * 步驟 1: 建立 10x10 網格並隨機上色
 */
function createGrid() {
    for (let i = 0; i < totalCells; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        
        if (Math.random() < BLACK_CELL_PERCENTAGE) {
            cell.classList.add('black');
        }

        grid.appendChild(cell);
        cellsArray.push(cell);
    }
    
    // 初始化紅色格子
    redCellIndex = Math.floor(Math.random() * totalCells);
    redCellElement = cellsArray[redCellIndex];
    redCellElement.classList.remove('black');
    redCellElement.classList.add('red');
    
    // 初始化藍色格子
    let randomBlueIndex;
    do {
        randomBlueIndex = Math.floor(Math.random() * totalCells);
    } while (randomBlueIndex === redCellIndex);

    blueCellIndex = randomBlueIndex;
    blueCellElement = cellsArray[blueCellIndex];
    blueCellElement.classList.remove('black'); 
    blueCellElement.classList.add('blue');
}


/**
 * 步驟 3: 處理 WASD 鍵盤移動紅色格子 
 * **關鍵修正：只在藍格子被困住後才開始計數和變色**
 */
function handleMovement(event) {
    const key = event.key.toLowerCase();
    let newIndex = redCellIndex;
    const currentRow = Math.floor(redCellIndex / GRID_SIZE);
    const currentCol = redCellIndex % GRID_SIZE;
    
    
    // 只有在藍格子被困住後，紅格子的邊界觸碰才算數
    if (isBlueTrappedState) {
        
        // 1. 檢查並記錄邊界觸碰 (計數)
        if (currentRow === 0) hasTouchedBoundaries.top = true;
        if (currentRow === GRID_SIZE - 1) hasTouchedBoundaries.bottom = true;
        if (currentCol === 0) hasTouchedBoundaries.left = true;
        if (currentCol === GRID_SIZE - 1) hasTouchedBoundaries.right = true;

        // 2. 視覺回饋 (變色)
        if (hasTouchedBoundaries.top) mapContainer.classList.add('border-top-touched');
        if (hasTouchedBoundaries.bottom) mapContainer.classList.add('border-bottom-touched');
        if (hasTouchedBoundaries.left) mapContainer.classList.add('border-left-touched');
        if (hasTouchedBoundaries.right) mapContainer.classList.add('border-right-touched');

        // 3. 檢查是否達成最終勝利
        handleWin(); 
    }
    
    switch (key) {
        case 'w':
            newIndex = redCellIndex - GRID_SIZE;
            break;
        case 's':
            newIndex = redCellIndex + GRID_SIZE;
            break;
        case 'a':
            if (currentCol > 0) {
                newIndex = redCellIndex - 1;
            }
            break;
        case 'd':
            if (currentCol < GRID_SIZE - 1) {
                newIndex = redCellIndex + 1;
            }
            break;
        default:
            return;
    }
    
    // 邊界檢查
    if (newIndex >= 0 && newIndex < totalCells) {
        const newRedCellElement = cellsArray[newIndex];
        
        // 碰撞偵測：不能移動到黑色或藍色
        if (newRedCellElement.classList.contains('black') || 
            newRedCellElement.classList.contains('blue')) {
            return; 
        }
        
        // 執行移動：
        lastRedCellIndex = redCellIndex; 
        redCellElement.classList.remove('red');
        newRedCellElement.classList.add('red');
        
        redCellIndex = newIndex;
        redCellElement = newRedCellElement;
    }
}

/**
 * 步驟 4: 處理空白鍵事件
 * **關鍵修正：在困住藍格子時，重設邊界計數並啟動計時器**
 */
function handleSpacebar(event) {
    if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault(); 

        if (lastRedCellIndex !== -1) {
            
            if (lastRedCellIndex !== blueCellIndex) {
                const cellToTurnBlack = cellsArray[lastRedCellIndex];
                
                cellToTurnBlack.classList.remove('red'); 
                cellToTurnBlack.classList.add('black');
                
                // 檢查藍格子是否被困住，並更新全局狀態
                if (isBlueTrapped()) { 
                    isBlueTrappedState = true; 
                    
                    // === 關鍵重置點：確保邊界計數從 0 開始 ===
                    hasTouchedBoundaries = { 
                        top: false, 
                        bottom: false, 
                        left: false, 
                        right: false 
                    };
                    // 同步移除視覺回饋
                    mapContainer.classList.remove(
                        'border-top-touched', 
                        'border-bottom-touched', 
                        'border-left-touched', 
                        'border-right-touched'
                    );
                    // ======================================

                    handleWin(); // 檢查是否達成最終勝利，並顯示一次提示
                    
                    // **啟動倒數計時器**
                    startCountdown(); 
                    
                    return;
                }
                
                lastRedCellIndex = -1;
            } 
        }
    }
}

/**
 * 輔助函式：計算藍色格子移動的最佳安全路徑
 */
function calculateSafeMove() {
    const moves = [-GRID_SIZE, GRID_SIZE, -1, 1];
    const currentBlueCol = blueCellIndex % GRID_SIZE;
    const safeMoves = []; 

    for (const move of moves) {
        let newBlueIndex = blueCellIndex + move;
        let isBoundary = false;

        if (newBlueIndex < 0 || newBlueIndex >= totalCells) {
            isBoundary = true;
        } 
        else if (Math.abs(move) === 1) { 
            const newBlueCol = newBlueIndex % GRID_SIZE;
            if (Math.abs(currentBlueCol - newBlueCol) !== 1) {
                isBoundary = true;
            }
        }

        if (isBoundary) {
            continue; 
        }

        const targetCell = cellsArray[newBlueIndex];
        
        if (!targetCell.classList.contains('black') &&
            !targetCell.classList.contains('red')) 
        {
            safeMoves.push(newBlueIndex);
        }
    }

    return safeMoves;
}


/**
 * 步驟 5: 藍色格子自動移動邏輯
 * **關鍵修正：在困住藍格子時，重設邊界計數並啟動計時器**
 */
function autoMoveBlueCell() {
    
    // 如果藍格子已被困住，則不再移動
    if (isBlueTrappedState) {
        return;
    }
    
    // 在移動前檢查是否被困住
    if (isBlueTrapped()) { 
        isBlueTrappedState = true;
        
        // === 關鍵重置點：確保邊界計數從 0 開始 ===
        hasTouchedBoundaries = { 
            top: false, 
            bottom: false, 
            left: false, 
            right: false 
        };
        mapContainer.classList.remove(
            'border-top-touched', 
            'border-bottom-touched', 
            'border-left-touched', 
            'border-right-touched'
        );
        // ======================================
        
        handleWin();
        
        // **啟動倒數計時器**
        startCountdown(); 
        
        return;
    }

    const safeMoves = calculateSafeMove();

    if (safeMoves.length === 0) {
        if (isBlueTrapped()) {
            isBlueTrappedState = true;
            
            // === 關鍵重置點：確保邊界計數從 0 開始 ===
            hasTouchedBoundaries = { 
                top: false, 
                bottom: false, 
                left: false, 
                right: false 
            };
            mapContainer.classList.remove(
                'border-top-touched', 
                'border-bottom-touched', 
                'border-left-touched', 
                'border-right-touched'
            );
            // ======================================
            
            handleWin();
            
            // **啟動倒數計時器**
            startCountdown(); 
        }
        return; 
    }

    const randomSafeIndex = Math.floor(Math.random() * safeMoves.length);
    const newBlueIndex = safeMoves[randomSafeIndex];
    
    const newBlueCellElement = cellsArray[newBlueIndex];

    blueCellElement.classList.remove('blue');
    newBlueCellElement.classList.add('blue');
    
    blueCellIndex = newBlueIndex;
    blueCellElement = newBlueCellElement;
}


/**
 * 處理難度選擇
 */
function getDifficulty() {
    const difficultyInput = prompt(
        "====== 遊戲目標 ======\n" +
        "操作紅格 (WASD 移動)，並按空白鍵 (Spacebar) 在紅格的『上一個位置』留下黑牆。\n" +
        "當藍格 (Blue Cell) 被黑牆或邊界完全封鎖，無法移動時，即達成困住條件。\n" +
        "**新勝利條件：困住藍格後，紅格必須在 10 秒內碰到所有四個邊界 (上、下、左、右) 才能獲勝！**\n" +
        "===================\n\n" +
        "請輸入難度等級 (1, 2, 3 或 4):\n" +
        "1: 最簡單 (1000ms)\n" +
        "2: 普通 (500ms)\n" +
        "3: 困難 (100ms)\n" +
        "4: 超難 (10ms)" 
    );

    const difficultyLevel = parseInt(difficultyInput);
    blueMoveDelay = 1000; 

    if (difficultyLevel === 1) {
        blueMoveDelay = 1000;
        alert("已選擇難度 1 (1000ms)。");
    } else if (difficultyLevel === 2) {
        blueMoveDelay = 500;
        alert("已選擇難度 2 (500ms)。");
    } else if (difficultyLevel === 3) {
        blueMoveDelay = 100;
        alert("已選擇難度 3 (100ms)。");
    } else if (difficultyLevel === 4) {
        blueMoveDelay = 10;
        alert("已選擇難度 4 (10ms) - 祝你好運！");
    } 
    else {
        alert("輸入無效或未選擇，已設定為預設難度 1 (1000ms)。");
    }
}


// ***** 執行與監聽 *****
getDifficulty();
createGrid();

// 刪除了滾輪監聽器
window.addEventListener('keydown', handleMovement);
window.addEventListener('keydown', handleSpacebar); 

blueMoveIntervalId = setInterval(autoMoveBlueCell, blueMoveDelay);
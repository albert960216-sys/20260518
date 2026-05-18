let capture;
let hands;
let camera;
let detections = {};
let playerGesture = "...";
let computerGesture = "";
let gameState = "IDLE"; // IDLE, COUNTDOWN, RESULT
let timer = 0;
let countdown = 3;
let resultText = "";
let playerWins = 0;
let computerWins = 0;

const choices = ["Rock", "Paper", "Scissors"];

function setup() {
  // 使用全螢幕畫布
  createCanvas(windowWidth, windowHeight);

  // 遊戲重設為初始狀態
  gameState = "IDLE";

  // 初始化攝影機
  capture = createCapture(VIDEO);
  capture.size(640, 480);
  capture.hide();

  // 初始化 MediaPipe Hands
  hands = new Hands({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5
  });

  hands.onResults(onResults);

  // 啟動 MediaPipe 相機循環
  camera = new Camera(capture.elt, {
    onFrame: async () => {
      await hands.send({ image: capture.elt });
    },
    width: 640,
    height: 480
  });
  camera.start();
}

function onResults(results) {
  detections = results;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(0);

  // 計算顯示影像的大小 (50% 的螢幕寬高)
  let displayW = width * 0.5;
  let displayH = height * 0.5;
  let offsetX = (width - displayW) / 2;
  let offsetY = (height - displayH) / 2;

  // 1. 繪製攝影機畫面 (鏡像處理)
  push();
  translate(width, 0);
  scale(-1, 1);
  
  // 在畫布中心繪製 50% 大小的影像
  image(capture, offsetX, offsetY, displayW, displayH);
  
  // 2. 繪製手部關鍵點並偵測手勢
  if (detections.multiHandLandmarks && detections.multiHandLandmarks.length > 0) {
    const landmarks = detections.multiHandLandmarks[0];
    
    // 將座標轉換為相對 50% 影像的位置
    drawHand(landmarks, offsetX, offsetY, displayW, displayH);
    
    // 偵測目前手勢
    playerGesture = detectGesture(landmarks);
  } else {
    playerGesture = "...";
  }
  pop();

  // 3. 繪製遊戲 UI
  drawUI();

  // 4. 手勢控制遊戲流程
  handleGestureControl();
}

function handleGestureControl() {
  if (playerGesture === "Continue") {
    if (gameState === "IDLE") {
      startGame();
    } else if (gameState === "RESULT") {
      gameState = "IDLE";
    }
  } else if (playerGesture === "Exit") {
    gameState = "IDLE";
  }
}

function keyPressed() {
  // 按下空白鍵開始遊戲
  if (key === ' ' && gameState === "IDLE") {
    gameState = "COUNTDOWN";
    countdown = 3;
    timer = millis();
  } else if (key === ' ' && gameState === "RESULT") {
    gameState = "IDLE";
  }
}

function startGame() {
  gameState = "COUNTDOWN";
  countdown = 3;
  timer = millis();
}

function drawUI() {
  textAlign(CENTER, CENTER);
  textStyle(BOLD);

  if (gameState === "IDLE") {
    fill(0, 0, 0, 150);
    rect(width/2 - 150, height/2 - 40, 300, 80, 10);
    fill(255);
    textSize(24);
    text("伸出 大拇指：開始遊戲", width/2, height/2 - 20);
    textSize(18);
    text("按下 空白鍵 開始", width/2, height/2);
  } 
  else if (gameState === "COUNTDOWN") {
    let elapsed = millis() - timer;
    if (elapsed < 1000) countdown = 3;
    else if (elapsed < 2000) countdown = 2;
    else if (elapsed < 3000) countdown = 1;
    else {
      computerGesture = random(choices);
      determineWinner();
      gameState = "RESULT";
    }
    fill(255, 255, 0);
    textSize(120);
    text(countdown, width/2, height/2);
  } 
  else if (gameState === "RESULT") {
    fill(0, 0, 0, 180);
    rect(width/2 - 200, height/2 - 120, 400, 240, 20);
    fill(255);
    textSize(20);
    text("你出: " + playerGesture, width/2, height/2 - 70);
    text("電腦出: " + computerGesture, width/2, height/2 - 40);
    textSize(48);
    text(resultText, width/2, height/2 + 20);
    textSize(24);
    fill(255, 200, 0);
    text(`戰績: 玩家 ${playerWins} - 電腦 ${computerWins}`, width/2, height/2 + 60);
    textSize(20);
    fill(0, 255, 0);
    text("伸出 大拇指 繼續 / 小指 結束", width/2, height/2 + 95);
  }
}

function determineWinner() {
  if (playerGesture === "...") {
    resultText = "沒偵測到手！";
  } else if (playerGesture === computerGesture) {
    resultText = "平手！";
  } else if (
    (playerGesture === "Rock" && computerGesture === "Scissors") ||
    (playerGesture === "Paper" && computerGesture === "Rock") ||
    (playerGesture === "Scissors" && computerGesture === "Paper")
  ) {
    resultText = "你贏了！";
    playerWins++;
  } else {
    resultText = "你輸了！";
    computerWins++;
  }
}

function drawHand(lm, ox, oy, dw, dh) {
  fill(0, 255, 0);
  noStroke();
  for (let i = 0; i < lm.length; i++) {
    circle(lm[i].x * dw + ox, lm[i].y * dh + oy, 8);
  }
}

function detectGesture(lm) {
  // 根據手指關節的 Y 座標判定手指是否伸直 (Y 值越小代表越上面)
  const thumbUp = lm[4].y < lm[3].y;
  const indexUp = lm[8].y < lm[6].y;
  const middleUp = lm[12].y < lm[10].y;
  const ringUp = lm[16].y < lm[14].y;
  const pinkyUp = lm[20].y < lm[18].y;

  if (indexUp && middleUp && ringUp && pinkyUp) return "Paper";
  if (indexUp && middleUp && !ringUp && !pinkyUp) return "Scissors";
  if (!thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) return "Rock";

  // 新增控制手勢
  if (thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) return "Continue"; // 只有大拇指
  if (!indexUp && !middleUp && !ringUp && pinkyUp) return "Exit"; // 只有小指

  return "...";
}

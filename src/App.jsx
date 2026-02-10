import React, { useEffect, useRef, useState } from 'react';


const DinoVolleyRetro = () => {
  const canvasRef = useRef(null);
  const requestRef = useRef();

const [introStep, setIntroStep] = useState(0); // 0: 판도, 1: 형
const [endingStep, setEndingStep] = useState(0); // 0: 청혼, 1: 당황(...?), 2: 선택지

  
  // 이미지 객체
  const images = useRef({
    p1: new Image(),
    p2: new Image()
  });

  // 게임 설정
  const GRAVITY = 0.25; 
  const JUMP_FORCE = 10;
  const MOVE_SPEED = 5;
  const FLOOR_Y = 450;

  // React 상태
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  
  // [변경 1] 초기 상태를 'loading'으로 변경 (인트로 진입을 위해)
  const [gameState, setGameState] = useState('loading'); 
  const [message, setMessage] = useState("LOADING...");
  const [imagesLoaded, setImagesLoaded] = useState(false);
  
  const [hasSeenEnding, setHasSeenEnding] = useState(false);

  // 게임 가변 데이터
  const gameData = useRef({
    frames: 0,
    keys: { w: false, a: false, s: false, d: false, space: false },
        score: { p1: 0, p2: 0 }, 

	
	p1: { x: 50, y: 300, w: 140, h: 110, dx: 0, dy: 0, isGrounded: false, facingRight: true, isAI: false },
    p2: { x: 600, y: 300, w: 110, h: 110, dx: 0, dy: 0, isGrounded: false, facingRight: false, isAI: true },
    ball: { x: 200, y: 80, r: 20, dx: 0, dy: 0, rotation: 0, isSpike: false }
  });

  // --- 초기화 및 이미지 로딩 ---
  useEffect(() => {
    const imgP1 = images.current.p1;
    const imgP2 = images.current.p2;

    imgP1.src = '/dino-blue.png'; 
    imgP2.src = '/dino-pink.png';

    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount === 2) {
        setImagesLoaded(true);
        // [변경 2] 로딩 완료 시 바로 Ready가 아니라 'intro' 상태로 진입
        setGameState('intro');
      }
    };

    imgP1.onload = checkLoaded;
    imgP2.onload = checkLoaded;
  }, []);

  // --- 그리기 헬퍼 ---
  const drawImagePlayer = (ctx, img, player, frame) => {
    if (!img.complete) return;
    ctx.save();
    ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
    ctx.scale(player.facingRight ? 1 : -1, 1);

    const isMoving = Math.abs(player.dx) > 0.1;
    const bounceY = isMoving ? Math.sin(frame * 0.2) * 3 : 0;
    const rotate = isMoving ? Math.sin(frame * 0.15) * 0.05 : 0;

    ctx.rotate(rotate);
    ctx.drawImage(img, -player.w / 2, -player.h / 2 + bounceY, player.w, player.h);
    ctx.restore();
  };

  // --- 물리 엔진 및 로직 ---
  const resetBall = (toPlayer2) => {
    const { ball, p1, p2 } = gameData.current;
    ball.x = toPlayer2 ? p2.x : p1.x;
    ball.y = 80; 
    ball.dx = 0; ball.dy = 0; ball.isSpike = false;
  };

  const updatePhysics = () => {
    const { p1, p2, ball, keys } = gameData.current;
    // P1 이동
    if (keys.a) { p1.dx = -MOVE_SPEED; p1.facingRight = false; }
    else if (keys.d) { p1.dx = MOVE_SPEED; p1.facingRight = true; }
    else p1.dx = 0;
    if (keys.w && p1.isGrounded) { p1.dy = -JUMP_FORCE; p1.isGrounded = false; }

    // AI
    const centerX = p2.x + p2.w / 2;
    let targetX = 650;
    if (ball.x > 350) {
      targetX = ball.x;
      if (ball.x > p2.x + p2.w) targetX = ball.x + 10;
    }
    if (centerX < targetX - 10) { p2.dx = MOVE_SPEED * 0.8; p2.facingRight = true; }
    else if (centerX > targetX + 10) { p2.dx = -MOVE_SPEED * 0.8; p2.facingRight = false; }
    else p2.dx = 0;
    if (p2.isGrounded && ball.x > 400 && Math.abs(ball.x - centerX) < 60 && ball.y < p2.y - 60 && ball.dy > 0) {
      p2.dy = -JUMP_FORCE; p2.isGrounded = false;
    }

    // 물리 적용
    [p1, p2].forEach(p => {
      p.dy += GRAVITY; p.y += p.dy; p.x += p.dx;
      if (p.y + p.h > FLOOR_Y) { p.y = FLOOR_Y - p.h; p.dy = 0; p.isGrounded = true; }
      if (p.x < 0) p.x = 0; if (p.x + p.w > 800) p.x = 800 - p.w;
      // 네트
      if (p.x + p.w > 395 && p.x < 405 && p.y + p.h > 320) {
         if(p.x < 400) p.x = 395 - p.w; else p.x = 405;
      }
    });

    // 공
    ball.dy += GRAVITY * 0.8;
    ball.dx *= 0.99; ball.dy *= 0.99;
    ball.x += ball.dx; ball.y += ball.dy;
    ball.rotation += ball.dx * 0.1;

    if (ball.x - ball.r < 0) { ball.x = ball.r; ball.dx *= -0.8; }
    if (ball.x + ball.r > 800) { ball.x = 800 - ball.r; ball.dx *= -0.8; }
    if (ball.y - ball.r < 0) { ball.y = ball.r; ball.dy *= -0.8; }
    if (ball.y + ball.r > 320) {
      if (ball.y + ball.r < 340 && ball.x > 375 && ball.x < 425) { ball.y = 320 - ball.r; ball.dy *= -0.8; } 
      else if (ball.x + ball.r > 395 && ball.x - ball.r < 405) {
         if (ball.x < 400) { ball.x = 395 - ball.r; ball.dx *= -0.8; } else { ball.x = 405 + ball.r; ball.dx *= -0.8; }
      }
    }

    [p1, p2].forEach(p => {
       if (ball.x + ball.r > p.x && ball.x - ball.r < p.x + p.w && ball.y + ball.r > p.y && ball.y - ball.r < p.y + p.h) {
           const diffX = ball.x - (p.x + p.w / 2);
           ball.dy = -10; 
           ball.dx = diffX * 0.12 + p.dx * 0.5;
           const isSmash = (!p.isAI && keys.s);
           if (isSmash && !p.isGrounded && ball.y < p.y) { ball.dy = 8; ball.dx *= 1.3; ball.isSpike = true; } 
           else { ball.isSpike = false; }
           ball.y = p.y - ball.r - 2;
       }
    });

    if (ball.y + ball.r > FLOOR_Y) {
      if (ball.x < 400) handleScore(2); else handleScore(1);
    }
  };

  const handleScore = (scorer) => {
    setGameState('scored');
	
	if (hasSeenEnding) {
        // 메시지만 띄우고 점수(gameData.score)는 건드리지 않음 -> 영원히 0:0
        setMessage(scorer === 1 ? "..." : "..."); 
        return; 
    }
        const currentScore = gameData.current.score; 
    
    if (scorer === 1) currentScore.p1 += 1; 
    else currentScore.p2 += 1;
    
    // UI 업데이트 (화면 표시용)
    setScore({ ...currentScore }); 

    // 승리 조건 체크도 Ref 값으로 판단
    // 승리 조건 체크도 Ref 값으로 판단
    if (currentScore.p1 >= 10 || currentScore.p2 >= 10) {
      if (currentScore.p1 >= 10) {
          // [수정] 이미 엔딩을 봤다면(hasSeenEnding이 true면) 엔딩 진입 불가 -> 그냥 게임오버 처리
          if (hasSeenEnding) {
              setGameState('gameover');
              setMessage("GAME OVER"); // 혹은 "ALONE..." 처럼 바꿔도 됩니다.
          } else {
              setGameState('ending');
              setEndingStep(0);
          }
      } else {
          setGameState('gameover');
          setMessage("GAME OVER");
      }
    } else {
      setMessage(scorer === 1 ? "PANDO POINT!" : "HYUNG POINT!");
    }
  };

  // --- 렌더링 루프 ---
  const loop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { p1, p2, ball, frames } = gameData.current;

    ctx.imageSmoothingEnabled = false;

    if (gameState === 'playing' && imagesLoaded) {
      updatePhysics();
      gameData.current.frames++;
    }

    // 배경
    ctx.fillStyle = '#64b0ff'; ctx.fillRect(0, 0, 800, 500); 
    ctx.fillStyle = '#dcb159'; ctx.fillRect(0, FLOOR_Y, 800, 500 - FLOOR_Y);
    ctx.fillStyle = '#c0953a'; ctx.fillRect(0, FLOOR_Y, 800, 5);

    // 네트
    ctx.fillStyle = '#fff'; ctx.fillRect(395, 320, 10, 130);
    ctx.fillStyle = '#ddd'; for(let i=330; i<450; i+=10) ctx.fillRect(397, i, 6, 2);

    drawImagePlayer(ctx, images.current.p1, p1, frames);
    drawImagePlayer(ctx, images.current.p2, p2, frames);

    // 공
    ctx.save(); ctx.translate(ball.x, ball.y); ctx.rotate(ball.rotation);
    ctx.beginPath(); ctx.arc(0, 0, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = ball.isSpike ? '#ff3333' : 'white'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -ball.r); ctx.quadraticCurveTo(ball.r/2, 0, 0, ball.r); ctx.stroke();
    ctx.restore();

    requestRef.current = requestAnimationFrame(loop);
  };

const resetToTitle = () => {
     gameData.current.score = { p1: 0, p2: 0 };
     setScore({ p1: 0, p2: 0 }); 
     gameData.current.p1.x = 50; 
     gameData.current.p2.x = 600;
     resetBall(false); 
     setGameState('ready'); 
     setMessage("PRESS SPACE TO START");
     setEndingStep(0);
  };
  // --- 입력 처리 (키보드 및 터치) ---
  const handleSpace = (isDown) => {
	  
	     if (gameState === 'ending') {
        // 물리 엔진에 스페이스바 입력이 전달되지 않도록 강제로 끕니다.
        gameData.current.keys.space = false; 

        if (isDown) {
            // 스페이스바를 누르면 터치와 똑같이 다음 단계로 넘어갑니다.
            if (endingStep === 0) setEndingStep(1);
            else if (endingStep === 1) setEndingStep(2);
            else if (endingStep === 2) setEndingStep(3);
            else if (endingStep === 3) resetToTitle();
        }
        return; // 헤헤
    }

    gameData.current.keys.space = isDown;
    if (isDown && imagesLoaded) {
      // [변경 3] 인트로 상태일 때 스페이스를 누르면 게임 준비 상태(ready)로 전환
      if (gameState === 'intro') {
        if (introStep === 0) {
            setIntroStep(1); // 동생 대화 끝 -> 형 대화로
        } else {
            setGameState('ready'); // 형 대화 끝 -> 게임 준비
            setMessage("PRESS SPACE TO START");
        }
        return;
      }
	  
	   if (gameState === 'ending') {
         if (endingStep === 0) {
             setEndingStep(1); // "이제 이겼으니까..." -> "결혼해줄거지?"
         } else if (endingStep === 1) {
             setEndingStep(2); // "결혼해줄거지?" -> P2 "...?"
         } else if (endingStep === 2) {
             setEndingStep(3); // P2 "...?" -> 선택지(죽인다)
         }
         // step 3(선택지)에서는 화면 터치로 넘어가지 않음 (버튼 클릭 강제)
         return;
      }
      if (gameState === 'ready' || gameState === 'scored') {
        setGameState('playing'); setMessage("");
      } else if (gameState === 'gameover') {
        gameData.current.score = { p1: 0, p2: 0 };
        setScore({ p1: 0, p2: 0 }); 
		gameData.current.p1.x = 100; gameData.current.p2.x = 600;
        resetBall(false); setGameState('ready'); setMessage("PRESS SPACE TO START");
      }
    }
  };

  const handleMobileInput = (key, isDown) => {
    if (key === 'space') {
      handleSpace(isDown);
    } else {
      gameData.current.keys[key] = isDown;
    }
  };

  useEffect(() => {
    const handleKey = (e, isDown) => {
      const k = e.key.toLowerCase();
      if (gameData.current.keys.hasOwnProperty(k) || e.code === 'Space') {
        if (e.code === 'Space') { handleSpace(isDown); } 
        else { gameData.current.keys[k] = isDown; }
      }
    };
    window.addEventListener('keydown', e => handleKey(e, true));
    window.addEventListener('keyup', e => handleKey(e, false));
    requestRef.current = requestAnimationFrame(loop);
    return () => {
        window.removeEventListener('keydown', e => handleKey(e, true));
        window.removeEventListener('keyup', e => handleKey(e, false));
        cancelAnimationFrame(requestRef.current);
    }
  }, [gameState, imagesLoaded]);

  useEffect(() => {
    if(gameState === 'scored') {
        const winnerIsP1 = message.includes("P1");
        resetBall(winnerIsP1);
    }
  }, [gameState]);

  const btnStyle = {
    width: '60px', height: '60px', borderRadius: '50%', 
    backgroundColor: 'rgba(255, 255, 255, 0.3)', border: '2px solid rgba(255, 255, 255, 0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '24px', color: 'white', userSelect: 'none', touchAction: 'none'
  };

  return (
    <>
    <style>
        {`
            @import url('https://cdn.jsdelivr.net/npm/galmuri@latest/dist/galmuri.css');
            @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 1; } }
            .retro-text { font-family: 'Galmuri11', sans-serif; }
            .blink-text { animation: blink 1s infinite; }
            .scanlines {
                background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1));
                background-size: 100% 4px;
                position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                pointer-events: none; z-index: 10;
            }
            .control-btn:active { background-color: rgba(255, 255, 255, 0.6) !important; }
            body { overflow: hidden; }
        `}
    </style>

    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', backgroundColor: '#222', fontFamily: "'Galmuri11', sans-serif",
      touchAction: 'none'
    }}>
      <h1 className="retro-text" style={{ 
          color: '#00ffcc', textShadow: '4px 4px 0 #ff00ff', 
          fontSize: 'min(8vw, 48px)', margin: '0 0 10px 0', letterSpacing: '2px'
      }}>
        PQ BAE-GU ARCADE
      </h1>
      
      <div style={{ 
          position: 'relative', padding: 'min(20px, 2vw)',
          backgroundColor: '#333', border: '4px solid #555', borderRadius: '20px',
          boxShadow: '0 0 0 10px #222, 0 0 30px rgba(0,0,0,0.8)',
          width: '95%', maxWidth: '840px', boxSizing: 'border-box'
      }}>
          <div style={{ 
              position: 'relative', border: '4px solid #000', 
              width: '100%', aspectRatio: '800/500',
              overflow: 'hidden', backgroundColor: '#000'
          }}>
            <div className="scanlines"></div>
            
            <canvas ref={canvasRef} width={800} height={500} style={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }} />
            
            {/* 점수판 */}
            <div className="retro-text" style={{
              position: 'absolute', top: '5%', width: '100%', display: 'flex', justifyContent: 'space-between', 
              
              // [수정됨] 좌우 여백을 5% -> 15%로 늘려 점수를 중앙으로 당김 & boxSizing 추가
              padding: '0 15%', boxSizing: 'border-box',

              pointerEvents: 'none', color: '#fff', fontSize: 'min(6vw, 40px)', fontWeight: 'bold', textShadow: '4px 4px 0 #000', zIndex: 11
            }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center'}}>
                  <span style={{fontSize:'min(3vw, 20px)', color:'#00ffcc'}}>PANDO</span>{score.p1}
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center'}}>
                  <span style={{fontSize:'min(3vw, 20px)', color:'#ff00ff'}}>HYUNG</span>{score.p2}
              </div>
            </div>

            {/* [변경 4] 인트로 대화창 오버레이 추가 */}
           {/* [수정됨] 인트로 대화창 (Step 0: P1, Step 1: P2) */}
{gameState === 'intro' && (
    <div 
    onClick={() => handleSpace(true)}
    onTouchStart={(e) => { e.preventDefault(); handleSpace(true); }}
    style={{
        position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
        width: '90%', backgroundColor: '#000', border: '4px solid #fff', borderRadius: '8px',
        padding: '15px', zIndex: 30, cursor: 'pointer', boxShadow: '0 0 20px rgba(0,0,0,0.9)'
    }}
    >
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            
            {/* 초상화 영역 (Step에 따라 이미지가 바뀜) */}
            <div style={{ 
                width: '60px', height: '60px', 
                border: '2px solid #fff', 
                flexShrink: 0,
                backgroundColor: introStep === 0 ? '#64b0ff' : '#ffb6c1', // 배경색 (P1: 파랑, P2: 분홍)
                backgroundImage: introStep === 0 ? 'url(/dino-blue.png)' : 'url(/dino-pink.png)',
                
                // [요청사항 반영]
                // P1: 오른쪽 위 클로즈업 (97 10 내가 조정함)
                // P2: 위쪽 전체 (center top)
                backgroundPosition: introStep === 0 ? '97% 10%' : '35% 30%',
                backgroundSize: introStep === 0 ? '350%' : '200%', // P2는 덜 확대해서 전체적으로 보이게
                
                imageRendering: 'pixelated'
            }}></div>

            {/* 대화 텍스트 영역 */}
            <div>
                {/* 이름표 */}
                <p className="retro-text" style={{ 
                    color: introStep === 0 ? '#00ffcc' : '#ff00ff', // P1: 민트, P2: 핑크
                    margin: '0 0 5px 0', fontSize: '14px' 
                }}>
                    {introStep === 0 ? 'Pando' : 'Hyung'}
                </p>
                
                {/* 대사 */}
                <p className="retro-text" style={{ color: '#fff', margin: 0, fontSize: 'min(4vw, 18px)', lineHeight: '1.4' }}>
                    {introStep === 0 
                        ? "\"형이 배구 이기면 맛있는거 해준댔어!\"" 
                        : "\"내가 언제!\""
                    }
                </p>

                <p className="blink-text retro-text" style={{ color: '#aaa', margin: '10px 0 0 0', fontSize: '12px' }}>
                    ▶ TOUCH TO CONTINUE
                </p>
            </div>
        </div>
    </div>
)}


{/* ▼▼▼ 엔딩 대화창 추가 ▼▼▼ */}
{gameState === 'ending' && (
    <div 
    // Step 3(선택지)이 아닐 때만 배경 클릭으로 다음 대화 진행
    onClick={() => { if(endingStep < 3) handleSpace(true); }}
    onTouchStart={(e) => { if(endingStep < 3) { e.preventDefault(); handleSpace(true); } }}
    style={{
        position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
        width: '90%', backgroundColor: '#000', border: '4px solid #fff', borderRadius: '8px',
        padding: '15px', zIndex: 30, 
        cursor: endingStep < 3 ? 'pointer' : 'default', // 커서 모양 변경
        boxShadow: '0 0 20px rgba(0,0,0,0.9)'
    }}
    >
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            
            {/* 초상화 설정 */}
            <div style={{ 
                width: '60px', height: '60px', 
                border: '2px solid #fff', flexShrink: 0,
                // Step 0, 1은 P1(파랑), Step 2, 3은 P2(분홍)
                backgroundColor: endingStep <= 1 ? '#64b0ff' : '#ffb6c1',
                backgroundImage: endingStep <= 1 ? 'url(/dino-blue.png)' : 'url(/dino-pink.png)',
                
                // P1: 오른쪽 위(97% 10%), P2: 중앙 상단(35% 30%)
                backgroundPosition: endingStep <= 1 ? '97% 10%' : '35% 30%',
                backgroundSize: endingStep <= 1 ? '350%' : '200%',
                imageRendering: 'pixelated'
            }}></div>

            <div style={{ width: '100%' }}>
                {/* 이름표 */}
                <p className="retro-text" style={{ 
                    color: endingStep <= 1 ? '#00ffcc' : '#ff00ff', 
                    margin: '0 0 5px 0', fontSize: '14px' 
                }}>
                    {endingStep <= 1 ? 'PANDO (Winner)' : 'HYUNG'}
                </p>

                {/* 대사 내용 (단계별 분리) */}
                {endingStep === 0 && (
                    <p className="retro-text" style={{ color: '#fff', margin: 0, fontSize: 'min(4vw, 18px)', lineHeight: '1.4' }}>
                        "이제 이겼으니까..."
                    </p>
                )}
                {endingStep === 1 && (
                    <p className="retro-text" style={{ color: '#fff', margin: 0, fontSize: 'min(4vw, 18px)', lineHeight: '1.4' }}>
                        "나랑 결혼해줄거지?"
                    </p>
                )}
                {endingStep === 2 && (
                    <p className="retro-text" style={{ color: '#fff', margin: 0, fontSize: 'min(4vw, 18px)', lineHeight: '1.4' }}>
                        "...?"
                    </p>
                )}

                {/* Step 3: 선택지 */}
                {endingStep === 3 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '5px' }}>
                        <button className="retro-text" 
                            // [수정] 클릭 시 hasSeenEnding을 true로 만듦
                            onClick={() => { setHasSeenEnding(true); resetToTitle(); }} 
                            onTouchEnd={(e) => { e.preventDefault(); setHasSeenEnding(true); resetToTitle(); }}
                            style={{ background: 'transparent', border: 'none', color: '#ff3333', textAlign: 'left', fontSize: 'min(4vw, 18px)', cursor: 'pointer' }}>
                            {'>'} 죽인다
                        </button>
                        <button className="retro-text" 
                             // [수정] 동일하게 적용
                            onClick={() => { setHasSeenEnding(true); resetToTitle(); }} 
                            onTouchEnd={(e) => { e.preventDefault(); setHasSeenEnding(true); resetToTitle(); }}
                            style={{ background: 'transparent', border: 'none', color: '#ff3333', textAlign: 'left', fontSize: 'min(4vw, 18px)', cursor: 'pointer' }}>
                            {'>'} 죽인다
                        </button>
                    </div>
                )}

                {/* 계속하기 안내 (Step 3이 아닐 때만 표시) */}
                {endingStep < 3 && (
                    <p className="blink-text retro-text" style={{ color: '#aaa', margin: '10px 0 0 0', fontSize: '12px' }}>
                        ▶ TOUCH TO CONTINUE
                    </p>
                )}
            </div>
        </div>
    </div>
)}


            {/* 기존 메시지 박스 (Ready / Gameover / Loading) */}
            {gameState !== 'playing' && gameState !== 'intro' && (
              <div 
                onClick={() => handleSpace(true)}
                onTouchStart={(e) => { e.preventDefault(); handleSpace(true); }}
                style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  backgroundColor: '#000', padding: 'min(20px, 4vw) min(40px, 8vw)', 
                  border: '4px solid #fff', textAlign: 'center', color: '#fff', 
                  zIndex: 20, boxShadow: '8px 8px 0 rgba(0,0,0,0.5)',
                  cursor: 'pointer', width: 'max-content'
              }}>
                <h2 className="retro-text" style={{ fontSize: 'min(6vw, 32px)', margin: '0 0 15px 0', color: '#ffcc00' }}>{message}</h2>
                {(gameState === 'ready' || gameState === 'gameover') && (
                    <div className="retro-text blink-text" style={{ fontSize: 'min(3.5vw, 18px)', color: '#aaa' }}>- TAP TO START -</div>
                )}
              </div>
            )}

            {/* 모바일 컨트롤러 */}
            <div style={{
                position: 'absolute', bottom: '10px', left: '0', width: '100%', height: '100px',
                display: 'flex', justifyContent: 'space-between', padding: '0 20px', boxSizing: 'border-box',
                zIndex: 15
            }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                    <div className="control-btn" style={btnStyle}
                         onTouchStart={(e)=>{e.preventDefault(); handleMobileInput('a', true)}}
                         onTouchEnd={(e)=>{e.preventDefault(); handleMobileInput('a', false)}}
                    >◀</div>
                    <div className="control-btn" style={btnStyle}
                         onTouchStart={(e)=>{e.preventDefault(); handleMobileInput('d', true)}}
                         onTouchEnd={(e)=>{e.preventDefault(); handleMobileInput('d', false)}}
                    >▶</div>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                    <div className="control-btn" style={{...btnStyle, backgroundColor: 'rgba(255, 50, 50, 0.4)'}}
                         onTouchStart={(e)=>{e.preventDefault(); handleMobileInput('s', true)}}
                         onTouchEnd={(e)=>{e.preventDefault(); handleMobileInput('s', false)}}
                    >S</div>
                    <div className="control-btn" style={{...btnStyle, backgroundColor: 'rgba(50, 255, 50, 0.4)'}}
                         onTouchStart={(e)=>{e.preventDefault(); handleMobileInput('w', true)}}
                         onTouchEnd={(e)=>{e.preventDefault(); handleMobileInput('w', false)}}
                    >J</div>
                </div>
            </div>
          </div>
      </div>
      <div className="retro-text" style={{ marginTop: '20px', color: '#ccc', textAlign: 'center', fontSize: 'min(3.5vw, 16px)', lineHeight: '1.6' }}>
        <p style={{marginBottom: '5px'}}>🕹️ <span style={{color:'#00ffcc'}}>CONTROLS</span></p>
        <p>[◀/▶] MOVE &nbsp; [J] JUMP &nbsp; [S] SMASH</p>
      </div>
    </div>
    </>
  );
};

export default DinoVolleyRetro;
// 상태 변수
let currentQuestions = [];
let currentIndex = 0;
let score = 0;
let isIncorrectNoteMode = false;

// DOM 요소들
const screens = document.querySelectorAll('.screen');
const progressText = document.getElementById('progressText');
const progressBar = document.getElementById('progressBar');
const qSubject = document.getElementById('qSubject');
const qText = document.getElementById('qText');
const answerInput = document.getElementById('answerInput');
const submitBtn = document.getElementById('submitBtn');
const nextBtn = document.getElementById('nextBtn');
const feedbackBox = document.getElementById('feedbackBox');
const resultBadge = document.getElementById('resultBadge');
const realAnswerText = document.getElementById('realAnswerText');
const sourceTextP = document.getElementById('sourceTextP');
const finalScore = document.getElementById('finalScore');

// 유틸: 띄어쓰기 및 맞춤법(기본 공백) 보정 함수
function normalizeString(str) {
    if (!str) return '';
    return str.replace(/\s+/g, '').toLowerCase();
}

// 유틸: 배열 무작위 섞기
function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

// 화면 전환
function switchScreen(screenId) {
    screens.forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// 홈으로
function goHome() {
    switchScreen('homeScreen');
}

// 1. 데일리 퀘스트 시작 로직 (20문제 추출)
function startDailyQuest() {
    if (typeof quizDB === 'undefined' || quizDB.length === 0) {
        alert("문제 데이터가 없습니다! db.js 파일이 비어있는지 확인해주세요.\n(메인 화면 하단 데이터 추출기 버튼을 이용하세요)");
        return;
    }

    isIncorrectNoteMode = false;
    let pool = [...quizDB];
    shuffle(pool);
    // 최대 20문제 (DB가 20개보다 적으면 있는 만큼만)
    currentQuestions = pool.slice(0, 20);
    currentIndex = 0;
    score = 0;
    
    switchScreen('quizScreen');
    renderQuestion();
}

// 오답 노트 모드 시작
function openIncorrectNotes() {
    const saved = JSON.parse(localStorage.getItem('incorrectNotes') || '[]');
    if (saved.length === 0) {
        alert("저장된 오답이 없습니다. 훌륭합니다!");
        return;
    }

    // DB에서 해당 id를 찾아옴
    if (typeof quizDB === 'undefined' || quizDB.length === 0) {
        alert("문제 데이터 접근 에러!"); return;
    }
    
    isIncorrectNoteMode = true;
    currentQuestions = quizDB.filter(q => saved.includes(q.id));
    shuffle(currentQuestions);
    currentIndex = 0;
    score = 0;

    switchScreen('quizScreen');
    renderQuestion();
}

// 문제 렌더링
function renderQuestion() {
    if (currentIndex >= currentQuestions.length) {
        finishQuiz();
        return;
    }

    const q = currentQuestions[currentIndex];
    const total = currentQuestions.length;
    
    // UI 초기화
    feedbackBox.style.display = 'none';
    answerInput.value = '';
    answerInput.disabled = false;
    submitBtn.style.display = 'block';
    nextBtn.style.display = 'none';
    answerInput.focus();

    // 상태 업데이트
    progressText.innerText = isIncorrectNoteMode 
        ? `오답노트 복습 ${currentIndex + 1}/${total}`
        : `오늘의 문제 ${currentIndex + 1}/${total}`;
        
    progressBar.style.width = \`\${((currentIndex) / total) * 100}%\`;

    qSubject.innerText = q.subject;
    // HTML 태그(br) 등이 포함되어 있을 수 있으므로 innerHTML 사용
    qText.innerHTML = q.questionText; 
}

// 엔터 키 동작
function handleKeyPress(e) {
    if (e.key === 'Enter') {
        if (submitBtn.style.display !== 'none') {
            checkAnswer();
        } else if (nextBtn.style.display !== 'none') {
            nextQuestion();
        }
    }
}

// 채점 로직
function checkAnswer() {
    const q = currentQuestions[currentIndex];
    const userAnswer = normalizeString(answerInput.value);
    
    if (userAnswer === '') {
        alert("정답을 입력해주세요.");
        return;
    }

    let isCorrect = false;

    // 키워드 중 하나라도 포함/일치 시 정답 인정
    for (let ans of q.shortAnswer) {
        const correctNorm = normalizeString(ans);
        // 포함(includes)으로 할지 완전일치로 할지: '포함되어야 정답처리'라는 사용자 요구사항 반영
        if (userAnswer.includes(correctNorm)) {
            isCorrect = true;
            break;
        }
    }

    // 결과 표시 UI
    feedbackBox.style.display = 'block';
    answerInput.disabled = true;
    submitBtn.style.display = 'none';
    nextBtn.style.display = 'block';
    
    realAnswerText.innerText = q.descriptiveAnswer ? q.descriptiveAnswer : q.shortAnswer.join(' 또는 ');
    sourceTextP.innerText = q.sourceText || "근거 문구 없음";

    if (isCorrect) {
        resultBadge.innerText = '정답!';
        resultBadge.className = 'result-badge correct';
        score++;
        
        // 오답노트 모드에서 정답을 맞추면 로컬스토리지에서 삭제
        if (isIncorrectNoteMode) {
            removeFromIncorrectNotes(q.id);
        }
    } else {
        resultBadge.innerText = '오답';
        resultBadge.className = 'result-badge incorrect';
        
        // 데일리 퀘스트나 오답노트에서 틀렸을 때 로컬스토리지에 저장
        saveToIncorrectNotes(q.id);
    }
    
    // 포커스를 다음 버튼으로
    setTimeout(() => nextBtn.focus(), 50);
}

// 다음 문제로
function nextQuestion() {
    currentIndex++;
    renderQuestion();
}

// 종료 처리
function finishQuiz() {
    progressBar.style.width = '100%';
    setTimeout(() => {
        switchScreen('resultScreen');
        finalScore.innerText = score;
    }, 300);
}

// 오답 노트 저장 함수
function saveToIncorrectNotes(id) {
    let saved = JSON.parse(localStorage.getItem('incorrectNotes') || '[]');
    if (!saved.includes(id)) {
        saved.push(id);
        localStorage.setItem('incorrectNotes', JSON.stringify(saved));
    }
}

// 오답 노트 삭제 함수
function removeFromIncorrectNotes(id) {
    let saved = JSON.parse(localStorage.getItem('incorrectNotes') || '[]');
    saved = saved.filter(savedId => savedId !== id);
    localStorage.setItem('incorrectNotes', JSON.stringify(saved));
}

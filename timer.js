const params = new URLSearchParams(window.location.search);
const targetUrl = params.get('target');
const siteName = params.get('site');
const tier = params.get('tier');
const timerMinutes = parseInt(params.get('timerMinutes')) || 10;
const waitMinutes = parseInt(params.get('waitMinutes')) || 30;

const FRICTION_PHRASES = [
  "I am choosing distraction over presence",
  "I am aware this is an impulse",
  "This moment will pass without Twitter",
  "I choose how I spend my attention"
];

const MINDFUL_PROMPTS = [
  "Notice the urge to check. Where do you feel it in your body?",
  "You don't have to do anything right now.",
  "Take a breath. Feel your feet on the floor.",
  "What were you working on before this impulse arose?",
  "Notice any restlessness. It's just energy—it will pass.",
  "You are not your urges. You can watch them without acting.",
  "What would staying focused feel like right now?",
  "This craving is temporary. You are not.",
  "Close your eyes. What do you actually need right now?",
  "The video will still exist in 10 minutes. What's the rush?",
  "Rest your attention on your breath. Just for now.",
  "What is it you're hoping to feel by checking?",
  "Boredom is not an emergency.",
  "You've resisted urges before. You can do it again.",
  "Notice the pull. Now notice you're the one noticing."
];

const FRICTION_PROMPTS = [
  "Why do you want to check Twitter right now?",
  "What are you avoiding?",
  "Is this how you want to spend your attention?",
  "What feeling are you chasing?",
  "Will this make your day better?",
  "What's the cost of this distraction?"
];

let currentPhase = 'friction';
let meditationSeconds = timerMinutes * 60;
let waitSeconds = waitMinutes * 60;
let promptIndex = 0;

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function showPhase(phase) {
  document.querySelectorAll('[id$="-phase"], [id$="-container"]').forEach(el => el.classList.add('hidden'));
  
  if (phase === 'friction') {
    document.getElementById('friction-phase').classList.remove('hidden');
    const phrase = FRICTION_PHRASES[Math.floor(Math.random() * FRICTION_PHRASES.length)];
    document.getElementById('friction-target').textContent = phrase;
    document.getElementById('friction-input').focus();
  } else if (phase === 'wait') {
    document.getElementById('wait-phase').classList.remove('hidden');
    document.getElementById('wait-time').textContent = `${waitMinutes} minutes`;
    startWaitTimer();
  } else if (phase === 'meditation') {
    document.getElementById('meditation-phase').classList.remove('hidden');
    document.getElementById('site-name').textContent = `Waiting to access ${siteName}`;
    if (tier === 'mindful') {
      document.getElementById('meditation-label').textContent = 'Breathe';
      document.getElementById('nuclear-container').classList.remove('hidden');
      updateNuclearButton();
    } else {
      document.getElementById('meditation-label').textContent = 'Step 3 of 3';
    }
    startMeditationTimer();
  } else if (phase === 'reflection') {
    document.getElementById('reflection-phase').classList.remove('hidden');
    const prompt = FRICTION_PROMPTS[Math.floor(Math.random() * FRICTION_PROMPTS.length)];
    document.getElementById('reflection-prompt').textContent = prompt;
  } else if (phase === 'proceed') {
    document.getElementById('proceed-container').classList.remove('hidden');
  }
}

function startWaitTimer() {
  const waitKey = `wait_${siteName}_${targetUrl}`;
  const stored = localStorage.getItem(waitKey);
  
  if (stored) {
    const elapsed = Math.floor((Date.now() - parseInt(stored)) / 1000);
    waitSeconds = Math.max(0, waitMinutes * 60 - elapsed);
  } else {
    localStorage.setItem(waitKey, Date.now().toString());
  }
  
  updateWaitDisplay();
  
  const interval = setInterval(() => {
    waitSeconds--;
    updateWaitDisplay();
    
    if (waitSeconds <= 0) {
      clearInterval(interval);
      localStorage.removeItem(waitKey);
      showPhase('meditation');
    }
  }, 1000);
}

function updateWaitDisplay() {
  document.getElementById('wait-timer').textContent = formatTime(waitSeconds);
}

function startMeditationTimer() {
  updateMeditationDisplay();
  rotatePrompt();
  
  const promptInterval = setInterval(() => {
    if (meditationSeconds <= 0) {
      clearInterval(promptInterval);
      return;
    }
    rotatePrompt();
  }, 45000);
  
  const timerInterval = setInterval(() => {
    meditationSeconds--;
    updateMeditationDisplay();
    
    if (meditationSeconds <= 0) {
      clearInterval(timerInterval);
      clearInterval(promptInterval);
      if (tier === 'friction') {
        showPhase('reflection');
      } else {
        showPhase('proceed');
      }
    }
  }, 1000);
}

function updateMeditationDisplay() {
  document.getElementById('meditation-timer').textContent = formatTime(meditationSeconds);
}

function rotatePrompt() {
  const prompts = tier === 'friction' ? 
    [...MINDFUL_PROMPTS, ...FRICTION_PROMPTS] : 
    MINDFUL_PROMPTS;
  document.getElementById('meditation-prompt').textContent = prompts[promptIndex % prompts.length];
  promptIndex++;
}

function updateNuclearButton() {
  chrome.runtime.sendMessage({ type: 'getNuclearSkips', site: siteName }, (response) => {
    const btn = document.getElementById('nuclear-btn');
    if (response.remaining > 0) {
      btn.textContent = `Skip this once (${response.remaining} remaining today)`;
      btn.disabled = false;
    } else {
      btn.textContent = 'No skips remaining today';
      btn.disabled = true;
    }
  });
}

function unlockAndProceed() {
  chrome.runtime.sendMessage({ type: 'unlockSite', site: siteName }, () => {
    window.location.href = targetUrl;
  });
}

document.getElementById('friction-input').addEventListener('input', (e) => {
  const target = document.getElementById('friction-target').textContent;
  if (e.target.value === target) {
    showPhase('wait');
  }
});

document.getElementById('proceed-btn').addEventListener('click', unlockAndProceed);
document.getElementById('reflection-continue').addEventListener('click', unlockAndProceed);

document.getElementById('nuclear-btn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'useNuclearSkip', site: siteName }, (response) => {
    if (response.success) {
      unlockAndProceed();
    } else {
      updateNuclearButton();
    }
  });
});

if (tier === 'friction') {
  showPhase('friction');
} else {
  showPhase('meditation');
}
import {
  getResourceSummary,
  getYouTubeEmbedUrl
} from './lib/circuitmentor_resource_library_expanded.js';
import {
  PATHS,
  buildPartsList,
  generateRoadmap,
  inferSkillLevel,
  projectFlavor
} from './roadmaps.js';

const LEARNING_OPTIONS = [
  'Videos', 'Written guides', 'Official documentation', 'Hands-on projects', 'Simulators',
  'Diagrams', 'Quizzes', 'Step-by-step instructions', 'Chatbot help', 'Mixed'
];
const PART_OPTIONS = [
  'Arduino', 'ESP32', 'Raspberry Pi Pico W', 'Raspberry Pi 4/5', 'Jetson Nano', 'Breadboard',
  'LEDs', 'Resistors', 'Jumper wires', 'Ultrasonic sensor', 'PIR motion sensor', 'Soil moisture sensor',
  'Servo motor', 'DC motors', 'Motor driver', 'Camera module', 'Buzzer', 'Battery pack', 'None'
];

const state = {
  userProfile: {
    userName: 'Maker', dreamProject: '', codingExperienceDetailed: '', learningPreferences: [], existingParts: [],
    selectedPathType: null, recommendedBoard: '', skillLevel: 'absolute beginner', budget: '$25–$50', mentorAccess: 'sometimes',
    timePerWeek: '1–3 hours', safetyComfort: 'new', hardwareExperience: '', confusion: ''
  },
  roadmap: null,
  missingParts: [],
  currentStepId: null,
  quizSessions: new Map()
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const safeUrl = (value = '') => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '#';
  } catch { return '#'; }
};
const labelPath = type => PATHS[type]?.label || 'Optimal Path';

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2600);
}

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function initTheme() {
  const saved = localStorage.getItem('circuitmentor-theme');
  const theme = saved === 'dark' ? 'dark' : 'light';
  applyTheme(theme);
  $('#theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('circuitmentor-theme', next);
    toast(`${next === 'dark' ? 'Dark' : 'Light'} mode saved`);
  });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const dark = theme === 'dark';
  $('.theme-icon').textContent = dark ? '☀' : '☾';
  $('.theme-label').textContent = dark ? 'Light' : 'Dark';
  $('#theme-toggle').setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
}

function chipMarkup(option, group) {
  const id = `${group}-${option.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return `<label class="chip" for="${id}"><input id="${id}" type="checkbox" value="${esc(option)}" /><span>${esc(option)}</span></label>`;
}

function initChips() {
  $('#learning-preferences').innerHTML = LEARNING_OPTIONS.map(option => chipMarkup(option, 'learn')).join('');
  $('#existing-parts').innerHTML = PART_OPTIONS.map(option => chipMarkup(option, 'part')).join('');
  $('#existing-parts').addEventListener('change', event => {
    if (event.target.value === 'None' && event.target.checked) {
      $$('#existing-parts input').forEach(input => { if (input !== event.target) input.checked = false; });
    } else if (event.target.checked) {
      const none = $$('#existing-parts input').find(input => input.value === 'None');
      if (none) none.checked = false;
    }
  });
}

function reveal(sectionId) {
  document.getElementById(sectionId).classList.remove('hidden');
}

function setChecked(container, values) {
  const wanted = new Set(values);
  $$(`#${container} input`).forEach(input => { input.checked = wanted.has(input.value); });
}

function dynamicInterviewMessage() {
  const f = projectFlavor(state.userProfile);
  const dream = state.userProfile.dreamProject;
  let question = `For a ${f.label}, should the first win be sensing correctly, producing an output, or proving the logic in simulation?`;
  if (f.key === 'robotics') question = 'When the robot detects something, should it stop, turn, back up—or eventually choose using the camera?';
  if (f.key === 'computer vision') question = 'Which object should the first camera demo recognize, and what should happen after recognition?';
  if (f.key === 'iot') question = 'Which reading matters most, how often should it update, and where do you want to see it?';
  if (f.key === 'automation') question = 'What exact condition should trigger the response, and what should the system do if a sensor fails?';
  $('#dynamic-question').innerHTML = `<b>Personalized follow-up:</b> ${esc(question)} <span class="hidden">${esc(dream)}</span>`;
}

function collectProfile() {
  const customParts = $('#custom-parts').value.split(/[,;\n]/).map(part => part.trim()).filter(Boolean);
  const existingParts = $$('#existing-parts input:checked').map(input => input.value).filter(value => value !== 'None');
  state.userProfile = {
    ...state.userProfile,
    hardwareExperience: $('#hardware-experience').value.trim() || 'Nothing yet',
    codingExperienceDetailed: $('#coding-experience').value.trim() || 'No coding experience yet',
    learningPreferences: $$('#learning-preferences input:checked').map(input => input.value),
    existingParts: [...new Set([...existingParts, ...customParts])],
    budget: $('#budget').value,
    timePerWeek: $('#time-per-week').value,
    mentorAccess: $('#mentor-access').value,
    safetyComfort: $('#safety-comfort').value,
    confusion: $('#confusion').value.trim() || 'How the pieces connect safely'
  };
  if (!state.userProfile.learningPreferences.length) state.userProfile.learningPreferences = ['Mixed'];
  state.userProfile.skillLevel = inferSkillLevel(state.userProfile);
}

function renderPathCards() {
  const counts = { optimal: 8, fastest: 6, 'lowest-cost': 8, 'deep-learning': 12 };
  const quizzes = { optimal: '8 checkpoints', fastest: '6 focused checks', 'lowest-cost': '8 buy-or-build checks', 'deep-learning': '12 deep checks' };
  $('#path-grid').innerHTML = Object.entries(PATHS).map(([key, path]) => `
    <button class="path-card" type="button" data-path="${key}" style="--path-color:${path.color}">
      <span class="path-card-top"><span class="path-icon">${path.icon}</span><small>${esc(path.pace)} route</small></span>
      <strong class="path-card-title">${esc(path.label)}</strong>
      <p>${esc(path.promise)}</p>
      <span class="path-stats">
        <span><b>${counts[key]} steps</b>Structure</span>
        <span><b>${esc(path.estimate)}</b>Typical pace</span>
        <span><b>${esc(path.cost)}</b>Relative cost</span>
        <span><b>${esc(quizzes[key])}</b>Practice</span>
      </span>
      <span class="path-choose">Build this roadmap →</span>
    </button>
  `).join('');
}

function selectPath(pathType, shouldScroll = true) {
  const previous = state.userProfile.selectedPathType;
  state.userProfile.selectedPathType = pathType;
  state.roadmap = generateRoadmap(state.userProfile, pathType);
  state.userProfile.recommendedBoard = state.roadmap.recommendedBoard;
  state.missingParts = buildPartsList(state.userProfile, state.roadmap);
  state.currentStepId = state.roadmap.steps[0].id;
  state.quizSessions.clear();
  renderRoadmap();
  reveal('roadmap');
  updateChatContext();
  if (previous && previous !== pathType) toast(`Roadmap regenerated: ${labelPath(pathType)}`);
  if (shouldScroll) scrollToId('roadmap');
}

function renderRoadmap() {
  const { roadmap, userProfile } = state;
  const path = PATHS[roadmap.pathType];
  const resourceTotal = roadmap.steps.reduce((sum, step) => sum + step.resources.length, 0);
  $('#roadmap-top').innerHTML = `
    <div class="roadmap-banner">
      <div>
        <span class="eyebrow">${esc(path.label)} · BUILT FOR ${esc(userProfile.userName.toUpperCase())}</span>
        <h2>${esc(roadmap.flavor.finalBuild.replace(/^./, c => c.toUpperCase()))}</h2>
        <p>${esc(path.promise)} The plan uses ${esc(roadmap.recommendedBoard)} and prioritizes ${userProfile.existingParts.length ? 'the parts you already own' : 'a safe, minimal starter setup'}.</p>
      </div>
      <div class="roadmap-metrics">
        <span>Steps<b>${roadmap.steps.length}</b></span>
        <span>Time<b>${esc(roadmap.estimatedTime)}</b></span>
        <span>Parts estimate<b>${esc(roadmap.estimatedCost)}</b></span>
        <span>Budget fit<b>${esc(roadmap.budgetFit)}</b></span>
      </div>
    </div>`;
  $('#path-switcher').innerHTML = Object.entries(PATHS).map(([key, value]) => `
    <button class="switch-button ${key === roadmap.pathType ? 'active' : ''}" type="button" data-switch-path="${key}">${value.icon} &nbsp;${esc(value.short)}</button>
  `).join('');
  const owned = userProfile.existingParts.length;
  const needed = state.missingParts.filter(item => item.status === 'Needed').length;
  const later = state.missingParts.length - needed;
  $('#inventory-summary').innerHTML = `
    <span class="sidebar-label">PARTS PLAN</span>
    <div class="inventory-line"><span>Owned</span><b>${owned}</b></div>
    <div class="inventory-line"><span>Needed</span><b>${needed}</b></div>
    <div class="inventory-line"><span>Optional / later</span><b>${later}</b></div>
    <div class="inventory-line"><span>Board</span><b>${esc(roadmap.recommendedBoard)}</b></div>`;
  $('#roadmap-title').textContent = `${roadmap.steps.length} steps from idea to build`;
  $('#resource-count').textContent = `${resourceTotal} matched resources`;
  $('#step-list').innerHTML = roadmap.steps.map((step, index) => renderStep(step, index)).join('');
  renderParts();
  renderSafetyGate();
}

function renderStep(step, index) {
  const directVideos = step.resources.filter(resource => getYouTubeEmbedUrl(resource.url));
  const hasRisk = step.safetyRisk === 'high' || /review|required|motor|battery|solder|power/i.test(step.safetyNote);
  return `
    <article class="step-card ${index === 0 ? 'open' : ''}" data-step-id="${esc(step.id)}">
      <button class="step-summary" type="button" aria-expanded="${index === 0 ? 'true' : 'false'}">
        <span class="step-index">${String(index + 1).padStart(2, '0')}</span>
        <span><h3>${esc(step.title)}</h3><p>${esc(step.whyItMatters)}</p></span>
        <span class="step-quick"><span class="tag">${esc(step.estimatedTime)}</span><span class="tag">${esc(step.difficulty)}</span>${hasRisk ? '<span class="tag safety">Review</span>' : ''}</span>
        <span class="step-chevron">⌄</span>
      </button>
      <div class="step-details">
        <div class="lesson-intro">
          <div class="lesson-block"><span>WHY THIS MATTERS</span><p>${esc(step.whyItMatters)}</p></div>
          <div class="lesson-block"><span>WHAT YOU’LL LEARN</span><p>${esc(step.knowledgeToLearn)}</p></div>
          <div class="lesson-block"><span>WHAT YOU’LL BUILD</span><p>${esc(step.whatToBuild)}</p></div>
          <div class="lesson-block"><span>COMMON MISTAKE</span><p>${esc(step.commonMistake)}</p></div>
        </div>
        <div class="build-spec">
          <div><small>Board / environment</small><b>${esc(step.boardUsed)}</b></div>
          <div><small>Topic</small><b>${esc(step.topic)}</b></div>
          <div><small>Estimated time</small><b>${esc(step.estimatedTime)}</b></div>
          <div><small>Next step</small><b>${esc(step.nextStep)}</b></div>
        </div>
        <div class="parts-used">
          ${step.ownedPartsUsed.map(part => `<span class="part-pill owned">✓ Owned · ${esc(part)}</span>`).join('')}
          ${step.missingParts.map(part => `<span class="part-pill needed">Needed · ${esc(part)}</span>`).join('')}
          ${!step.ownedPartsUsed.length && !step.missingParts.length ? '<span class="part-pill">No physical parts needed</span>' : ''}
        </div>
        <h4 class="section-mini-title">Direct resources for this step</h4>
        ${!directVideos.length ? '<div class="video-notice">No verified direct video found for this step. Use the matched written guide, official documentation, or simulator below. Any video search is shown only as a secondary fallback.</div>' : ''}
        <div class="resource-grid">${step.resources.map(resource => renderResource(resource, step)).join('')}</div>
        <div class="practice-callout">
          <div class="practice-card"><span>MINI TASK</span><p>${esc(step.miniTask)}</p></div>
          <div class="safety-card"><span>SAFETY NOTE</span><p>${esc(step.safetyNote)}</p></div>
        </div>
        <p class="unlock"><b>Unlock condition:</b> ${esc(step.unlockCondition)}</p>
        ${renderQuizShell(step)}
      </div>
    </article>`;
}

function renderResource(resource, step) {
  const embed = getYouTubeEmbedUrl(resource.url);
  const isVideoSearch = /video search/i.test(resource.type || '') || (/youtube\.com\/results/i.test(resource.url || ''));
  const isWritten = /written|guide|documentation|docs|course|article|textbook/i.test(resource.type || '') && !isVideoSearch;
  const summary = isWritten ? getResourceSummary(resource, step, state.userProfile) : null;
  const resourceUrl = safeUrl(resource.url);
  return `
    <article class="resource-card">
      ${embed ? `<div class="video-frame"><iframe src="${esc(embed)}" title="${esc(resource.title)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>` : ''}
      <div class="resource-body">
        <div class="resource-labels"><span>${esc(resource.type || 'resource')}</span><span class="trust">${esc(resource.trustLabel || 'Curated')}</span><span>${esc(resource.board || step.boardUsed)}</span><span>${esc(resource.difficulty || step.difficulty)}</span></div>
        <h4>${esc(resource.title)}</h4>
        <p>${esc(resource.whyHelpful || 'Matched to the board and topic in this roadmap step.')}</p>
        <p class="focus"><b>Focus on:</b> ${esc(resource.focusArea || step.topic)}</p>
        <p><b>Time:</b> ${esc(resource.estimatedTime || 'Self-paced')}</p>
        <div class="resource-actions">
          <a class="text-link ${embed || (!isVideoSearch && resource.trustLabel !== 'Suggested Search') ? 'primary-link' : ''}" href="${esc(resourceUrl)}" target="_blank" rel="noopener noreferrer">${embed ? 'Open on YouTube' : isVideoSearch ? 'Search YouTube (fallback)' : isWritten ? 'Open full guide' : 'Open resource'} ↗</a>
        </div>
        ${summary ? `<details class="guide-summary"><summary>Beginner guide summary</summary><div>
          <p><b>What you need:</b> ${esc(summary.whatToRead)}</p>
          <p><b>Ignore for now:</b> ${esc(summary.whatToIgnoreForNow)}</p>
          <p><b>Beginner summary:</b> ${esc(summary.beginnerSummary)}</p>
          <ol>${summary.keySteps.map(item => `<li>${esc(item)}</li>`).join('')}</ol>
          <p><b>Common mistake:</b> ${esc(summary.commonMistake)}</p>
          <p><b>After reading:</b> ${esc(summary.miniTask)}</p>
        </div></details>` : ''}
      </div>
    </article>`;
}

function renderQuizShell(step) {
  return `<div class="quiz-shell" data-quiz-step="${esc(step.id)}">
    <div class="quiz-head">
      <div><span class="eyebrow">SKILL CHECKPOINT</span><h4>How many questions do you want?</h4></div>
      <div class="quiz-counts">${[3, 5, 10].map(count => `<button type="button" data-quiz-count="${count}">${count}</button>`).join('')}</div>
    </div>
    <div class="quiz-stage"></div>
  </div>`;
}

function startQuiz(stepId, count) {
  state.quizSessions.set(stepId, { count, index: 0, answers: new Array(count).fill(null) });
  renderQuizQuestion(stepId);
}

function renderQuizQuestion(stepId) {
  const step = state.roadmap.steps.find(item => item.id === stepId);
  const session = state.quizSessions.get(stepId);
  const shell = document.querySelector(`[data-quiz-step="${CSS.escape(stepId)}"]`);
  if (!step || !session || !shell) return;
  if (session.index >= session.count) {
    const correct = session.answers.filter(answer => answer?.correct).length;
    shell.querySelector('.quiz-stage').innerHTML = `<div class="quiz-question"><p>Checkpoint complete: ${correct} of ${session.count} correct</p><div class="quiz-feedback">${correct === session.count ? 'Strong work. You explained the safety and build evidence for this exact step.' : 'Review the matching resource and retry the questions you missed before unlocking the next step.'}</div><button class="button small secondary" type="button" data-quiz-retry>Try again</button></div>`;
    return;
  }
  const q = step.quiz[session.index];
  const answer = session.answers[session.index];
  shell.querySelector('.quiz-stage').innerHTML = `
    <div class="quiz-question">
      <p>${session.index + 1}. ${esc(q.question)}</p>
      <div class="quiz-options">${q.options.map((option, index) => `<button class="quiz-option ${answer ? index === q.correct ? 'correct' : index === answer.choice ? 'wrong' : '' : ''}" type="button" data-answer="${index}" ${answer ? 'disabled' : ''}>${esc(option)}</button>`).join('')}</div>
      ${answer ? `<div class="quiz-feedback">${answer.correct ? '<b>Correct.</b> ' : `<b>Not quite.</b> “${esc(q.options[answer.choice])}” does not match the roadmap evidence. `}${esc(q.explanation)}<br /><b>Example:</b> ${esc(q.example)}${answer.correct ? '' : `<br /><b>Easier follow-up:</b> ${esc(q.easier)}`}<br /><b>Review:</b> ${esc(q.resource)}</div>` : ''}
      <div class="quiz-nav"><span>Question ${session.index + 1} of ${session.count}</span>${answer ? '<button class="button small primary" type="button" data-quiz-next>Next →</button>' : '<span>Choose one answer</span>'}</div>
    </div>`;
}

function answerQuiz(stepId, choice) {
  const step = state.roadmap.steps.find(item => item.id === stepId);
  const session = state.quizSessions.get(stepId);
  if (!step || !session || session.answers[session.index]) return;
  const q = step.quiz[session.index];
  session.answers[session.index] = { choice, correct: choice === q.correct };
  renderQuizQuestion(stepId);
}

function renderParts() {
  const list = state.missingParts;
  if (!list.length) {
    $('#parts-list').innerHTML = '<div class="empty-cart"><b>No purchases needed for this route.</b><br />Your owned parts and simulators cover the current roadmap.</div>';
    return;
  }
  $('#parts-list').innerHTML = list.map(item => `
    <article class="part-card">
      <div class="part-card-head"><div><h3>${esc(item.partName)} × ${item.quantity}</h3><p>${esc(item.whyNeeded)}</p></div><span class="part-status">${esc(item.status)}</span></div>
      <div class="part-facts"><span><b>Estimate:</b> ${esc(item.estimatedPrice)}</span><span><b>Board:</b> ${esc(item.compatibleBoard)}</span></div>
      <p><b>Safety:</b> ${esc(item.safetyNote)}</p>
      <div class="shop-links">${item.links.map(link => `<a href="${esc(safeUrl(link.url))}" target="_blank" rel="noopener noreferrer">${esc(link.label)}</a>`).join('')}</div>
    </article>`).join('');
}

function renderSafetyGate() {
  const risky = state.roadmap.steps.filter(step => step.safetyRisk === 'high' || /human review|required|battery|motor|solder|high current|wall power/i.test(step.safetyNote));
  const level = risky.some(step => step.safetyRisk === 'high') ? 'Elevated — human review required' : 'Moderate — check before power';
  const reasons = risky.slice(0, 3).map(step => step.title).join(', ') || 'Unclear beginner wiring';
  $('#safety-gate').innerHTML = `
    <div class="safety-gate-inner">
      <div>
        <div class="safety-icon">△</div><span class="risk-level">${esc(level)}</span>
        <h2>Human Review Needed</h2>
        <p>CircuitMentor AI can teach and guide, but it cannot certify that your wiring is safe. Before powering this circuit, ask a teacher, parent, mentor, or experienced builder to review it.</p>
      </div>
      <div class="safety-details">
        <div class="safety-detail"><span>Why flagged</span><p>${esc(reasons)} involve power, motion, batteries, higher-current loads, or final integration.</p></div>
        <div class="safety-detail"><span>What could go wrong</span><p>Reversed polarity, excess current, a short circuit, hot components, unexpected movement, or damaged hardware.</p></div>
        <div class="safety-detail"><span>Safer alternative</span><p>Test logic in a simulator or with LEDs/serial output while motors, batteries, and external loads remain disconnected.</p></div>
        <div class="safety-detail"><span>Mentor checklist</span><p>Check pinout, voltage, polarity, driver, current limit, common ground, insulation, strain relief, and an accessible power disconnect.</p></div>
      </div>
      <label class="review-check"><input id="review-confirm" type="checkbox" /><span>I will continue only after an experienced person reviews the wiring. This acknowledgement does not certify the circuit as safe.</span></label>
    </div>`;
}

function openChat() {
  $('#chat-panel').classList.add('open');
  $('#chat-panel').setAttribute('aria-hidden', 'false');
  $('#chat-input').focus();
}

function closeChat() {
  $('#chat-panel').classList.remove('open');
  $('#chat-panel').setAttribute('aria-hidden', 'true');
}

function currentStep() {
  return state.roadmap?.steps.find(step => step.id === state.currentStepId) || state.roadmap?.steps[0];
}

function updateChatContext() {
  if (!state.roadmap) {
    $('#chat-context').textContent = 'Start a project so I can personalize my help.';
    return;
  }
  const step = currentStep();
  $('#chat-context').textContent = `${state.userProfile.userName} · ${labelPath(state.roadmap.pathType)} · ${step?.title || 'Roadmap'}`;
}

function addMessage(text, who = 'bot') {
  const message = document.createElement('div');
  message.className = `message ${who}`;
  message.textContent = text;
  $('#chat-messages').appendChild(message);
  $('#chat-messages').scrollTop = $('#chat-messages').scrollHeight;
}

function chatbotAnswer(prompt) {
  if (!state.roadmap) return 'First, describe your dream project and choose a route. Then I can answer using your board, parts, budget, resources, and current safety notes.';
  const text = prompt.toLowerCase();
  const step = currentStep();
  const owned = state.userProfile.existingParts.join(', ') || 'no listed parts yet';
  const needed = state.missingParts.filter(item => item.status === 'Needed').map(item => item.partName);
  if (/why.*learn|why.*this/.test(text)) return `You’re learning “${step.title}” because ${step.whyItMatters.toLowerCase()} For your ${state.userProfile.dreamProject}, this keeps the next build small enough to test.`;
  if (/already have|own|parts i/.test(text)) return `You listed: ${owned}. This ${labelPath(state.roadmap.pathType)} prioritizes those parts. In the current step, owned parts are: ${step.ownedPartsUsed.join(', ') || 'none required'}.`;
  if (/buy|purchase|next part/.test(text)) return needed.length ? `The next required item is ${needed[0]}. It is needed for ${state.missingParts.find(item => item.partName === needed[0]).whyNeeded.toLowerCase()} Compare current prices in the parts section; do not assume one store is cheapest.` : 'Nothing new is required right now. Continue with your owned parts or the simulator.';
  if (/simpl|explain/.test(text)) return `Plain version: ${step.whatToBuild} Your one small job is: ${step.miniTask} Do not move on until: ${step.unlockCondition}`;
  if (/quiz/.test(text)) return `Quick check: ${step.quiz[0].question}\nOpen this step’s Skill Checkpoint for 3, 5, or 10 questions and detailed feedback.`;
  if (/wiring|safe|battery|motor|power/.test(text)) return `I cannot guarantee wiring is safe. For this step: ${step.safetyNote} Before power, have a teacher, parent, mentor, or experienced builder check voltage, polarity, pinout, driver, current, and the disconnect.`;
  if (/debug|not work|broken|error/.test(text)) return `Return to the last known-working version. For “${step.title},” avoid this common mistake: ${step.commonMistake} Disconnect power before moving wires, change one thing, record the result, and describe the exact symptom to me.`;
  if (/term|mean/.test(text)) return `Tell me the exact wiring term. I’ll explain it using ${state.roadmap.recommendedBoard}, your current step, and a small example from your ${state.roadmap.flavor.label}.`;
  return `For your ${state.roadmap.flavor.label}, stay focused on “${step.title}.” Learn: ${step.knowledgeToLearn} Then try: ${step.miniTask} If your question involves power or unclear wiring, pause for human review.`;
}

function runDemo() {
  $('#user-name').value = 'Alex';
  $('#dream-project').value = 'I want to build a robot that avoids obstacles and later uses a camera.';
  $('#hardware-experience').value = 'I have blinked an LED once, but I have not used sensors or motors.';
  $('#coding-experience').value = 'I know basic Python, loops, functions, and lists. I have not used MicroPython yet.';
  $('#custom-parts').value = '';
  $('#budget').value = '$25–$50';
  $('#time-per-week').value = '1–3 hours';
  $('#mentor-access').value = 'sometimes';
  $('#safety-comfort').value = 'new';
  $('#confusion').value = 'I do not know how the motors and camera should work together.';
  setChecked('learning-preferences', ['Videos', 'Hands-on projects', 'Step-by-step instructions']);
  setChecked('existing-parts', ['Raspberry Pi Pico W', 'Breadboard', 'LEDs', 'Resistors', 'Jumper wires']);
  state.userProfile = { ...state.userProfile, userName: 'Alex', dreamProject: $('#dream-project').value };
  collectProfile();
  dynamicInterviewMessage();
  $('#customize-intro').textContent = `Alex, your vision robot needs a path that keeps motion safe and introduces the camera without overwhelming the first build.`;
  reveal('customize'); reveal('paths');
  renderPathCards();
  selectPath('optimal', false);
  scrollToId('paths');
  toast('Demo profile ready — choose any route');
}

function bindEvents() {
  $('#start-project').addEventListener('click', () => scrollToId('interview'));
  $('#try-demo').addEventListener('click', runDemo);
  $('#interview-form').addEventListener('submit', event => {
    event.preventDefault();
    const dream = $('#dream-project').value.trim();
    if (!dream) return;
    state.userProfile.userName = $('#user-name').value.trim() || 'Maker';
    state.userProfile.dreamProject = dream;
    dynamicInterviewMessage();
    const f = projectFlavor(state.userProfile);
    $('#customize-intro').textContent = `${state.userProfile.userName}, I recognized a ${f.label}. These answers will decide which board, resources, and safety checks belong in your plan.`;
    reveal('customize');
    scrollToId('customize');
  });
  $('#profile-form').addEventListener('submit', event => {
    event.preventDefault();
    collectProfile();
    renderPathCards();
    reveal('paths');
    scrollToId('paths');
  });
  $('#path-grid').addEventListener('click', event => {
    const button = event.target.closest('[data-path]');
    if (button) selectPath(button.dataset.path);
  });
  $('#roadmap').addEventListener('click', event => {
    const switcher = event.target.closest('[data-switch-path]');
    if (switcher) { selectPath(switcher.dataset.switchPath, false); return; }
    const summary = event.target.closest('.step-summary');
    if (summary) {
      const card = summary.closest('.step-card');
      const opening = !card.classList.contains('open');
      card.classList.toggle('open');
      summary.setAttribute('aria-expanded', String(opening));
      if (opening) { state.currentStepId = card.dataset.stepId; updateChatContext(); }
      return;
    }
    const count = event.target.closest('[data-quiz-count]');
    if (count) { startQuiz(count.closest('[data-quiz-step]').dataset.quizStep, Number(count.dataset.quizCount)); return; }
    const answer = event.target.closest('[data-answer]');
    if (answer) { answerQuiz(answer.closest('[data-quiz-step]').dataset.quizStep, Number(answer.dataset.answer)); return; }
    const next = event.target.closest('[data-quiz-next]');
    if (next) {
      const stepId = next.closest('[data-quiz-step]').dataset.quizStep;
      state.quizSessions.get(stepId).index += 1; renderQuizQuestion(stepId); return;
    }
    const retry = event.target.closest('[data-quiz-retry]');
    if (retry) {
      const stepId = retry.closest('[data-quiz-step]').dataset.quizStep;
      startQuiz(stepId, state.quizSessions.get(stepId).count);
    }
  });
  $('#chat-launcher').addEventListener('click', openChat);
  $('#chat-close').addEventListener('click', closeChat);
  $('#chat-form').addEventListener('submit', event => {
    event.preventDefault();
    const prompt = $('#chat-input').value.trim();
    if (!prompt) return;
    addMessage(prompt, 'user');
    $('#chat-input').value = '';
    setTimeout(() => addMessage(chatbotAnswer(prompt)), 180);
  });
  $('#quick-prompts').addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    addMessage(button.textContent, 'user');
    setTimeout(() => addMessage(chatbotAnswer(button.textContent)), 180);
  });
  $('#image-upload').addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const wrap = $('#image-preview-wrap');
    const url = URL.createObjectURL(file);
    wrap.innerHTML = `<img src="${esc(url)}" alt="Uploaded circuit preview" /><b>${esc(file.name)}</b><br />I can accept your photo, but this demo uses text-based guidance. Describe what you want checked, and I’ll help with a safety checklist.`;
    wrap.classList.remove('hidden');
    addMessage('I can accept your photo, but this demo uses text-based guidance. Describe what you want checked, and I’ll help with a safety checklist. I cannot certify wiring as safe.');
  });
}

function init() {
  initTheme();
  initChips();
  renderPathCards();
  bindEvents();
}

init();

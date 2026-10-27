import { APP_NAME, achievements, courses, findLesson, flattenLessons, mascots } from './data.js';
import { completeLesson, createInitialProgress, getCourseStats, getLevel, getNextLesson, getStreak, getUnlockedLessonIds, loadProgress, recordAnswer, saveProgress, STORAGE_KEY } from './progress.js';

const root = document.querySelector('#view-root');
const toastRegion = document.querySelector('#toast-region');
const modalBackdrop = document.querySelector('#modal-backdrop');
let loaded = loadProgress();
let progress = loaded.progress;
let view = 'home';
let courseFilter = 'Все курсы';
let courseSearch = '';
let lessonRun = null;
let toastTimer;

const labels = { home: 'Обзор', courses: 'Каталог курсов', mascots: 'Мои спутники', profile: 'Мой профиль', settings: 'Настройки', lesson: 'Урок' };
const mascot = () => mascots.find(item => item.id === progress.selectedMascotId) || mascots[0];
const selectedCourse = () => courses.find(item => item.id === progress.selectedCourseId) || courses[0];
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const percentForLevel = () => getLevel(progress.xp).current;

function persist(message = '') {
  const result = saveProgress(progress);
  if (!result.ok) toast(result.error, 'error');
  else if (message) toast(message);
  updateShell();
  return result.ok;
}

function toast(message, kind = 'success') {
  clearTimeout(toastTimer);
  toastRegion.innerHTML = `<div class="toast ${kind === 'error' ? 'toast-error' : ''}"><span>${kind === 'error' ? '!' : '✓'}</span>${esc(message)}<button class="toast-close" data-action="dismiss-toast" aria-label="Закрыть уведомление">×</button></div>`;
  toastTimer = setTimeout(() => { toastRegion.innerHTML = ''; }, 3400);
}

function updateShell() {
  document.title = `${APP_NAME} — учёба в своём ритме`;
  document.querySelector('#app-name').textContent = APP_NAME;
  document.querySelector('#header-xp').textContent = progress.xp;
  document.querySelector('#streak-count').textContent = getStreak(progress);
  document.querySelector('#header-avatar').textContent = mascot().icon;
  document.querySelector('#breadcrumb').innerHTML = `Моё пространство <span>/</span> ${esc(labels[view] || 'Обзор')}`;
  document.querySelectorAll('.nav-item[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  document.documentElement.dataset.theme = progress.settings.theme;
  document.documentElement.classList.toggle('reduce-motion', progress.settings.reducedMotion);
}

function navigate(next) {
  view = next;
  lessonRun = null;
  render();
  window.scrollTo({ top: 0, behavior: progress.settings.reducedMotion ? 'instant' : 'smooth' });
}

function render() {
  updateShell();
  if (!progress.firstRunComplete && view === 'home') { renderWelcome(); return; }
  if (view === 'home') renderHome();
  else if (view === 'courses') renderCourses();
  else if (view === 'mascots') renderMascots();
  else if (view === 'profile') renderProfile();
  else if (view === 'settings') renderSettings();
  else if (view === 'lesson') renderLesson();
}

function renderWelcome() {
  root.innerHTML = `<section class="welcome-screen"><div class="welcome-visual"><div class="welcome-glow"></div><span class="welcome-star welcome-star-a">✦</span><span class="welcome-star welcome-star-b">✧</span><span class="welcome-mascot">${mascot().icon}</span><span class="welcome-caption">твой новый спутник</span></div><div class="welcome-copy"><p class="eyebrow">РАДЫ ТЕБЕ</p><h1>Привет,<br>исследователь!</h1><p class="lead">Здесь большие темы становятся маленькими приключениями. Выбери интересный курс, проходи короткие уроки и двигайся в своём темпе.</p><div class="welcome-points"><span><i>✦</i> Короткие уроки без спешки</span><span><i>◈</i> Понятный маршрут и прогресс</span><span><i>♡</i> Спутник, который поддержит</span></div><button class="button button-dark welcome-start" data-action="start-welcome">Выбрать первый курс <span>→</span></button><button class="text-button welcome-skip" data-action="skip-welcome">Пропустить знакомство</button><small class="welcome-footnote">Начать можно без регистрации. Прогресс сохранится в этом браузере.</small></div><span class="welcome-page-no">01 <i>/ 04</i></span></section>`;
}

function finishWelcome(destination) {
  progress.firstRunComplete = true;
  persist();
  view = destination;
  render();
}

function renderHome() {
  const course = selectedCourse();
  const stats = getCourseStats(course, progress);
  const nextLesson = getNextLesson(course, progress);
  const level = getLevel(progress.xp);
  const earned = achievements.filter(item => progress.claimedAchievements.includes(item.id));
  const resume = progress.lessonSession && findLesson(progress.lessonSession.lessonId);
  root.innerHTML = `
    <section class="welcome-row"><div><p class="eyebrow">${greeting()}</p><h1>Привет, ${esc(progress.nickname)} <span class="wave">✦</span></h1><p class="lead">Каждый небольшой шаг приближает к большому открытию.</p></div><button class="mascot-bubble" data-view="mascots" aria-label="Сменить спутника"><span class="mascot-orbit">✦</span><span class="mascot-face">${mascot().icon}</span><span class="mascot-caption">${mascot().name} рядом</span></button></section>
    ${loaded.warning ? `<div class="inline-alert">${esc(loaded.warning)}</div>` : ''}
    <section class="hero-panel"><div class="hero-copy"><span class="hero-kicker"><span>✧</span> ТВОЙ МАРШРУТ</span><h2>${esc(course.title)}</h2><p>${esc(course.description)}</p><div class="hero-meta"><span>◷ ${esc(course.duration)}</span><span>◉ ${esc(course.level)}</span></div><button class="button button-dark" data-action="continue-course">${stats.completed ? 'Продолжить путь' : 'Начать путешествие'} <span>→</span></button></div><div class="hero-art" aria-hidden="true"><div class="hero-sun"></div><div class="hero-mountain mountain-back"></div><div class="hero-mountain mountain-front"></div><div class="hero-path"></div><div class="hero-star star-one">✦</div><div class="hero-star star-two">✧</div><div class="hero-character">${mascot().icon}</div><span class="art-label">шаг за шагом</span></div><div class="hero-index">01 <span>/ 04</span></div></section>
    <section class="section-heading"><div><p class="eyebrow">МАЛЕНЬКИЕ ПОБЕДЫ</p><h2>Твой прогресс</h2></div><button class="text-button" data-view="profile">Подробнее <span>→</span></button></section>
    <section class="stats-grid"><div class="stat-card stat-progress"><div class="stat-top"><span>Текущий курс</span><span class="stat-icon">◒</span></div><strong>${stats.percent}<small>%</small></strong><div class="progress-track"><span style="width:${stats.percent}%"></span></div><p>${stats.completed} из ${stats.total} уроков пройдено</p></div><div class="stat-card"><div class="stat-top"><span>Опыт</span><span class="stat-icon purple">✦</span></div><strong>${progress.xp}<small> XP</small></strong><p>${level.remaining} XP до уровня ${level.level + 1}</p><div class="mini-track"><span style="width:${level.current}%"></span></div></div><div class="stat-card"><div class="stat-top"><span>Занятия</span><span class="stat-icon peach">☼</span></div><strong>${getStreak(progress)}<small> дней</small></strong><p>Ты учишься в своём темпе</p><div class="week-dots">${weekDots()}</div></div></section>
    <div class="dashboard-grid"><section class="route-section"><div class="section-heading compact"><div><p class="eyebrow">СЛЕДУЮЩИЙ ШАГ</p><h2>Продолжай исследовать</h2></div><button class="text-button" data-view="courses">Все курсы <span>→</span></button></div>${resume ? `<button class="resume-banner" data-action="resume"><span class="resume-icon">↗</span><span><b>Продолжить урок «${esc(resume.lesson.title)}»</b><small>Ты остановился на задании ${progress.lessonSession.step + 1}</small></span><span class="resume-arrow">→</span></button>` : ''}${renderRoute(course, nextLesson)}</section><aside class="achievements-panel"><div class="section-heading compact"><div><p class="eyebrow">ТВОИ НАГРАДЫ</p><h2>Достижения</h2></div><span class="achievement-count">${earned.length}/${achievements.length}</span></div>${earned.length ? earned.slice(-3).map(item => `<div class="achievement-row"><span class="achievement-icon">${item.icon}</span><span><b>${esc(item.title)}</b><small>${esc(item.description)}</small></span><span class="earned-check">✓</span></div>`).join('') : `<div class="empty-achievements"><span>✧</span><b>Всё только начинается</b><p>Пройди первый урок — здесь появится твоё достижение.</p></div>`}</aside></div>
    <section class="discover-strip"><div><span class="discover-spark">✧</span><span><b>Любопытство — отличный компас</b><small>Выбирай то, что интересно именно тебе.</small></span></div><button class="button button-outline" data-view="courses">Найти курс <span>→</span></button></section>`;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return 'ДОБРОЕ УТРО';
  if (hour < 18) return 'ХОРОШИЙ ДЕНЬ ДЛЯ ОТКРЫТИЙ';
  return 'ДОБРЫЙ ВЕЧЕР';
}

function weekDots() {
  const dates = new Set(progress.activityDates || []);
  const today = new Date();
  return ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'].map((day, index) => {
    const date = new Date(today); date.setDate(today.getDate() - (6 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return `<span class="week-dot ${dates.has(key) ? 'done' : ''}" title="${day} ${date.getDate()}">${dates.has(key) ? '✓' : day}</span>`;
  }).join('');
}

function renderRoute(course, nextLesson) {
  const unlocked = getUnlockedLessonIds(course, progress);
  return course.modules.map((module, moduleIndex) => `<div class="route-module"><div class="module-heading"><span class="module-number">0${moduleIndex + 1}</span><div><h3>${esc(module.title)}</h3><small>${module.lessons.length} ${pluralize(module.lessons.length, 'урок', 'урока', 'уроков')}</small></div><span class="module-line"></span></div><div class="lesson-path">${module.lessons.map(lesson => {
    const done = progress.completedLessons.includes(lesson.id);
    const available = unlocked.has(lesson.id);
    const current = nextLesson?.id === lesson.id;
    return `<button class="path-node ${done ? 'complete' : ''} ${current ? 'current' : ''} ${!available ? 'locked' : ''}" data-action="open-lesson" data-lesson="${lesson.id}" ${!available ? 'disabled title="Сначала пройди предыдущий урок"' : ''}><span class="node-marker">${done ? '✓' : current ? '→' : '·'}</span><span><b>${esc(lesson.title)}</b><small>${esc(lesson.duration)}${done ? ' · пройдено' : current ? ' · следующий шаг' : ' · закрыто'}</small></span><span class="node-open">${available ? '→' : '⌑'}</span></button>`;
  }).join('')}</div></div>`).join('');
}

function renderCourses() {
  const categories = ['Все курсы', 'Языки', 'Математика', 'Технологии'];
  const filtered = courses.filter(course => (courseFilter === 'Все курсы' || course.category === courseFilter) && `${course.title} ${course.description} ${course.category}`.toLowerCase().includes(courseSearch.toLowerCase()));
  root.innerHTML = `<section class="page-heading"><div><p class="eyebrow">КАТАЛОГ</p><h1>Найди своё направление</h1><p class="lead">Короткие курсы, чтобы начать с интересной тебе темы.</p></div><div class="heading-decoration">✧</div></section><div class="catalog-tools"><label class="search-box"><span>⌕</span><input id="course-search" type="search" placeholder="Найти курс..." value="${esc(courseSearch)}" aria-label="Поиск курса"><kbd>⌘ K</kbd></label><div class="filter-list" role="group" aria-label="Фильтр по теме">${categories.map(category => `<button class="filter-chip ${courseFilter === category ? 'selected' : ''}" data-filter="${category}">${category}</button>`).join('')}</div></div><div class="course-grid">${filtered.map(course => renderCourseCard(course)).join('') || `<div class="empty-search"><span>⌕</span><h3>Ничего не нашлось</h3><p>Попробуй изменить запрос или выбрать другую тему.</p><button class="text-button" data-action="clear-search">Сбросить поиск</button></div>`}</div><section class="catalog-note"><span>✦</span><p><b>Можно начать с любого курса.</b> Твой прогресс сохраняется отдельно для каждого маршрута.</p></section>`;
  const input = document.querySelector('#course-search');
  input.addEventListener('input', event => { courseSearch = event.target.value; const start = event.target.selectionStart; renderCourses(); const replacement = document.querySelector('#course-search'); replacement.focus(); replacement.setSelectionRange(start, start); });
}

function renderCourseCard(course) {
  const stats = getCourseStats(course, progress);
  const selected = course.id === progress.selectedCourseId;
  return `<article class="course-card ${selected ? 'selected-course' : ''}"><div class="course-card-top"><div class="course-icon" style="--course-bg:${course.color};--course-accent:${course.accent}">${esc(course.icon)}</div><span class="course-category">${esc(course.category)}</span>${selected ? '<span class="current-course-badge">Твой курс</span>' : ''}</div><h2>${esc(course.title)}</h2><p>${esc(course.description)}</p><div class="course-tags">${course.skills.map(skill => `<span>${esc(skill)}</span>`).join('')}</div><div class="course-card-meta"><span>◉ ${esc(course.level)}</span><span>◷ ${esc(course.duration.split('·')[0].trim())}</span></div><div class="course-progress"><div class="progress-track"><span style="width:${stats.percent}%"></span></div><small>${stats.completed}/${stats.total} уроков · ${stats.percent}%</small></div><button class="button ${selected ? 'button-soft' : 'button-outline'} course-action" data-action="select-course" data-course="${course.id}">${selected ? 'Открыть маршрут' : 'Выбрать курс'} <span>→</span></button></article>`;
}

function renderMascots() {
  root.innerHTML = `<section class="page-heading"><div><p class="eyebrow">ТВОЯ КОМАНДА</p><h1>Выбери спутника</h1><p class="lead">Они будут рядом в путешествии и поддержат на каждом этапе.</p></div><div class="heading-decoration mascot-decoration">✿</div></section><div class="mascot-grid">${mascots.map(item => `<article class="mascot-card ${progress.selectedMascotId === item.id ? 'mascot-selected' : ''}"><div class="mascot-art" style="--mascot-bg:${item.color};--mascot-tone:${item.tone}"><span class="mascot-art-spark spark-a">✦</span><span class="mascot-emoji">${item.icon}</span><span class="mascot-art-spark spark-b">✧</span></div><h2>${item.name}</h2><div class="mascot-kind">${item.kind}</div><p>${item.trait}</p><blockquote>«${item.quote}»</blockquote><button class="button ${progress.selectedMascotId === item.id ? 'button-soft' : 'button-outline'}" data-action="select-mascot" data-mascot="${item.id}">${progress.selectedMascotId === item.id ? 'Твой спутник ✓' : 'Выбрать спутника'}</button></article>`).join('')}</div><p class="privacy-note"><span>♡</span> Выбор спутника не меняет сложность уроков и не даёт игровых преимуществ — он просто будет рядом.</p>`;
}

function renderProfile() {
  const course = selectedCourse();
  const stats = getCourseStats(course, progress);
  const level = getLevel(progress.xp);
  const earned = achievements.filter(item => progress.claimedAchievements.includes(item.id));
  const accuracy = progress.totalAnswers ? Math.round(progress.correctAnswers / progress.totalAnswers * 100) : 0;
  root.innerHTML = `<section class="page-heading"><div><p class="eyebrow">ТВОЁ ПУТЕШЕСТВИЕ</p><h1>Профиль исследователя</h1><p class="lead">Всё, что ты уже открыл и чему научился.</p></div><div class="heading-decoration">◉</div></section><section class="profile-banner"><div class="profile-avatar" style="--mascot-bg:${mascot().color}">${mascot().icon}<span class="profile-level">${level.level}</span></div><div class="profile-info"><span class="eyebrow">УРОВЕНЬ ${level.level} · ${levelLabel(level.level)}</span><h2>${esc(progress.nickname)}</h2><p>В компании ${mascot().name} · на пути к новым открытиям</p></div><button class="button button-outline" data-action="edit-name">Изменить имя</button></section><div class="profile-stats"><div><span>Опыт</span><b>${progress.xp} XP</b><small>${level.remaining} XP до уровня ${level.level + 1}</small><div class="progress-track"><span style="width:${level.current}%"></span></div></div><div><span>Уроки</span><b>${progress.completedLessons.length}</b><small>завершено</small></div><div><span>Точность</span><b>${accuracy}%</b><small>${progress.totalAnswers} ответов</small></div><div><span>Жетоны</span><b>${progress.tokens} ◈</b><small>учебные награды</small></div></div><div class="profile-columns"><section class="profile-block"><div class="section-heading compact"><div><p class="eyebrow">НАГРАДЫ</p><h2>Достижения</h2></div><span class="achievement-count">${earned.length}/${achievements.length}</span></div>${achievements.map(item => `<div class="achievement-row ${progress.claimedAchievements.includes(item.id) ? '' : 'achievement-muted'}"><span class="achievement-icon">${item.icon}</span><span><b>${esc(item.title)}</b><small>${esc(item.description)}</small></span><span>${progress.claimedAchievements.includes(item.id) ? '✓' : '○'}</span></div>`).join('')}</section><section class="profile-block course-summary"><p class="eyebrow">ТЕКУЩЕЕ НАПРАВЛЕНИЕ</p><div class="summary-course-icon" style="--course-bg:${course.color};--course-accent:${course.accent}">${esc(course.icon)}</div><h2>${esc(course.title)}</h2><p>${stats.completed} из ${stats.total} уроков пройдено</p><div class="progress-track"><span style="width:${stats.percent}%"></span></div><button class="text-button" data-view="courses">Выбрать другой курс →</button></section></div><section class="reset-zone"><div><b>Начать заново</b><p>Сбросить имя, выбранный курс и локальный прогресс на этом устройстве.</p></div><button class="button button-danger-outline" data-action="reset">Сбросить демоданные</button></section>`;
}

function levelLabel(level) { return ['Начинающий', 'Любознательный', 'Исследователь', 'Знаток', 'Проводник'][Math.min(level - 1, 4)]; }

function renderSettings() {
  root.innerHTML = `<section class="page-heading"><div><p class="eyebrow">ПОД ТВОИМ КОНТРОЛЕМ</p><h1>Настройки</h1><p class="lead">Настрой интерфейс так, как удобно тебе.</p></div><div class="heading-decoration">⚙</div></section><section class="settings-list"><div class="setting-row"><div class="setting-symbol">◐</div><div class="setting-copy"><b>Внешний вид</b><p>Выбери оформление для учебного пространства.</p></div><div class="segmented-control"><button data-action="theme" data-theme="light" class="${progress.settings.theme === 'light' ? 'chosen' : ''}">Светлая</button><button data-action="theme" data-theme="dark" class="${progress.settings.theme === 'dark' ? 'chosen' : ''}">Тёмная</button></div></div><div class="setting-row"><div class="setting-symbol">≈</div><div class="setting-copy"><b>Уменьшить анимации</b><p>Учитывает системную настройку и сокращает движение интерфейса.</p></div><button class="toggle ${progress.settings.reducedMotion ? 'on' : ''}" role="switch" aria-checked="${progress.settings.reducedMotion}" data-action="toggle-motion"><span></span></button></div><div class="setting-row"><div class="setting-symbol">⌂</div><div class="setting-copy"><b>Локальные данные</b><p>Прогресс хранится в браузере на этом устройстве. Синхронизации с сервером нет.</p></div><span class="local-status"><i></i> Включено</span></div></section><div class="settings-note"><span>✦</span><p>Настройки применяются сразу и сохраняются вместе с демопрогрессом.</p></div>`;
}

function renderLesson() {
  if (!lessonRun) {
    const lessonId = progress.lessonSession?.lessonId || getNextLesson(selectedCourse(), progress)?.id;
    const found = findLesson(lessonId);
    if (!found) { root.innerHTML = `<div class="empty-state"><span>✧</span><h1>Маршрут пока пуст</h1><p>Выбери курс, чтобы начать путешествие.</p><button class="button button-dark" data-view="courses">Открыть каталог</button></div>`; return; }
    progress.selectedCourseId = found.course.id;
    lessonRun = { course: found.course, lesson: found.lesson, step: Math.max(0, Math.min(progress.lessonSession?.step || 0, found.lesson.tasks.length - 1)), selected: '', checked: false, correct: false, finished: false, answers: 0 };
  }
  const run = lessonRun;
  if (run.finished) { renderLessonResult(); return; }
  const task = run.lesson.tasks[run.step];
  const progressPercent = Math.round(run.step / run.lesson.tasks.length * 100);
  root.innerHTML = `<div class="lesson-top"><button class="back-button" data-action="exit-lesson"><span>←</span> Карта маршрута</button><div class="lesson-course-label"><span class="course-mini-icon" style="--course-bg:${run.course.color};--course-accent:${run.course.accent}">${esc(run.course.icon)}</span><span>${esc(run.course.title)}</span></div><div class="lesson-number">${run.step + 1} <span>/ ${run.lesson.tasks.length}</span></div></div><div class="lesson-progress-track"><span style="width:${Math.round((run.step + (run.checked ? 1 : 0)) / run.lesson.tasks.length * 100)}%"></span></div><section class="lesson-content"><div class="lesson-module-label">${esc(run.lesson.moduleTitle)} <span>·</span> ${esc(run.lesson.title)}</div><div class="lesson-mascot-note"><span class="note-avatar" style="--mascot-bg:${mascot().color}">${mascot().icon}</span><span><b>${mascot().name}</b><small>${run.checked ? (run.correct ? 'Отличная работа!' : 'Ошибаться — часть обучения.') : 'Готов(а) к новому шагу?'}</small></span></div><h1>${esc(task.prompt)}</h1><p class="task-hint">${task.type === 'input' ? 'Введи свой ответ в поле ниже.' : 'Выбери один вариант ответа.'}</p>${task.type === 'choice' ? `<div class="answer-options">${task.options.map(option => `<button class="answer-option ${run.selected === option ? 'chosen' : ''} ${run.checked && option === task.answer ? 'answer-correct' : ''} ${run.checked && run.selected === option && !run.correct ? 'answer-wrong' : ''}" data-action="answer-choice" data-option="${esc(option)}" ${run.checked ? 'disabled' : ''}><span class="option-key">${String.fromCharCode(65 + task.options.indexOf(option))}</span><span>${esc(option)}</span><span class="option-status">${run.checked && option === task.answer ? '✓' : run.checked && run.selected === option ? '×' : ''}</span></button>`).join('')}</div>` : `<label class="answer-input-wrap"><span>Твой ответ</span><input id="answer-input" type="text" placeholder="${esc(task.placeholder || 'Напиши ответ')}" value="${esc(run.selected)}" ${run.checked ? 'disabled' : ''} autocomplete="off"><span class="input-hint">Можно не переживать из-за регистра.</span></label>`}${run.checked ? `<div class="answer-feedback ${run.correct ? 'feedback-correct' : 'feedback-wrong'}"><span class="feedback-symbol">${run.correct ? '✓' : '↻'}</span><div><b>${run.correct ? 'Верно! Хорошая работа.' : 'Пока не совпало — попробуй ещё раз.'}</b><p>${esc(task.explanation)}</p>${!run.correct ? `<button class="text-button hint-button" data-action="show-hint">Показать подсказку</button>` : ''}</div></div>` : ''}<div class="lesson-footer"><span>Задание ${run.step + 1} из ${run.lesson.tasks.length}</span>${run.checked && !run.correct ? `<button class="button button-outline" data-action="retry">Попробовать ещё раз</button>` : `<button class="button button-dark" data-action="${run.checked ? 'next-task' : 'check-answer'}" ${!run.checked && !run.selected.trim() ? 'disabled' : ''}>${run.checked ? (run.step === run.lesson.tasks.length - 1 ? 'Завершить урок' : 'Следующий вопрос') : 'Проверить ответ'} <span>→</span></button>`}</div></section>`;
  if (run.selected && task.type === 'input' && !run.checked) { const input = document.querySelector('#answer-input'); input?.focus(); input?.setSelectionRange(input.value.length, input.value.length); }
}

function renderLessonResult() {
  const run = lessonRun;
  root.innerHTML = `<section class="lesson-result"><div class="result-sparkle sparkle-left">✧</div><div class="result-orbit"><span>${mascot().icon}</span></div><p class="eyebrow">ЕЩЁ ОДИН ШАГ ПОЗАДИ</p><h1>Урок завершён!</h1><p class="result-lead">${mascot().name} гордится тобой. Каждый ответ помог сделать тему понятнее.</p><div class="result-rewards"><div><span>✦</span><b>+${run.awarded ? 25 : 0} XP</b><small>опыт</small></div><div><span>◈</span><b>+${run.awarded ? 5 : 0}</b><small>жетонов</small></div><div><span>✓</span><b>${run.answers}/${run.lesson.tasks.length}</b><small>ответов верно</small></div></div>${run.newAchievements?.length ? `<div class="new-achievements">${run.newAchievements.map(item => `<span>${item.icon} ${esc(item.title)}</span>`).join('')}</div>` : ''}<button class="button button-dark result-button" data-action="finish-lesson">Вернуться к маршруту <span>→</span></button>${run.levelUp ? '<p class="level-up-message">✧ Новый уровень — поздравляем!</p>' : ''}<button class="text-button result-secondary" data-action="another-lesson">Следующий урок</button></section>`;
}

function pluralize(count, one, few, many) {
  const mod10 = count % 10, mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function confirmModal(title, message, confirmLabel, action) {
  modalBackdrop.hidden = false;
  modalBackdrop.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="modal-close" data-action="close-modal" aria-label="Закрыть">×</button><span class="modal-symbol">✦</span><h2 id="modal-title">${esc(title)}</h2><p>${esc(message)}</p><div class="modal-actions"><button class="button button-outline" data-action="close-modal">Отмена</button><button class="button ${action === 'reset-confirm' ? 'button-danger' : 'button-dark'}" data-action="${action}">${esc(confirmLabel)}</button></div></div>`;
  modalBackdrop.querySelector('.modal-close').focus();
}

function closeModal() { modalBackdrop.hidden = true; modalBackdrop.innerHTML = ''; }

function startLesson(lessonId) {
  const found = findLesson(lessonId);
  if (!found) { toast('Не удалось найти этот урок. Выбери урок на карте маршрута.', 'error'); return; }
  const unlocked = getUnlockedLessonIds(found.course, progress);
  if (!unlocked.has(lessonId)) { toast('Этот этап откроется после предыдущего урока.', 'error'); return; }
  progress.selectedCourseId = found.course.id;
  progress.startedCourses = [...new Set([...progress.startedCourses, found.course.id])];
  lessonRun = { course: found.course, lesson: found.lesson, step: progress.lessonSession?.lessonId === lessonId ? Math.max(0, Math.min(progress.lessonSession.step, found.lesson.tasks.length - 1)) : 0, selected: '', checked: false, correct: false, finished: false, answers: 0 };
  view = 'lesson';
  persist();
  render();
}

function checkAnswer() {
  if (!lessonRun || lessonRun.checked) return;
  const task = lessonRun.lesson.tasks[lessonRun.step];
  const response = lessonRun.selected.trim();
  if (!response) { toast('Выбери или введи ответ, прежде чем проверять.', 'error'); return; }
  const correct = task.type === 'input' ? response.toLocaleLowerCase() === task.answer.toLocaleLowerCase() : response === task.answer;
  lessonRun.checked = true;
  lessonRun.correct = correct;
  lessonRun.answers += correct ? 1 : 0;
  recordAnswer(progress, correct, task.id);
  progress.lessonSession = { lessonId: lessonRun.lesson.id, step: lessonRun.step };
  persist();
  renderLesson();
}

function advanceTask() {
  const run = lessonRun;
  if (!run?.checked || !run.correct) return;
  if (run.step < run.lesson.tasks.length - 1) {
    run.step += 1; run.selected = ''; run.checked = false; run.correct = false;
    progress.lessonSession = { lessonId: run.lesson.id, step: run.step };
    persist(); renderLesson();
  } else {
    const result = completeLesson(progress, run.lesson.id);
    run.awarded = result.awarded;
    run.newAchievements = result.achievements;
    run.levelUp = result.levelUp;
    run.finished = true;
    progress.lessonSession = null;
    persist(); renderLesson();
  }
}

function finishLesson() { view = 'home'; lessonRun = null; render(); }

function selectCourse(courseId) {
  if (!courses.some(course => course.id === courseId)) { toast('Не удалось открыть этот курс.', 'error'); return; }
  progress.selectedCourseId = courseId;
  progress.startedCourses = [...new Set([...progress.startedCourses, courseId])];
  view = 'home'; persist('Курс выбран. Маршрут уже ждёт тебя!'); render();
}

function selectMascot(mascotId) {
  if (!mascots.some(item => item.id === mascotId)) return;
  progress.selectedMascotId = mascotId;
  persist(`${mascot().name} теперь твой спутник.`);
  renderMascots();
}

function resetDemo() {
  progress = createInitialProgress();
  lessonRun = null;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* persistence will report the issue below */ }
  closeModal();
  view = 'home'; render(); toast('Демоданные сброшены. Можно начать новое путешествие.');
}

document.addEventListener('click', event => {
  const viewButton = event.target.closest('[data-view]');
  if (viewButton) { navigate(viewButton.dataset.view); return; }
  const filter = event.target.closest('[data-filter]');
  if (filter) { courseFilter = filter.dataset.filter; renderCourses(); return; }
  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) return;
  const { action } = actionButton.dataset;
  if (action === 'continue-course') { const next = getNextLesson(selectedCourse(), progress); if (next) startLesson(next.id); else toast('Ты прошёл все доступные уроки этого маршрута.'); }
  else if (action === 'open-lesson') startLesson(actionButton.dataset.lesson);
  else if (action === 'select-course') selectCourse(actionButton.dataset.course);
  else if (action === 'select-mascot') selectMascot(actionButton.dataset.mascot);
  else if (action === 'answer-choice' && lessonRun && !lessonRun.checked) { lessonRun.selected = actionButton.dataset.option; renderLesson(); }
  else if (action === 'check-answer') checkAnswer();
  else if (action === 'next-task') advanceTask();
  else if (action === 'retry') { lessonRun.checked = false; lessonRun.correct = false; lessonRun.selected = ''; renderLesson(); }
  else if (action === 'show-hint') toast(`Подсказка: ${lessonRun.lesson.tasks[lessonRun.step].answer}`);
  else if (action === 'exit-lesson') confirmModal('Выйти из урока?', 'Текущий шаг сохранится, и ты сможешь вернуться к нему позже.', 'Выйти', 'exit-lesson-confirm');
  else if (action === 'exit-lesson-confirm') { progress.lessonSession = lessonRun ? { lessonId: lessonRun.lesson.id, step: lessonRun.step } : progress.lessonSession; persist(); closeModal(); navigate('home'); }
  else if (action === 'finish-lesson') finishLesson();
  else if (action === 'another-lesson') { const next = getNextLesson(selectedCourse(), progress); if (next && !progress.completedLessons.includes(next.id)) startLesson(next.id); else finishLesson(); }
  else if (action === 'resume' && progress.lessonSession) startLesson(progress.lessonSession.lessonId);
  else if (action === 'clear-search') { courseSearch = ''; courseFilter = 'Все курсы'; renderCourses(); }
  else if (action === 'edit-name') editName();
  else if (action === 'reset') confirmModal('Сбросить демоданные?', 'Имя, выбор курса, маскот, учебные ответы и прогресс на этом устройстве будут удалены. Это действие нельзя отменить.', 'Сбросить данные', 'reset-confirm');
  else if (action === 'reset-confirm') resetDemo();
  else if (action === 'close-modal') closeModal();
  else if (action === 'theme') { progress.settings.theme = actionButton.dataset.theme; persist('Оформление обновлено.'); renderSettings(); }
  else if (action === 'toggle-motion') { progress.settings.reducedMotion = !progress.settings.reducedMotion; persist('Настройка анимаций обновлена.'); renderSettings(); }
  else if (action === 'start-welcome' || action === 'skip-welcome') finishWelcome('courses');
  else if (action === 'dismiss-toast') { clearTimeout(toastTimer); toastRegion.innerHTML = ''; }
});

function editName() {
  modalBackdrop.hidden = false;
  modalBackdrop.innerHTML = `<form class="modal" id="name-form" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button type="button" class="modal-close" data-action="close-modal" aria-label="Закрыть">×</button><span class="modal-symbol">◉</span><h2 id="modal-title">Как к тебе обращаться?</h2><p>Имя будет видно только в этом локальном профиле.</p><label class="answer-input-wrap"><span>Имя</span><input id="nickname-input" maxlength="24" value="${esc(progress.nickname)}" required></label><div class="modal-actions"><button type="button" class="button button-outline" data-action="close-modal">Отмена</button><button class="button button-dark" type="submit">Сохранить</button></div></form>`;
  const input = document.querySelector('#nickname-input'); input.focus(); input.select();
  document.querySelector('#name-form').addEventListener('submit', event => {
    event.preventDefault();
    const name = input.value.trim();
    if (!name) { toast('Введи имя из одного или нескольких символов.', 'error'); input.focus(); return; }
    progress.nickname = name; closeModal(); persist('Имя профиля обновлено.'); renderProfile();
  });
}

document.addEventListener('input', event => {
  if (event.target.id === 'answer-input' && lessonRun && !lessonRun.checked) {
    lessonRun.selected = event.target.value;
    const button = document.querySelector('[data-action="check-answer"]'); if (button) button.disabled = !lessonRun.selected.trim();
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !modalBackdrop.hidden) closeModal();
  if (event.key === 'Enter' && event.target.id === 'answer-input' && !lessonRun?.checked) { event.preventDefault(); checkAnswer(); }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault(); navigate('courses'); const input = document.querySelector('#course-search'); input?.focus();
  }
});

modalBackdrop.addEventListener('click', event => { if (event.target === modalBackdrop) closeModal(); });
document.querySelector('#footer-year').textContent = new Date().getFullYear();
updateShell();
render();

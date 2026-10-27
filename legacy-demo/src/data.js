export const APP_NAME = 'KiraQuest';

export const mascots = [
  { id: 'miko', name: 'Мико', kind: 'кошка', icon: '🐈', color: '#eadfff', tone: '#7357c8', trait: 'Любознательная и заботливая', quote: 'Любой сложный вопрос можно разобрать на маленькие шаги.' },
  { id: 'ren', name: 'Рэн', kind: 'лисёнок', icon: '🦊', color: '#ffe5d7', tone: '#c86637', trait: 'Энергичный и сообразительный', quote: 'Давай посмотрим на задачу с другой стороны!' },
  { id: 'yuki', name: 'Юки', kind: 'снежный дух', icon: '❄️', color: '#dff2ff', tone: '#4b8bb2', trait: 'Спокойный и терпеливый', quote: 'Не торопись. У каждого шага есть своё время.' },
  { id: 'piko', name: 'Пико', kind: 'робот', icon: '🤖', color: '#d9f5ef', tone: '#328f7b', trait: 'Точный и любознательный', quote: 'Проверим гипотезу и посмотрим, что получится.' },
  { id: 'kumo', name: 'Кумо', kind: 'дракончик', icon: '🐉', color: '#eee4ff', tone: '#7953b6', trait: 'Добрый и смелый', quote: 'Сложная тема — это просто новое приключение.' },
  { id: 'tori', name: 'Тори', kind: 'птичка-комета', icon: '🐦', color: '#ffe5eb', tone: '#c75f7d', trait: 'Оптимистичная исследовательница', quote: 'Впереди столько интересного. Начнём с одного шага?' }
];

export const courses = [
  { id: 'english-start', title: 'Английский без страха', category: 'Языки', icon: 'Aa', color: '#e9e3ff', accent: '#765bd4', description: 'Первые фразы, полезные слова и уверенность в разговоре.', level: 'С нуля', duration: '2 главы · 4 урока', skills: ['Знакомство', 'Базовые фразы'], modules: [
    { id: 'hello', title: 'Привет, мир!', lessons: [
      { id: 'hello-1', title: 'Знакомимся', duration: '4 мин', tasks: [
        { id: 'en-1', type: 'choice', prompt: 'Как по-английски сказать «Привет»?', options: ['Goodbye', 'Hello', 'Please'], answer: 'Hello', explanation: 'Hello — универсальное приветствие. Его можно использовать и при знакомстве, и в начале разговора.' },
        { id: 'en-2', type: 'choice', prompt: 'Выбери перевод фразы «My name is Sam».', options: ['Меня зовут Сэм', 'Я из Сэма', 'До встречи, Сэм'], answer: 'Меня зовут Сэм', explanation: 'My name is… буквально означает «Моё имя…» — так мы представляемся.' },
        { id: 'en-3', type: 'input', prompt: 'Впиши английское слово «спасибо».', answer: 'thank you', placeholder: 'Твой ответ', explanation: 'Thank you — вежливое и распространённое «спасибо».' }
      ] },
      { id: 'hello-2', title: 'Вежливые слова', duration: '5 мин', tasks: [
        { id: 'en-4', type: 'choice', prompt: 'Как ответить на «Thank you»?', options: ['You’re welcome', 'Good morning', 'Excuse me'], answer: 'You’re welcome', explanation: 'You’re welcome — «пожалуйста» в ответ на благодарность.' },
        { id: 'en-5', type: 'choice', prompt: 'Что означает «Please»?', options: ['Пожалуйста (просьба)', 'Пока', 'Извините'], answer: 'Пожалуйста (просьба)', explanation: 'Please добавляют к просьбе, чтобы она звучала вежливо.' }
      ] }
    ] },
    { id: 'first-words', title: 'Первые слова', lessons: [
      { id: 'words-1', title: 'Вещи вокруг нас', duration: '4 мин', tasks: [
        { id: 'en-6', type: 'choice', prompt: 'Как переводится «book»?', options: ['Стол', 'Книга', 'Дверь'], answer: 'Книга', explanation: 'Book — книга. Попробуй заметить это слово на обложке.' },
        { id: 'en-7', type: 'input', prompt: 'Напиши английское слово «вода».', answer: 'water', placeholder: 'Твой ответ', explanation: 'Water произносится примерно как «уотэ» и означает «вода».' }
      ] },
      { id: 'words-2', title: 'Цвета и предметы', duration: '4 мин', tasks: [
        { id: 'en-8', type: 'choice', prompt: 'Что означает слово «blue»?', options: ['Зелёный', 'Синий', 'Красный'], answer: 'Синий', explanation: 'Blue — синий или голубой. Например, the blue sky — голубое небо.' },
        { id: 'en-9', type: 'choice', prompt: 'Выбери английское слово «дом».', options: ['Home', 'Water', 'Book'], answer: 'Home', explanation: 'Home — дом как место, где ты живёшь и чувствуешь себя дома.' }
      ] }
    ] }
  ] },
  { id: 'web-start', title: 'Веб-разработка с нуля', category: 'Технологии', icon: '</>', color: '#dcf2ee', accent: '#278675', description: 'Разберись, как устроены страницы, и создай свой первый сайт.', level: 'Начальный', duration: '2 главы · 4 урока', skills: ['HTML', 'Основы веба'], modules: [
    { id: 'web-foundation', title: 'Как устроен веб', lessons: [
      { id: 'web-1', title: 'Из чего состоит страница', duration: '5 мин', tasks: [
        { id: 'web-q1', type: 'choice', prompt: 'Какой язык задаёт структуру веб-страницы?', options: ['CSS', 'HTML', 'PNG'], answer: 'HTML', explanation: 'HTML размечает смысловые части: заголовки, абзацы, ссылки и изображения.' },
        { id: 'web-q2', type: 'choice', prompt: 'За что отвечает CSS?', options: ['За внешний вид страницы', 'За хранение паролей', 'За подключение к интернету'], answer: 'За внешний вид страницы', explanation: 'CSS управляет оформлением: цветами, размерами, отступами и расположением.' },
        { id: 'web-q3', type: 'input', prompt: 'Как называется язык разметки веб-страниц? Напиши заглавными буквами.', answer: 'HTML', placeholder: 'Твой ответ', explanation: 'HTML — язык разметки, который задаёт структуру содержимого.' }
      ] },
      { id: 'web-2', title: 'Первый заголовок', duration: '4 мин', tasks: [
        { id: 'web-q4', type: 'choice', prompt: 'Какой тег создаёт основной заголовок?', options: ['<h1>', '<p>', '<img>'], answer: '<h1>', explanation: 'Тег h1 обозначает главный заголовок страницы.' },
        { id: 'web-q5', type: 'choice', prompt: 'Какой тег используют для обычного абзаца?', options: ['<p>', '<button>', '<title>'], answer: '<p>', explanation: 'Тег p группирует текст в абзац.' }
      ] }
    ] },
    { id: 'first-page', title: 'Собираем страницу', lessons: [
      { id: 'web-3', title: 'Ссылки и изображения', duration: '6 мин', tasks: [
        { id: 'web-q6', type: 'choice', prompt: 'Какой тег создаёт ссылку?', options: ['<a>', '<div>', '<h2>'], answer: '<a>', explanation: 'Тег a создаёт ссылку. Адрес указывают в атрибуте href.' }
      ] },
      { id: 'web-4', title: 'Добавляем стили', duration: '5 мин', tasks: [
        { id: 'web-q7', type: 'choice', prompt: 'Какой CSS-свойством меняют цвет текста?', options: ['color', 'size', 'font'], answer: 'color', explanation: 'Свойство color задаёт цвет текста; например, color: navy.' },
        { id: 'web-q8', type: 'choice', prompt: 'Что добавляют в HTML, чтобы подключить файл стилей?', options: ['Тег link', 'Тег table', 'Тег footer'], answer: 'Тег link', explanation: 'Тег link в секции head связывает страницу с внешним CSS-файлом.' }
      ] }
    ] }
  ] },
  { id: 'math-start', title: 'Математика в жизни', category: 'Математика', icon: '＋', color: '#fff0d9', accent: '#c48527', description: 'Тренируй счёт и находи математику в повседневных задачах.', level: 'С нуля', duration: '2 главы · 4 урока', skills: ['Счёт', 'Логика'], modules: [
    { id: 'numbers', title: 'Считаем уверенно', lessons: [
      { id: 'math-1', title: 'Складываем вместе', duration: '4 мин', tasks: [
        { id: 'math-q1', type: 'choice', prompt: 'Сколько будет 7 + 5?', options: ['11', '12', '13'], answer: '12', explanation: 'Если к 7 прибавить ещё 5, получится 12.' },
        { id: 'math-q2', type: 'input', prompt: 'У тебя 10 яблок, ты отдал 3. Сколько осталось?', answer: '7', placeholder: 'Число', explanation: '10 − 3 = 7 яблок.' }
      ] },
      { id: 'math-2', title: 'Считаем в уме', duration: '4 мин', tasks: [
        { id: 'math-q3', type: 'choice', prompt: 'Сколько будет 9 + 6?', options: ['14', '15', '16'], answer: '15', explanation: '9 + 6 = 15. Можно прибавить сначала 1 до 10, а затем оставшиеся 5.' },
        { id: 'math-q4', type: 'input', prompt: 'В автобусе было 8 человек, вошли ещё 4. Сколько стало?', answer: '12', placeholder: 'Число', explanation: 'К восьми пассажирам добавили четырёх: 8 + 4 = 12.' }
      ] }
    ] }
    ,{ id: 'patterns', title: 'Замечаем закономерности', lessons: [
      { id: 'math-3', title: 'Продолжи ряд', duration: '4 мин', tasks: [
        { id: 'math-q5', type: 'choice', prompt: 'Какое число продолжит ряд: 2, 4, 6, …?', options: ['7', '8', '10'], answer: '8', explanation: 'Каждый раз прибавляем 2, поэтому после 6 идёт 8.' },
        { id: 'math-q6', type: 'choice', prompt: 'Какое число делится на 2 без остатка?', options: ['7', '9', '12'], answer: '12', explanation: 'Чётное число делится на 2. 12 ÷ 2 = 6.' }
      ] },
      { id: 'math-4', title: 'Логика на каждый день', duration: '5 мин', tasks: [
        { id: 'math-q7', type: 'choice', prompt: 'Если все чашки стоят на полке, а синяя чашка — одна из них, где синяя чашка?', options: ['На полке', 'Под столом', 'Мы не знаем'], answer: 'На полке', explanation: 'Синяя чашка принадлежит множеству чашек, которые стоят на полке.' },
        { id: 'math-q8', type: 'input', prompt: 'У квадрата 4 стороны. Сколько сторон у двух квадратов вместе?', answer: '8', placeholder: 'Число', explanation: 'У каждого квадрата 4 стороны, значит у двух: 4 + 4 = 8.' }
      ] }
    ] }
  ] },
  { id: 'coding-start', title: 'Логика и программирование', category: 'Технологии', icon: '{ }', color: '#fbe1e6', accent: '#bf5d71', description: 'Первые алгоритмы и понятные задачи для будущих разработчиков.', level: 'Начальный', duration: '2 главы · 4 урока', skills: ['Алгоритмы', 'Логика'], modules: [
    { id: 'logic', title: 'Думать как программист', lessons: [
      { id: 'code-1', title: 'Последовательность действий', duration: '5 мин', tasks: [
        { id: 'code-q1', type: 'choice', prompt: 'Что точнее всего описывает алгоритм?', options: ['Случайный набор слов', 'Понятная последовательность шагов', 'Цветная картинка'], answer: 'Понятная последовательность шагов', explanation: 'Алгоритм — это конечная последовательность шагов для решения задачи.' },
        { id: 'code-q2', type: 'choice', prompt: 'Что нужно сделать сначала, чтобы заварить чай?', options: ['Налить воду в чашку', 'Вскипятить воду', 'Убрать чашку'], answer: 'Вскипятить воду', explanation: 'В алгоритме важен порядок: сначала подготовим горячую воду.' }
      ] },
      { id: 'code-2', title: 'Шаг за шагом', duration: '4 мин', tasks: [
        { id: 'code-q3', type: 'choice', prompt: 'Что делает условие в алгоритме?', options: ['Выбирает путь в зависимости от ситуации', 'Меняет цвет экрана', 'Сохраняет все файлы'], answer: 'Выбирает путь в зависимости от ситуации', explanation: 'Условие помогает выполнить один из вариантов действий в зависимости от ответа.' },
        { id: 'code-q4', type: 'input', prompt: 'Как называется повторение действий в программе? Напиши слово.', answer: 'цикл', placeholder: 'Твой ответ', explanation: 'Цикл повторяет действие или группу действий, пока выполняется заданное правило.' }
      ] }
    ] }
    ,{ id: 'first-program', title: 'Первая программа', lessons: [
      { id: 'code-3', title: 'Команды и результат', duration: '5 мин', tasks: [
        { id: 'code-q5', type: 'choice', prompt: 'Как называют отдельное указание компьютеру?', options: ['Команда', 'Обложка', 'Палитра'], answer: 'Команда', explanation: 'Команда — отдельное указание, которое программа выполняет.' },
        { id: 'code-q6', type: 'choice', prompt: 'Что такое ошибка в программе?', options: ['Проблема, которую можно найти и исправить', 'Обязательный финал', 'Награда за запуск'], answer: 'Проблема, которую можно найти и исправить', explanation: 'Ошибки — обычная часть разработки. Важно понять причину и исправить её.' }
      ] },
      { id: 'code-4', title: 'Проверяем решение', duration: '4 мин', tasks: [
        { id: 'code-q7', type: 'choice', prompt: 'Зачем проверять программу после изменений?', options: ['Чтобы убедиться, что она работает ожидаемо', 'Чтобы изменить её название', 'Чтобы скрыть команды'], answer: 'Чтобы убедиться, что она работает ожидаемо', explanation: 'Проверка показывает, приводит ли программа к нужному результату.' },
        { id: 'code-q8', type: 'input', prompt: 'Как называют результат выполнения программы?', answer: 'вывод', placeholder: 'Твой ответ', explanation: 'Вывод — то, что программа показывает после выполнения команд.' }
      ] }
    ] }
  ] }
];

export const achievements = [
  { id: 'first-lesson', title: 'Первый шаг', description: 'Заверши первый урок', icon: '✦', condition: p => p.completedLessons.length >= 1 },
  { id: 'first-module', title: 'Первая глава', description: 'Заверши все уроки одной главы', icon: '⌘', condition: p => (p.completedModules || []).length >= 1 },
  { id: 'three-lessons', title: 'Уверенный темп', description: 'Заверши три урока', icon: '↗', condition: p => p.completedLessons.length >= 3 },
  { id: 'curious', title: 'Любопытный ум', description: 'Ответь на десять заданий', icon: '◈', condition: p => p.totalAnswers >= 10 },
  { id: 'explorer', title: 'Исследователь', description: 'Попробуй два курса', icon: '◇', condition: p => p.startedCourses.length >= 2 },
  { id: 'first-repeat', title: 'Вернулся к теме', description: 'Заверши повтор уже пройденного урока', icon: '↻', condition: p => p.repeatCompletions >= 1 }
];

export function flattenLessons(course) {
  return course.modules.flatMap(module => module.lessons.map(lesson => ({ ...lesson, moduleId: module.id, moduleTitle: module.title })));
}

export function findLesson(lessonId) {
  for (const course of courses) {
    const lesson = flattenLessons(course).find(item => item.id === lessonId);
    if (lesson) return { course, lesson };
  }
  return null;
}

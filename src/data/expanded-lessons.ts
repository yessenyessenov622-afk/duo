export type ExpandedTask = {
  prompt: string;
  type: "choice" | "text" | "order" | "budget" | "schedule";
  options?: string[];
  answer: string | string[];
  accepted?: string[];
  hint: string;
  explanation: string;
  code?: string;
  budget?: { total: number; allocations: { id: string; label: string; minimum: number; initial: number }[] };
  schedule?: { dayStart: number; dayEnd: number; events: { id: string; title: string; duration: number; initialStart: number; latestEnd?: number }[] };
};
export type ExpandedLesson = { level: number; introduction: string[]; example: string; tasks: ExpandedTask[] };
import { lifeSkillsLessons } from "@/src/data/life-skills";

/** Each exercise is authored for the lesson; no generic filler questions are generated. */
export const expandedLessons: Record<string, ExpandedLesson> = {
  ...lifeSkillsLessons,
  "web-css-1": { level:1, introduction:["CSS-правило связывает селектор и объявления. Селектор p выбирает абзацы, а в фигурных скобках записывают свойства и значения.", "В записи color: blue свойство color задаёт цвет текста, значение blue означает синий. Объявление обычно заканчивают точкой с запятой."], example:"p { color: blue; }", tasks:[
    {type:"choice",prompt:"Что выбирает селектор p?",options:["Абзацы","Только картинки","Файлы"],answer:"Абзацы",hint:"В HTML абзац обозначают p.",explanation:"Селектор p выбирает элементы p."},
    {type:"text",prompt:"Вставь свойство: p { ___: blue; }",answer:"color",hint:"Оно задаёт цвет текста.",explanation:"Свойство color задаёт цвет текста."},
    {type:"order",prompt:"Собери правило CSS.",options:["}","p", "{", "color: blue;"],answer:["p","{","color: blue;","}"],hint:"Сначала селектор и открывающая скобка.",explanation:"Получается p { color: blue; }."},
    {type:"choice",prompt:"Что означает blue в color: blue?",options:["Значение цвета","Селектор","Название HTML-тега"],answer:"Значение цвета",hint:"Оно стоит после двоеточия.",explanation:"Blue — значение свойства color."},
    {type:"text",prompt:"Какой знак разделяет свойство и значение?",answer:":",hint:"Это двоеточие.",explanation:"Между свойством и значением ставят двоеточие."},
    {type:"choice",prompt:"Какое правило сделает текст абзацев синим?",options:["p { color: blue; }","p { blue: color; }","<p>blue</p>"],answer:"p { color: blue; }",hint:"Используй color: blue внутри скобок.",explanation:"Селектор p выбирает абзацы, color задаёт цвет текста."},
  ] },
  "web-css-2": { level:1, introduction:["Класс в HTML помогает выбрать группу элементов: <p class=\"note\">Текст</p>. В CSS селектор класса начинается с точки: .note.", "Внешнюю таблицу стилей обычно подключают в head страницы с помощью link: <link rel=\"stylesheet\" href=\"style.css\">. Путь href должен вести к существующему файлу."], example:".note { color: green; }", tasks:[
    {type:"choice",prompt:"Как записать селектор класса note?",options:[".note","#note","note()"],answer:".note",hint:"Перед именем класса ставится точка.",explanation:".note выбирает элементы с классом note."},
    {type:"text",prompt:"Вставь имя атрибута: <p ___=\"note\">Текст</p>",answer:"class",hint:"Атрибут задаёт класс.",explanation:"Атрибут class задаёт класс элемента."},
    {type:"order",prompt:"Собери CSS-правило для класса.",options:["}",".note","{","color: green;"],answer:[".note","{","color: green;","}"],hint:"Начни с .note.",explanation:".note { color: green; } задаёт цвет текста элементов класса."},
    {type:"choice",prompt:"Какой тег подключает внешний CSS?",options:["link","img","p"],answer:"link",hint:"У него есть rel и href.",explanation:"link с rel=stylesheet подключает таблицу стилей."},
    {type:"text",prompt:"Какой атрибут link задаёт путь к файлу?",answer:"href",hint:"Такой же атрибут у ссылки a.",explanation:"В href указывают путь к файлу стилей."},
    {type:"choice",prompt:"Стиль не появился. Что проверить сначала?",options:["Путь href и имя файла","Только цвет картинки","Название браузера"],answer:"Путь href и имя файла",hint:"Файл должен находиться по указанному пути.",explanation:"Проверь соответствие href и расположения файла."},
  ] },
  "math-fraction-1": { level:1, introduction:["Дробь показывает часть целого, разделённого на равные части. В записи 1/2 знаменатель 2 показывает количество равных частей, числитель 1 — сколько частей взяли.", "В дроби 3/4 целое разделено на четыре равные части и взяты три. Части должны быть равными: иначе обычная запись дроби не описывает долю целого."], example:"1/2 пиццы — одна из двух равных половин.", tasks:[
    {type:"choice",prompt:"Что означает 1/2?",options:["Одна из двух равных частей","Две из одной части","Два целых"],answer:"Одна из двух равных частей",hint:"Знаменатель показывает число равных частей.",explanation:"1/2 — одна из двух равных частей."},
    {type:"text",prompt:"На сколько равных частей разделено целое в дроби 3/4?",answer:"4",accepted:["4","четыре"],hint:"Посмотри на знаменатель.",explanation:"Знаменатель 4 обозначает четыре равные части."},
    {type:"choice",prompt:"Сколько частей взяли в 3/4?",options:["3","4","7"],answer:"3",hint:"Посмотри на числитель.",explanation:"Числитель 3 показывает три взятые части."},
    {type:"order",prompt:"Расположи шаги для понимания дроби.",options:["Определить взятые части","Разделить целое на равные части"],answer:["Разделить целое на равные части","Определить взятые части"],hint:"Сначала целое разделяют.",explanation:"Сначала определяют равные части, затем число взятых."},
    {type:"choice",prompt:"Пирог разделён на четыре равные части, взяли одну. Какая доля взята?",options:["1/4","4/1","1/2"],answer:"1/4",hint:"Одна часть из четырёх.",explanation:"Одна из четырёх частей — 1/4."},
    {type:"text",prompt:"Запиши дробь: две равные части из пяти.",answer:"2/5",hint:"Сначала число взятых частей.",explanation:"Две из пяти равных частей записывают 2/5."},
  ] },
  "math-fraction-2": { level:1, introduction:["Если знаменатели одинаковые, части имеют одинаковый размер. Больше та дробь, у которой больше числитель: 3/4 больше 1/4.", "Если числители и знаменатели одинаковы, дроби равны. Это правило сравнения применяется к положительным дробям с одинаковым знаменателем."], example:"2/5 < 4/5: две одинаковые пятые части меньше четырёх.", tasks:[
    {type:"choice",prompt:"Какая дробь больше?",options:["3/4","1/4","Они равны"],answer:"3/4",hint:"Сравни числители.",explanation:"При одинаковых знаменателях 3/4 больше 1/4."},
    {type:"text",prompt:"Вставь знак: 2/5 ___ 4/5.",answer:"<",hint:"Две части меньше четырёх.",explanation:"2/5 меньше 4/5."},
    {type:"order",prompt:"Расположи дроби от меньшей к большей.",options:["4/5","1/5","3/5"],answer:["1/5","3/5","4/5"],hint:"Знаменатели одинаковы; сравни числители.",explanation:"1 меньше 3, а 3 меньше 4."},
    {type:"choice",prompt:"Равны ли 2/3 и 2/3?",options:["Да","Нет, первая больше","Нет, вторая больше"],answer:"Да",hint:"Сравни обе записи.",explanation:"Числители и знаменатели совпадают."},
    {type:"text",prompt:"Какая дробь больше: 1/6 или 5/6? Напиши дробь.",answer:"5/6",hint:"Пять одинаковых шестых больше одной.",explanation:"5/6 больше 1/6."},
    {type:"choice",prompt:"У Ани 2/8 пирога, у Бека 3/8 такого же пирога. У кого больше?",options:["У Бека","У Ани","Поровну"],answer:"У Бека",hint:"Сравни 2/8 и 3/8.",explanation:"3/8 больше 2/8 при одинаковых размерах пирога."},
  ] },
  "english-numbers-1": {
    level: 1, introduction: ["Числа one, two, three, four, five означают один, два, три, четыре, пять. Их можно использовать, когда считаешь предметы.", "После числа больше одного к существительному часто добавляется окончание -s: one book, two books. В этом уроке используются обычные формы без исключений."], example: "One book, three books. — Одна книга, три книги.", tasks: [
      {type:"choice",prompt:"Как сказать «три»?",options:["three","two","five"],answer:"three",hint:"Слово начинается с th.",explanation:"Three означает три."},
      {type:"text",prompt:"Напиши по-английски число «два».",answer:"two",hint:"Начинается с t.",explanation:"Two означает два."},
      {type:"order",prompt:"Расположи числа от меньшего к большему.",options:["five","one","three"],answer:["one","three","five"],hint:"Начни с одного.",explanation:"One — один, three — три, five — пять."},
      {type:"choice",prompt:"Как сказать «четыре книги»?",options:["four books","one book","five books"],answer:"four books",hint:"Четыре — four.",explanation:"Four books — четыре книги."},
      {type:"text",prompt:"Вставь число: one, two, ___, four.",answer:"three",hint:"Это число после двух.",explanation:"После two идёт three."},
      {type:"choice",prompt:"Ты видишь пять ручек. Как их назвать?",options:["five pens","two pens","one pen"],answer:"five pens",hint:"Пять — five.",explanation:"Five pens — пять ручек."},
    ],
  },
  "english-time-1": {
    level: 1, introduction: ["Чтобы спросить время, скажи What time is it? — «Который час?». Для целого часа можно ответить It's three o'clock — «Три часа».", "O'clock используется, когда минут нет. Названия чисел one, two, three, four и five помогут назвать часы от одного до пяти."], example: "What time is it? — It's five o'clock. — Пять часов.", tasks: [
      {type:"choice",prompt:"Как спросить «Который час?»",options:["What time is it?","What is your name?","Where is the book?"],answer:"What time is it?",hint:"В вопросе есть слово time.",explanation:"What time is it? — вопрос о времени."},
      {type:"text",prompt:"Вставь число: It's ___ o'clock. — Два часа.",answer:"two",hint:"Два — two.",explanation:"It's two o'clock — два часа."},
      {type:"order",prompt:"Собери ответ «Три часа».",options:["o'clock","three","It's"],answer:["It's","three","o'clock"],hint:"Начни с It's.",explanation:"It's three o'clock — три часа."},
      {type:"choice",prompt:"Что означает It's five o'clock?",options:["Пять часов","Три часа","Пять книг"],answer:"Пять часов",hint:"Five — пять, o'clock указывает целый час.",explanation:"Это пять часов ровно."},
      {type:"text",prompt:"Впиши пропущенное слово: What ___ is it?",answer:"time",hint:"Оно означает «время».",explanation:"What time is it? — который час?"},
      {type:"choice",prompt:"На часах 4:00. Как ответить?",options:["It's four o'clock.","It's one o'clock.","It's a book."],answer:"It's four o'clock.",hint:"Четыре — four.",explanation:"Для 4:00 подходит It's four o'clock."},
    ],
  },
  "english-routine-1": {
    level: 2, introduction: ["Present Simple помогает говорить о привычных действиях: I work every day — я работаю каждый день; I study in the evening — я учусь вечером.", "Для I используем начальную форму глагола: I work, I study. Выражения every day и in the evening показывают, как часто или когда происходит действие."], example: "I study in the evening. — Я учусь вечером.", tasks: [
      {type:"choice",prompt:"Что означает every day?",options:["каждый день","вчера","завтра"],answer:"каждый день",hint:"Речь о повторяющемся действии.",explanation:"Every day — каждый день."},
      {type:"text",prompt:"Впиши study: I ___ in the evening.",answer:"study",hint:"Слово означает «учиться».",explanation:"I study in the evening — я учусь вечером."},
      {type:"order",prompt:"Собери «Я работаю каждый день».",options:["every day","work","I"],answer:["I","work","every day"],hint:"Начни с I.",explanation:"I work every day описывает регулярное действие."},
      {type:"choice",prompt:"Что означает I study in the evening?",options:["Я учусь вечером","Я работаю утром","Я учился вчера"],answer:"Я учусь вечером",hint:"Study — учиться, evening — вечер.",explanation:"Фраза описывает привычку учиться вечером."},
      {type:"text",prompt:"Вставь слово: I work every ___.",answer:"day",hint:"Every day — каждый день.",explanation:"Словосочетание every day означает «каждый день»."},
      {type:"choice",prompt:"Ты регулярно учишься вечером. Какая фраза подходит?",options:["I study in the evening.","I studied yesterday.","It's five o'clock."],answer:"I study in the evening.",hint:"Используй I study для привычки.",explanation:"I study in the evening описывает обычное действие."},
    ],
  },
  "english-plans-1": {
    level: 2, introduction: ["Для простого намерения можно использовать I am going to + глагол. Например, I am going to study — «Я собираюсь учиться».", "Tomorrow означает «завтра». I am часто сокращают до I'm: I'm going to study tomorrow и I am going to study tomorrow означают одно и то же."], example: "I'm going to study tomorrow. — Я собираюсь учиться завтра.", tasks: [
      {type:"choice",prompt:"Что означает tomorrow?",options:["завтра","вчера","каждый день"],answer:"завтра",hint:"Это следующий день.",explanation:"Tomorrow — завтра."},
      {type:"text",prompt:"Вставь слово: I am going ___ study.",answer:"to",hint:"Оно стоит перед глаголом.",explanation:"После going здесь используется to и глагол."},
      {type:"order",prompt:"Собери фразу «Я собираюсь учиться завтра».",options:["tomorrow","study","going to","I'm"],answer:["I'm","going to","study","tomorrow"],hint:"Начни с I'm.",explanation:"I'm going to study tomorrow описывает намерение."},
      {type:"choice",prompt:"Какая фраза описывает план?",options:["I'm going to study tomorrow.","I study every day.","It's three o'clock."],answer:"I'm going to study tomorrow.",hint:"Найди going to и tomorrow.",explanation:"Going to с глаголом выражает намерение."},
      {type:"text",prompt:"Вставь английское слово для «завтра»: I'm going to work ___.",answer:"tomorrow",hint:"Начинается с t.",explanation:"Tomorrow означает завтра."},
      {type:"choice",prompt:"Что означает I'm going to work tomorrow?",options:["Я собираюсь работать завтра","Я работаю каждый день","Я работал вчера"],answer:"Я собираюсь работать завтра",hint:"Going to выражает намерение.",explanation:"Фраза говорит о плане работать завтра."},
    ],
  },
  "ict-device-concept": {
    level: 1,
    introduction: ["Компьютер получает данные с устройств ввода, обрабатывает их и передаёт результат устройствам вывода. Например, клавиатура вводит текст, микрофон записывает звук, а камера передаёт изображение.", "Монитор показывает изображение, колонки воспроизводят звук, а принтер выводит информацию на бумагу. Для видеозвонка камера и микрофон передают собеседнику изображение и голос; чтобы услышать его, нужны наушники или колонки.", "Одно устройство может выполнять несколько функций: сенсорный экран показывает картинку и принимает прикосновения. Выбирай устройства по задаче, а не по названию."],
    example: "Во время видеозвонка: камера и микрофон — ввод; экран и колонки — вывод.",
    tasks: [
      { type: "choice", prompt: "Какое устройство вводит текст в компьютер?", options: ["Клавиатура", "Монитор", "Принтер"], answer: "Клавиатура", hint: "На ней набирают буквы.", explanation: "Клавиатура передаёт нажатия в компьютер; монитор и принтер выводят информацию." },
      { type: "choice", prompt: "Какое устройство показывает изображение?", options: ["Микрофон", "Монитор", "Клавиатура"], answer: "Монитор", hint: "Посмотри на экран устройства.", explanation: "Монитор выводит изображение." },
      { type: "text", prompt: "Напиши название устройства, которое вводит голос во время видеозвонка.", answer: "микрофон", hint: "Устройство записывает звук.", explanation: "Микрофон передаёт звук в компьютер." },
      { type: "order", prompt: "Расставь этапы: от получения данных до результата.", options: ["Вывод результата", "Обработка данных", "Ввод данных"], answer: ["Ввод данных", "Обработка данных", "Вывод результата"], hint: "Сначала компьютер получает данные.", explanation: "Сначала данные вводятся, затем обрабатываются и выводятся." },
      { type: "choice", prompt: "Собеседник не слышит тебя на видеозвонке. Что проверить в первую очередь?", options: ["Подключение и включение микрофона", "Бумагу в принтере", "Яркость монитора"], answer: "Подключение и включение микрофона", hint: "Проблема касается передачи твоего голоса.", explanation: "Проверь микрофон и разрешение приложению использовать его." },
      { type: "choice", prompt: "Какую роль выполняет сенсорный экран?", options: ["Показывает изображение и принимает касания", "Только записывает звук", "Только печатает документы"], answer: "Показывает изображение и принимает касания", hint: "Он и показывает картинку, и реагирует на палец.", explanation: "Сенсорный экран совмещает ввод касаний и вывод изображения." },
    ],
  },
  "hello-1": {
    level: 1,
    introduction: ["Hello — универсальное английское приветствие. Его можно использовать при встрече и знакомстве. Hi — более неформальное приветствие, а Goodbye означает «до свидания».", "Чтобы представиться, скажи My name is и добавь своё имя. Вопрос What is your name? означает «Как тебя зовут?». В короткой беседе сначала поздоровайся, затем назови своё имя."],
    example: "Hello! My name is Sam. — Привет! Меня зовут Сэм.",
    tasks: [
      { type: "choice", prompt: "Как сказать «Привет» по-английски?", options: ["Goodbye", "Hello", "Please"], answer: "Hello", hint: "Это слово начинает знакомство.", explanation: "Hello — приветствие. Goodbye используют при прощании, please — в просьбе." },
      { type: "choice", prompt: "Что означает Goodbye?", options: ["До свидания", "Спасибо", "Как дела?"], answer: "До свидания", hint: "Эту фразу говорят в конце встречи.", explanation: "Goodbye означает «до свидания»." },
      { type: "text", prompt: "Впиши пропущенное слово: My ___ is Sam.", answer: "name", hint: "Это слово означает «имя».", explanation: "My name is Sam — «Меня зовут Сэм»." },
      { type: "order", prompt: "Собери фразу «Меня зовут Сэм».", options: ["Sam", "is", "My", "name"], answer: ["My", "name", "is", "Sam"], hint: "Начни с My name.", explanation: "Порядок слов: My name is Sam." },
      { type: "choice", prompt: "Ты впервые встречаешь человека. Какая фраза подходит для начала разговора?", options: ["Hello! My name is Sam.", "Goodbye! My name is Sam.", "Please is Sam."], answer: "Hello! My name is Sam.", hint: "Начни с приветствия, затем представься.", explanation: "Сначала Hello, затем My name is и имя." },
      { type: "text", prompt: "Напиши по-английски неформальное короткое приветствие из двух букв.", answer: "hi", accepted: ["hi", "hi!", "hi."], hint: "Оно начинается с H.", explanation: "Hi — неформальное приветствие; Hello тоже приветствие, но длиннее двух букв." },
    ],
  },
  "hello-2": {
    level: 1,
    introduction: ["Please добавляют к просьбе: A tea, please — «Чай, пожалуйста». Thank you означает «спасибо», а You're welcome — ответ на благодарность: «пожалуйста».", "Excuse me помогает вежливо обратиться к незнакомому человеку или привлечь внимание. Sorry выражает извинение. Эти слова используются в разных ситуациях."],
    example: "A: A tea, please. B: Here you are. A: Thank you! B: You're welcome.",
    tasks: [
      { type: "choice", prompt: "Какое слово добавляют к вежливой просьбе?", options: ["Please", "Goodbye", "Sorry"], answer: "Please", hint: "Оно означает «пожалуйста» в просьбе.", explanation: "Please делает просьбу вежливее." },
      { type: "text", prompt: "Вставь слово: Thank ___.", answer: "you", hint: "Получится «спасибо».", explanation: "Thank you означает «спасибо»." },
      { type: "order", prompt: "Собери вежливую просьбу: «Чай, пожалуйста».", options: ["please", "tea", "A"], answer: ["A", "tea", "please"], hint: "Начни с A tea.", explanation: "A tea, please — вежливая короткая просьба." },
      { type: "choice", prompt: "Тебе сказали Thank you. Что ответить?", options: ["You're welcome", "Goodbye please", "My name"], answer: "You're welcome", hint: "Это ответ на благодарность.", explanation: "You're welcome — распространённый ответ на спасибо." },
      { type: "choice", prompt: "Нужно привлечь внимание прохожего. Как начать?", options: ["Excuse me", "Thank you", "Goodbye"], answer: "Excuse me", hint: "Это вежливое обращение к незнакомому человеку.", explanation: "Excuse me помогает вежливо привлечь внимание." },
      { type: "text", prompt: "Напиши английское слово для извинения.", answer: "sorry", accepted: ["sorry", "sorry.", "sorry!"], hint: "Начинается с S.", explanation: "Sorry означает «извини» или «простите»." },
    ],
  },
  "words-1": {
    level: 1,
    introduction: ["Book — книга, pen — ручка, bag — сумка, table — стол. Слова можно запоминать вместе с предметами, которые ты видишь вокруг.", "Для одного предмета обычно используют a: a book, a pen. В коротком вопросе What is this? спрашивают «Что это?». Ответ: It is a book или сокращённо It's a book."],
    example: "What is this? — It's a book. Это книга.",
    tasks: [
      { type: "choice", prompt: "Что означает book?", options: ["Книга", "Ручка", "Стол"], answer: "Книга", hint: "Её читают.", explanation: "Book — книга." },
      { type: "choice", prompt: "Как по-английски «ручка»?", options: ["pen", "bag", "table"], answer: "pen", hint: "Три буквы, начинается с p.", explanation: "Pen — ручка, bag — сумка." },
      { type: "text", prompt: "Вставь слово: a ___ — сумка.", answer: "bag", hint: "Три буквы, начинается с b.", explanation: "A bag — сумка." },
      { type: "order", prompt: "Собери вопрос «Что это?». ", options: ["this?", "is", "What"], answer: ["What", "is", "this?"], hint: "Начни с What.", explanation: "What is this? — «Что это?»" },
      { type: "choice", prompt: "На вопрос What is this? ты показываешь книгу. Что ответить?", options: ["It's a book.", "It's a pen.", "Goodbye."], answer: "It's a book.", hint: "Книга — book.", explanation: "It's a book означает «Это книга»." },
      { type: "text", prompt: "Напиши по-английски слово «стол».", answer: "table", hint: "Начинается с t.", explanation: "Table — стол." },
    ],
  },
  "words-2": {
    level: 1,
    introduction: ["Red — красный, blue — синий или голубой, green — зелёный, yellow — жёлтый. В английском цвет обычно стоит перед существительным: a red book — красная книга.", "Вопрос What colour is it? означает «Какого это цвета?». Можно ответить It's blue — «Он, она или оно синего цвета». В британском английском пишут colour, в американском — color."],
    example: "What colour is the bag? — It's green. Сумка зелёная.",
    tasks: [
      { type: "choice", prompt: "Что означает blue?", options: ["Синий", "Красный", "Жёлтый"], answer: "Синий", hint: "Такого цвета может быть небо.", explanation: "Blue — синий или голубой." },
      { type: "text", prompt: "Напиши по-английски «зелёный».", answer: "green", hint: "Начинается с g.", explanation: "Green — зелёный." },
      { type: "order", prompt: "Собери выражение «красная книга».", options: ["book", "red", "a"], answer: ["a", "red", "book"], hint: "Цвет стоит перед предметом.", explanation: "A red book — красная книга." },
      { type: "choice", prompt: "Что означает What colour is it?", options: ["Какого это цвета?", "Где книга?", "Как тебя зовут?"], answer: "Какого это цвета?", hint: "Вопрос о цвете.", explanation: "Colour означает «цвет»." },
      { type: "choice", prompt: "На вопрос о цвете зелёной сумки выбери ответ.", options: ["It's green.", "It's yellow.", "It's a pen."], answer: "It's green.", hint: "Зелёный — green.", explanation: "It's green — «Она зелёная»." },
      { type: "text", prompt: "Вставь цвет: a ___ sun — жёлтое солнце.", answer: "yellow", hint: "Начинается с y.", explanation: "Yellow — жёлтый." },
    ],
  },
  "web-1": {
    level: 1,
    introduction: ["HTML описывает структуру веб-страницы: заголовки, абзацы, ссылки и другие элементы. CSS задаёт внешний вид, а JavaScript может добавлять интерактивное поведение.", "HTML-элемент обычно состоит из открывающего тега, содержимого и закрывающего тега. Например, <p>Привет</p> создаёт абзац. Тег <h1> обозначает главный заголовок, а <a> — ссылку."],
    example: "<h1>Мой сайт</h1>\n<p>Привет!</p>",
    tasks: [
      { type: "choice", prompt: "Какой язык задаёт структуру веб-страницы?", options: ["CSS", "HTML", "PNG"], answer: "HTML", hint: "Этот язык использует теги.", explanation: "HTML описывает структуру, CSS отвечает за оформление." },
      { type: "choice", prompt: "Какой тег обозначает абзац?", options: ["<p>", "<h1>", "<a>"], answer: "<p>", hint: "Это одна латинская буква.", explanation: "Тег p обозначает абзац." },
      { type: "text", prompt: "Вставь имя закрывающего тега: <p>Привет</___>", answer: "p", hint: "Имя закрывающего тега совпадает с открывающим.", explanation: "Абзац закрывается тегом </p>." },
      { type: "order", prompt: "Собери HTML-абзац в правильном порядке.", options: ["</p>", "Привет", "<p>"], answer: ["<p>", "Привет", "</p>"], hint: "Сначала открывающий тег, затем текст и закрывающий тег.", explanation: "Получится <p>Привет</p>." },
      { type: "choice", prompt: "Что означает элемент <h1>Мой сайт</h1>?", options: ["Главный заголовок", "Абзац", "Изображение"], answer: "Главный заголовок", hint: "h1 используется для основного заголовка страницы.", explanation: "h1 обозначает заголовок первого уровня." },
      { type: "text", prompt: "Напиши полный HTML-код абзаца с текстом Привет.", answer: "<p>Привет</p>", hint: "Используй открывающий и закрывающий теги p.", explanation: "Один из корректных вариантов: <p>Привет</p>." },
    ],
  },
  "ict-security-concept": {
    level: 5,
    introduction: ["Пароль и одноразовый код подтверждают личность владельца. Их нельзя сообщать собеседнику, даже если он представляется сотрудником службы поддержки или торопит вас.", "Подозрительное сообщение может использовать срочность и ссылку, похожую на настоящую. Не отвечай на него и не открывай ссылку: самостоятельно открой известный официальный адрес или приложение и проверь уведомления там.", "Если данные уже раскрыты, через официальный сервис смени пароль, проверь активные сеансы и второй фактор. При необходимости обратись в поддержку через контакты, найденные самостоятельно."],
    example: "Пришло сообщение «Срочно назовите код входа». Не отправляй код; открой приложение сервиса самостоятельно и проверь уведомления.",
    tasks: [
      { type: "choice", prompt: "Незнакомец просит одноразовый код для отмены взлома. Что делать?", options: ["Не сообщать код и самостоятельно открыть официальный сервис", "Продиктовать код", "Отправить пароль вместо кода"], answer: "Не сообщать код и самостоятельно открыть официальный сервис", hint: "Код нужен для подтверждения входа владельца.", explanation: "Не передавай код. Проверь ситуацию через знакомое приложение или официальный адрес." },
      { type: "choice", prompt: "Что может быть признаком подозрительного сообщения?", options: ["Требование срочно сообщить код", "Уведомление в самостоятельно открытом приложении", "Запись в собственных заметках"], answer: "Требование срочно сообщить код", hint: "Обрати внимание на давление и запрос секретов.", explanation: "Срочность вместе с запросом кода — повод остановиться и проверить сообщение." },
      { type: "text", prompt: "Какой секрет из сообщения о входе нельзя пересылать другим? Напиши одно слово.", answer: "код", accepted: ["код", "одноразовый код", "код подтверждения"], hint: "Он приходит для подтверждения входа.", explanation: "Одноразовый код подтверждения нельзя сообщать другим." },
      { type: "order", prompt: "Расположи безопасные действия после подозрительного сообщения.", options: ["Проверить уведомления", "Не отвечать и не переходить по ссылке", "Открыть официальный сервис самостоятельно"], answer: ["Не отвечать и не переходить по ссылке", "Открыть официальный сервис самостоятельно", "Проверить уведомления"], hint: "Сначала прекрати взаимодействие с сообщением.", explanation: "Сначала остановись, затем открой известный сервис и проверь уведомления." },
      { type: "choice", prompt: "В письме есть ссылка на якобы официальный сайт. Как безопаснее проверить аккаунт?", options: ["Открыть знакомый официальный адрес самостоятельно", "Перейти по ссылке из письма", "Отправить отправителю скриншот кода"], answer: "Открыть знакомый официальный адрес самостоятельно", hint: "Не используй адрес из сомнительного сообщения.", explanation: "Самостоятельно введённый известный адрес помогает избежать подменённой ссылки." },
      { type: "choice", prompt: "Ты уже сообщил пароль мошеннику. Что сделать через официальный сервис?", options: ["Сменить пароль и проверить активные сеансы", "Ничего не делать", "Отправить новый пароль тому же человеку"], answer: "Сменить пароль и проверить активные сеансы", hint: "Нужно прекратить доступ по раскрытому паролю.", explanation: "Смени пароль через официальный сервис, проверь сеансы и второй фактор." },
      { type: "text", prompt: "Как называется дополнительная проверка входа кроме пароля? Напиши два слова.", answer: "второй фактор", accepted: ["второй фактор", "второй фактор входа", "двухфакторная аутентификация"], hint: "Это второй ... входа.", explanation: "Второй фактор добавляет дополнительное подтверждение входа." },
      { type: "choice", prompt: "Как найти поддержку после подозрительного письма?", options: ["Найти контакты самостоятельно в официальном приложении или на сайте", "Позвонить по номеру из подозрительного письма", "Ответить письмом с паролем"], answer: "Найти контакты самостоятельно в официальном приложении или на сайте", hint: "Не доверяй контактам внутри подозрительного сообщения.", explanation: "Ищи контакты поддержки самостоятельно через официальный канал." },
    ],
  },
};

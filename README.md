# QSBI Квиз-арена

Квиз по бизнес-образованию QSBI для 1–11 классов, уроки 17–32 (2 четверть).
**1765 вопросов**, по 10–12 на каждый урок, с объяснением после каждого ответа.

**Открыть:** https://omarumarov1-png.github.io/qsbi-quiz/

## Ссылки на конкретный урок

Добавьте к адресу параметры, и квиз откроется с нужными настройками:

| Параметр | Значение | Пример |
|---|---|---|
| `g` | класс (1–11) | `?g=5` |
| `l` | урок (17–32) | `?g=5&l=20` |
| `n` | число вопросов: 5, 10, 15 или `max` | `?g=8&l=20&n=max` |

Кнопка «🔗 Ссылка на этот квиз» в приложении копирует такую ссылку сама (на телефоне открывает меню «Поделиться»).

После первого открытия квиз работает без интернета и его можно установить на телефон («На экран Домой»).

## Как устроено

- `index.html`, `app.js`: само приложение (без сборщиков и зависимостей).
- `questions.js`: банк вопросов. **Генерируется**, руками не править.
- `src/`: исходники банка:
  - `original.js`: исходные 140 вопросов;
  - `new-g1-4.js`, `new-g5-8.js`, `new-g9-11.js`, `new-topup.js`: новые вопросы (уроки 17–20);
  - `new-l21-*.js`: уроки 21–24; `new-l25-*.js`: уроки 25–32 (30–32: повторение полугодия);
  - `distractors.js`, `longer.js`, `longer-l21.js`, `longer-l25.js`: переписанные неверные варианты, чтобы правильный ответ нельзя было угадать по длине;
  - `check-file.js`: быстрая проверка одного файла с новыми вопросами (`node src/check-file.js src/new-l25-g9.js`);
  - `build-bank.js`: собирает `questions.js` и проверяет банк.

В исходниках правильный ответ всегда стоит **первым** (`opts[0]`). Приложение перемешивает варианты при каждом показе. Поле `x` содержит объяснение, которое показывается после ответа.

### Добавить вопросы

1. Допишите вопросы в любой файл `src/new-*.js` в формате
   `{g:5,l:20,topic:"Личный бюджет школьника",q:"…",opts:["верный","неверный","неверный","неверный"],x:"объяснение"}`.
2. Выполните `node src/build-bank.js`. Скрипт проверит банк (4 разных варианта, без дублей) и покажет число вопросов по урокам.
3. В `sw.js` поднимите `VERSION`, чтобы у учеников обновился офлайн-кэш.
4. Сделайте коммит и push: сайт обновится сам.

## English version (RU / EN switch)

The quiz has an **RU / EN** switch in the header. In English the whole quiz switches: interface, all 1765 questions, options and explanations (no side-by-side text). The choice is remembered on the device; a link with `?lang=en` (or `#…-en` in the claude.ai artifact) opens the quiz in English. The lessons and the business club stay in Russian.

- `i18n.js`: interface strings (RU/EN), the switch, loading of the English bank on demand.
- `questions-en.js`: the English bank, same order as `questions.js`. **Generated**, don't edit by hand.
- `src/en/g1.txt … g11.txt`: translations, one line per question: `index ¦ question ¦ correct ¦ wrong ¦ wrong ¦ wrong ¦ explanation`; `src/en/topics.json`: lesson topics.
- `node src/build-en.js --write` checks that every question is translated, numbers match the Russian original and each translation still belongs to the same Russian question (`src/en/ru-lock.json`), then writes `questions-en.js`.
- If a Russian question is changed or added, re-translate its line and run `node src/build-en.js --relock --write`.

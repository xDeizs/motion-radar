---
slug: claude-motion-whaleyxbt-audit
label: seek contract — дополнение к whaleyxbt
type: статья
tags: seek, реверс, тайминг, crop, QA
take: проверять независимость seek от истории
source: https://github.com/whaleyxbt/claude-motion/blob/e627941543d9988b155dc610bb9cc0115a5e365e/sims/kit/director.js
date: 2026-11-02
confidence: high
---
# seek contract — разбор director
- Что это: дополнение к существующей `knowledge/cards/claude-motion-whaleyxbt.md`, не инструкция устанавливать репозиторий и не второй экземпляр skill.
- Когда применять: перед переносом crop/camera/director из чужого HTML-движка в собственный `seek(t)` pipeline.
- Что взять: тест A→B→A и random-order seek при фиксированных seed/fonts/assets/viewport/FPS. Один и тот же t обязан получать один и тот же кадр в том же окружении.
- Что НЕ брать / риски: README обещание pure render не доказывает чистоту всей цепочки. Не менять production pipeline без воспроизведения на своей сцене.
- Вердикт: проверить в отдельной сцене; после review дописать существующую карточку, не устанавливать.

## Проверенные исходники
Commit `e627941543d9988b155dc610bb9cc0115a5e365e`: `sims/kit/runtime.js`, `sims/capture.mjs`, `sims/kit/director.js`, релевантный участок `sims/engine/main.js`, `sims/engine/timeline.json`, `.claude/skills/review-loop/SKILL.md`.

Runtime отделяет live loop от capture. Capture шагает `from + i / fps`. Engine задаёт camera/uniforms по t. Но director хранит foci между вызовами: pre(t) читает фокус прошлого post(t, info). Если foci меняются по времени и используется tight crop, история влияет на кадр.

## Изолированный тест
Прочитанный director запускался в ограниченной Node VM без imports, filesystem/network/subprocess внутри VM, со stub DOM/stage. Последовательность `0→1→2→1`: x фокуса в t=1 сначала 100, повторно 200. Подтверждена order dependency crop-входа, **не** pixel-ошибка всей WebGL-сцены. Не все сцены затронуты. Production проекта не запускался/не менялся.

Вариант исправления: focusAt(t) вычислять до crop или одинаковый подготовительный проход на каждом t. Проверить на реальном renderer перед переносом. Пакет Radar содержит тест `research/check-director.cjs`, JSON результата и закреплённый reviewed-модуль с MIT license. Это исследовательский тест, не production patch.

## Зачем (слова пользователя, дословно)
«Наша задача это будет сделать полноценную студию монтажа».

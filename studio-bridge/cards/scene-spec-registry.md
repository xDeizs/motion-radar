---
slug: scene-spec-registry
label: Scene spec и reusable components
type: статья
tags: архитектура, сцены, компоненты, бриф, motion
take: сцены по спецификации не магии
source: https://www.reddit.com/r/reactjs/comments/1qzadb5/used_remotion_claude_to_produce_13_min_of_clean/
date: 2026-11-02
confidence: medium
---
# Scene spec и reusable components
- Что это: синтез прочитанных Reddit-поста, JJ Englert post/README и Louise article. Не скачанный платный курс и не проверка всего связанного кода.
- Когда применять: серии роликов, B-roll, explainer и брендовые видео с повторяемым дизайном.
- Что взять: отдельно хранить brand tokens, компоненты и scene specs. Начать с title, number, chart, callout, comparison; переносить только в подходящий style.
- Что НЕ брать / риски: заявления «13 минут видео» и «3–5 минут на сцену» не подтверждены нашим рендером. Не смешивать стили и не вводить новый стиль по чужому guide без reference-frame approval.
- Вердикт: сделать маленький sandbox example после одобрения; не устанавливать сторонние dependencies.

## Минимальный scene spec — редакторское предложение, не существующий API студии
```json
{"scene_id":"shot-01","style_id":"chosen-style","duration_s":4,"intent":"одна мысль","text":"короткий тезис","component":"callout","enter_s":0.3,"hold_s":2.8,"exit_s":0.4,"assets":[],"source_urls":[],"rights_checked":false,"qa_times_s":[0,0.3,1.0,3.6,3.9667]}
```
Числа иллюстративные. Длительность, читаемость и стыки проверить на собственном ролике. Schema не навязывается текущему renderer. Нельзя записывать generated indexes вручную.

Источники: тело Reddit-поста; https://x.com/JJEnglert/status/2046961066437914681 ; https://github.com/JJenglert1/video-production-workflow (README); https://louisedesadeleer.substack.com/p/how-i-make-custom-motion-graphics (полный текст).

## Зачем (слова пользователя, дословно)
«Он будет нам помогать обучать нашу Motion Studio».

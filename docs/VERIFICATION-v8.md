# Motion Radar 8 — проверка выпуска

## Реально сделано

- 16 исследовательских досье, 16 разных original URL, с явным scope и ограничениями. Это кураторская подборка, не весь интернет и не рейтинг «самых популярных».
- Прочитаны документация, статьи, тело Reddit-поста, выбранные README и исходники. YouTube — только описания/главы, Instagram — caption; поисковые X-фрагменты отдельно помечены.
- Публичные субтитры YouTube не получены: требование входа. Отдельный channel feed дал HTTP 404, страница канала не загрузилась. Ни смены аккаунта, ни cookies, ни обходов не было.
- В whaleyxbt/claude-motion закреплён commit `e627941543d9988b155dc610bb9cc0115a5e365e`. Просмотрены runtime/capture/director, релевантный engine/main и timeline/review-loop. Изолированный тест director с mock DOM/stage дал x фокуса 100 и 200 для t=1 в последовательности 0→1→2→1. Это order dependency crop-входа при динамическом фокусе, не pixel-тест всего проекта и не производственный benchmark.
- Новый watcher реально сделал 4 запроса: 3 успешных источника, 11 metadata records (5 commits, 5 releases, 1 RSS title). Четвёртый источник — YouTube 404. Повторный запуск в пределах кэша сделал **0** сетевых запросов и сохранил backoff.
- 92 offline unit-теста прошли: старые функции, новые bounded endpoints, запреты URL/DTD, scope metadata-only, dedup/seen_at, cache/backoff/offline, export manifest и отказ перезаписи.
- Браузерные сценарии: 36 legacy + 60 topics/guides + 42 research checks на 1440/390 px. В том числе modal/filter/pagination/export/saved, escape untrusted text и refresh нового signals timestamp при неизменном RSS timestamp.
- Визуально просмотрены research desktop/mobile, scope-фильтр YouTube, окна аудита и статусов. Новые preview с встроенными шрифтами не имеют failed resources. Нет горизонтального переполнения в проверенных сценариях. Diagnostics для sr-only намеренные; пересечения под модальным backdrop не являются пересечением видимого контента.
- 10 файлов созданы в `inbox/notion/motion-radar/` существующей студии на ПК: README, отчёт, sources JSON, 3 draft-карточки, 4 файла evidence (тест/модуль/лицензия/результат). README и audit-карточка прочитаны обратно. Scope записи соблюдён.
- Экспорт в новую `.private/` папку проверяет manifest SHA-256, не импортирует в knowledge. Приватные очереди/экспорты исключены из архива и публикации.

## Не сделано / не подтверждено

- Production студии, её styles и generated indexes не менялись. Карточки — review drafts, не принятые правила; зависимости на ПК не устанавливались. Новая студия/клиентский SaaS-редактор этим выпуском не создан.
- GitHub-репозиторий не подтверждён. Push/deploy/включение расписания не выполнялись. Исходники содержат light-watch cron 30 min и deep-refresh 6 h; это готовая конфигурация, не запущенный сервис. GitHub cron может задерживаться.
- Нет авторизованного постоянного потока X, Reddit и Instagram. Все три платформы обозначены как не подключённые. Поисковые адаптеры v7 не равны author-stream.
- Нет полного просмотра/транскрипции всех найденных видео, аудиопрослушивания, исполнения всех tutorial и аудита всех репозиториев.
- Нет fine-tuning. «Обучение студии» здесь — источники, retrieval-карточки, playbooks и проверяемые тесты. Чужие посты не выполняются как инструкции.
- Не проверены пользовательские API billing/credits, лицензии всех медиа и конкретные аккаунты Claude/Grok. Не выполнялся обход paywall или получение платных курсов из нелегальных источников.

## Воспроизведение

Python 3.11+; без новых pip-пакетов:

```bash
python -m unittest discover -s tests -v
python scripts/watch_sources.py
python scripts/update.py --render-only
python scripts/export_studio.py --out .private/studio-export-new
python -m http.server 8000 --bind 127.0.0.1
```

`node research/check-director.cjs` — изолированный тест просмотренного модуля, Node built-ins only. Не запускает рендер или установку проекта.

UI tests (если devDependencies и Chromium уже есть): `tools/qa.mjs`, `tools/qa-topics.mjs`, `tools/qa-experts.mjs`; им передаётся URL локального сервера. `CHROMIUM_PATH` — путь к существующему Chromium, `QA_OUT` — каталог QA-файлов.

Исторические проверки: `docs/VERIFICATION-v7.md`, `docs/VERIFICATION-v6.md`. Доступы и публикация: `docs/WATCH_SETUP.md`, `docs/API_SETUP.md`.

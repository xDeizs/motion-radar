## Дополнение: бесплатный режим и права GitHub

Репозиторий xDeizs/motion-radar подтверждён. GitHub MCP возвращал 403 на запись; с разрешения пользователя публикация продолжена через веб-интерфейс GitHub в отдельной ветке radar-learning-free-mode. Результат сборки и деплоя проверяется в Actions, а не по наличию ZIP или локального commit.

Тяжёлый CPU AI теперь opt-in (manual input либо ENABLE_LOCAL_CPU_AI=true), платные/Gemini/X вызовы в расписании отсутствуют. Публичный режим не нуждается в Postman/Gemini ключах. Google Search grounding не используется для индекса Radar ввиду условий Google. См. docs/FREE_MODE.md.

119 тестов повторно пройдены; отдельная проверка workflow подтвердила отсутствие GEMINI_API_KEY, X_BEARER_TOKEN и --allow-metered.

# Motion Radar 9 · проверка перед передачей

## Выполнено

- Продукт уточнён: приватное обучение и собственные LLM-workflow; Radar — исследовательский инструмент, Studio — лаборатория.
- Публичный сетевой сбор Chen: один запрос, 732 уникальных карточки (название/категория/URL). Повторный запуск: 0 запросов, кэш. Скрытые главы не собирались.
- 10 поисковых направлений; 25 досье всего, включая 9 новых; 3 проекта авторских практикумов. Практикумы ещё не проведены и не production-tested.
- X keyword collector с gating, page continuation, watermark, dedup, ротацией, retention и private-only телами. Проверен на fixtures, НЕ на авторизованном аккаунте.
- Анонимный X endpoint check: HTTP 401, одна попытка, без credentials и повторов. Платных вызовов не делали.
- 119 Python-тестов: PASS.
- 202 UI-проверки Chromium на 1440/390: 64 новых + 60 topics/guides + 42 research + 36 legacy. PASS, без JavaScript exceptions.
- Дополнительная live-проверка: native modal находится над sticky tabs. PASS.
- 11 итоговых визуальных состояний отрисованы capture_html.py и открыты по одному: control/catalog/workshop/article/empty, desktop/mobile; validation mobile. Шрифты загружены, горизонтального overflow нет. Исправлена потеря native top layer в capture-only клоне; работающий сайт проверен отдельно.
- Review-only экспорт: 27 файлов, manifest SHA-256, без автоматического импорта.
- На ПК пользователя создано 5 файлов в разрешённом inbox/notion/motion-radar/learning-community/. Первый сбой 502 для new-research.json устранён безопасным create-only повтором; README и new-research прочитаны обратно.

## Не выполнено и не заявляется

- Социальные API не считаются подключёнными по факту публикации сайта. Статус деплоя — в Actions подтверждённого xDeizs/motion-radar.
- Нет постоянного разрешённого X/Instagram/Reddit/Telegram потока. X требует собственный доступ/биллинг и persistent private storage.
- Нет массового Telegram harvesting для AI; нужны источники и необходимые права.
- Один YouTube feed из предыдущего прохода остаётся 404; полные видео/транскрипты не получены.
- Creatorize classroom и код Supereditor не открывались; изучены публичные страницы. Закрытые курсы и email-замки не обходились.
- Skills/plugins не устанавливались, model weights не обучались, production-движок и стили существующей Studio не менялись.

Подключение: docs/LEARNING_SETUP.md. Исследование: research/LEARNING_PRIVATE.md.
Прежние проверки: docs/VERIFICATION-v8.md и более ранняя история.

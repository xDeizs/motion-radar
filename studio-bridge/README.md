# Motion Radar → существующая Motion Studio

Статус: подготовлено к review. Это не автозагрузка инструкций и не сообщение о завершённой интеграции.

Содержимое:
- `RESEARCH.md` / `research-sources.json`: 25 досье с источниками и границами проверки.
- `cards/seek-director-audit.md`: дополнение к уже существующей карточке whaleyxbt. Не плодить дубликат; после проверки сделать точечное дополнение.
- `cards/scene-spec-registry.md`: проект карточки о scene specs и reusable components.
- `cards/radar-intake-review.md`: предложение intake/review policy, не принятое правило.

На ПК писать только в разрешённый `inbox/notion/motion-radar/`. Ни production, ни styles, ни generated indexes этим пакетом не изменяются.

Следующий локальный проход через существующий inbox-sort:
1. Прочитать README, источники и каждый draft; scope partial не повышать без дополнительных данных.
2. Сопоставить существующие knowledge/cards и убрать дубли. Для whaleyxbt — дополнение к текущей карточке, не новый skill/install.
3. После одобрения прогнать isolated example/replay test существующими render/QA средствами. Не ставить пакеты без отдельного согласия.
4. Проверенные заметки перенести по обычному workflow и пересобрать индексы существующей refs build командой; индексы руками не писать. Эта команда здесь не запускалась.
5. Модель уточнена пользователем: приватное обучение и LLM-workflow; Radar — исследовательский инструмент, Studio — лаборатория. Agency-vs-SaaS больше не спрашивать. Осталось подтвердить репозиторий/hosting; не строить новый клиентский редактор и не публиковать в случайный repo.

Аудит director — в архиве Radar: `research/check-director.cjs`, `director-reviewed.js`, `whaley-LICENSE.txt`, `director-audit.json`. Он не доказывает качество всей сцены. Даже полезный внешний код сначала проверить в своём окружении.

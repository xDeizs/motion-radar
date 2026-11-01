# Motion Radar · пакет для Google Flow

Готовые image-to-video промпты для более сложного движения материала. Генерация в Google Flow не запускалась; доступность моделей, длительность и стоимость зависят от твоего аккаунта. На сайте уже есть бесплатный 6-секундный видеофон: сгенерированное изображение + зацикленное движение камеры, без звука. Это motion-дизайн, не генерация новых видеокадров моделью.

## Общий стиль

High-end editorial material photography, cool brushed silver, pale lavender lacquer accents, controlled large studio strip lights, very fine tangible surface detail, sharp sculptural silhouette, quiet industrial precision, sophisticated real material response. No lettering, no words, no logo, no watermark, no neon, no cheap glossy plastic, no low-poly or clay illustration.

## 1. Hero / серебряная орбита

**Стартовый кадр:** `assets/motion/orbit-reference-v5.webp`. Сохрани объект целиком. Для широкого кадра размести его в правой половине, не растягивай квадратное изображение.

**Prompt (English):**

High-end editorial material photography, cool brushed silver, pale lavender lacquer accents, controlled large studio strip lights, very fine tangible surface detail, sharp sculptural silhouette, quiet industrial precision, sophisticated real material response. No lettering, no words, no logo, no watermark, no neon, no cheap glossy plastic, no low-poly or clay illustration.

A single uninterrupted studio shot of the exact suspended pleated aluminum orbit sculpture from the reference. Preserve its complete silhouette, the topology of the folds, the hollow opening, the satin metal texture, and the pale lavender interior. Wide 16:9 frame. The sculpture sits entirely inside the right 55 percent of the image; keep the left 45 percent as quiet uniform charcoal negative space for real website typography added later. The object very slowly rotates a few degrees about its vertical axis while the camera performs a delicate, physically plausible clockwise orbit and a slight push-in. One broad studio reflection travels gradually across the silver pleats. The movement is controlled and minimal, with a composed nearly still opening and a composed ending. No shape transformation, no melting, no liquid metal, no new objects, no particles, no background changes, no flare, no vignette, no baked-in text. The camera never crops the sculpture. Silent video, no music or audio. Make the final pose closely match the opening pose if a seamless loop option is available.

**Задача:** slow rotation and a moving studio reflection, not a metamorphosis. Попробуй доступную в интерфейсе короткую длительность, ориентир 6–8 секунд. Если есть режим первого и последнего кадра, используй согласованные кадры с той же композицией. Не объявляй цикл бесшовным, пока не сравнишь стык.

## 2. Фоновая фактура / macro ribbon

**Стартовый кадр:** `assets/motion/background-source-v5.webp`.

**Prompt (English):**

High-end editorial material photography, cool brushed silver, pale lavender lacquer accents, controlled large studio strip lights, very fine tangible surface detail, sharp sculptural silhouette, quiet industrial precision, sophisticated real material response. No lettering, no words, no logo, no watermark, no neon, no cheap glossy plastic, no low-poly or clay illustration.

Use the reference as the opening frame. A restrained cinematic macro shot of a satin aluminum ribbon on the far right of a deep graphite studio. Keep the left two-thirds consistently quiet and dark. The camera moves only a few centimeters laterally, creating subtle parallax along the finely brushed aluminum surface. A broad white studio strip-light reflection slowly slides along the metal, with a faint pale lavender reflected tone. The ribbon remains physically rigid and unchanged. Smooth slow motion, no abrupt acceleration, no focus pumping, no cuts, no new objects, no typography, no logos, no colored glow, no smoke or particles. Silent video. The shot should feel like an expensive, quiet material study rather than an effects sequence. Return gently toward the opening camera position for a soft loop.

## 3. Отдельная мобильная композиция

**Не обрезай готовый 16:9 hero автоматически.** В image-to-video используй ту же скульптуру, но собери портретный кадр отдельно.

**Prompt (English):**

High-end editorial material photography, cool brushed silver, pale lavender lacquer accents, controlled large studio strip lights, very fine tangible surface detail, sharp sculptural silhouette, quiet industrial precision, sophisticated real material response. No lettering, no words, no logo, no watermark, no neon, no cheap glossy plastic, no low-poly or clay illustration.

Portrait 9:16 composition. Preserve the exact complete pleated aluminum orbit sculpture from the reference, placed in the lower-middle portion of a uniform deep graphite frame. Leave the upper third quiet and dark for real HTML typography. Keep generous margins and never crop the silhouette. Very slow physical camera orbit, no more than a few degrees; a restrained broad reflection moves along the silver folds. Pale lavender coating stays consistent. No morphing, melting, liquid simulation, particles, text, logo, cut, light flash, dramatic zoom, or added objects. Silent video. Small controlled movements suitable for a phone website, composed beginning and ending.

## Как встроить готовый результат

1. Скачай видео и проверь каждый переход, форму объекта, отсутствие текстовых артефактов и края кадра.
2. Убери звук. Подготовь отдельные desktop/mobile файлы. Для scrubbing используй частые ключевые кадры, не обычное длинное GOP-видео.
3. Сохрани poster из настоящего первого кадра того же видео, а не из похожей генерации.
4. Замени соответствующие пути `data-sc-src` / `data-sc-src-mobile` в `web/prologue.html`. Если готовое видео содержит большую скульптуру, не оставляй поверх него второй экземпляр PNG/WebP: убери `.hero-orbit-stage` или выбери чистый фон из промпта 2.
5. Запусти `python scripts/pack_motion_assets.py`, затем `python scripts/update.py` и тесты. В репозитории ассеты хранятся как base64-исходники; сборка декодирует их в обычные медиафайлы.
6. Проверь первый кадр, середину, выход, телефон, ручное выключение и системное уменьшение движения. В motion-off видео не должно загружаться.

Никаких API-ключей Google или Kie в репозиторий добавлять не нужно.

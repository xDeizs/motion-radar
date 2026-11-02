# Видео для Motion Radar: Google Flow / Veo

В репозитории уже есть **своё процедурное видео** — LED-стена за манифестом
(`assets/video/led-wall.{mp4,webm}` + `led-wall-poster.webp`). Оно нарисовано кодом
(`npm run video`, `tools/render-led-wall.mjs`), поэтому у него нет чужих прав и
не нужен платный сервис. Этот файл — для случая, когда хочется кинематографичных
AI-кадров: промпты, настройки и команды, чтобы положить результат на сайт.

Генерация в Google Flow для этой сборки не запускалась: доступ к моделям, длительность
и стоимость зависят от твоего аккаунта. Ниже — готовые промпты и команды для замены.

## Как генерировать в Flow

1. Открой https://labs.google/flow → новый проект.
2. Модель: **Veo 3.1** (Quality для финала, Fast для черновиков).
3. Для петель используй **Frames to Video**: загрузи один и тот же кадр как
   первый и последний. Кадры уже лежат в `assets/img/` (`look.webp`,
   `make.webp`, `build.webp`, `mascot.webp`). Для LED-стены — **Text to Video**.
4. Формат: 16:9 для десктопа и 9:16 для мобильной версии; 8 секунд;
   2–4 варианта на промпт. Звук не нужен — команды ниже его удаляют.
5. Пиши промпты по-английски: Veo точнее следует английским описаниям.

Общие правила для всех роликов сайта:

- никакого читаемого текста, логотипов и людей — типографика остаётся в HTML;
- камера статична или очень медленно наезжает, без резких склеек;
- тёмный фон, а центр кадра (или левые 45% для hero) спокойнее краёв;
- палитра сайта: cobalt `#3d5cff`, lime `#c8ff2e`, pink `#ff4fb3`,
  violet `#9b6bff`, orange `#ff8a1f`, почти чёрный `#05050a`;
- последний кадр совпадает с первым (seamless loop).

## Промпты

### 1. LED-стена за манифестом (замена `led-wall`)

**16:9, Text to Video**

```text
Extreme close-up of a giant LED video wall in a dark club. Individual round RGB diodes are clearly visible, each with a soft bloom. Slow plasma waves drift across the wall in cobalt blue, violet and hot pink. A thin acid-lime radar sweep rotates once around the center while faint cyan rings pulse outward. Two horizontal ticker bands near the top and bottom scroll abstract pixel glyphs, not readable words. Locked-off camera with a barely noticeable slow push-in. Deep black surroundings, high contrast, cinematic, 35mm. No people, no logos, no readable text. Seamless loop: the last frame matches the first frame.
```

**9:16** — тот же промпт плюс: `Vertical composition, the radar center sits slightly above the middle of the frame.`

### 2. Карточка «Смотреть» (`look.webp`)

```text
Use the image as both the first and the last frame. The vinyl art-toy character in a puffy cobalt jacket, with a white satellite-dish head, slowly scans from left to right through chrome binoculars, pauses, then returns to the starting pose. A soft highlight glides across the dish. Subtle breathing motion in the jacket. Static camera, studio lighting, dark navy background with thin volumetric haze. No text, no logos.
```

### 3. Карточка «Делать» (`make.webp`)

```text
Use the image as both the first and the last frame. A glossy lime-green cartoon finger slowly presses the translucent cobalt glass keycap down, a few tiny orange sparks spray from the mechanical switch, then the keycap springs back up with a soft elastic bounce. Macro lens, static camera, dark studio background with blue haze, crisp reflections in the glass. No text, no logos.
```

### 4. Карточка «Собирать» (`build.webp`)

```text
Use the image as both the first and the last frame. Glossy objects float in zero gravity: white and orange keycaps, a chrome gear, a lime smiley badge, a pink puffy star and a clear glass capsule. They drift and rotate gently around a shared center, the chrome gear turns slowly, soft cobalt and pink rim light. Locked-off macro product shot, dark background, calm and premium. No text, no logos.
```

### 5. Маскот в финале (`mascot.webp`)

```text
Use the image as both the first and the last frame. The art-toy mascot with a white satellite-dish head and an LED face screen blinks its pixel eyes, the LED smile animates, the dish tilts slightly, and one hand gives a single small wave before returning to the original pose. Static camera, dark studio, cobalt rim light, glossy vinyl and chrome materials. No text, no logos.
```

### 6. Hero, если нужен видеофон вместо 3D

На сайте hero — живая Three.js-сцена: клавиши кликаются и ведут в разделы. Видео
её не заменяет, а только подходит для страниц без WebGL или для промо.

```text
Glossy pastel keycaps in lime, hot pink, cobalt, white, orange and violet float and slowly tumble in a dark navy space, while iridescent soap bubbles with thin-film rainbow edges drift upward past them. Composition weighted to the right: the left 45% of the frame stays dark and empty. Soft studio reflections, gentle depth of field, slow camera drift to the left. No text, no logos. Seamless loop.
```

## Как положить ролик на сайт

Замени LED-стену, сохранив имена файлов, — код и разметку менять не нужно:

```sh
# H.264 для Safari и старых браузеров
ffmpeg -i flow-led.mp4 -vf "scale=1280:-2,fps=30" -c:v libx264 -preset slow -crf 26 \
  -pix_fmt yuv420p -g 30 -movflags +faststart -an assets/video/led-wall.mp4
# VP9 для Chrome / Firefox: обычно в 2–3 раза легче
ffmpeg -i flow-led.mp4 -vf "scale=1280:-2,fps=30" -c:v libvpx-vp9 -crf 38 -b:v 0 \
  -row-mt 1 -pix_fmt yuv420p -an assets/video/led-wall.webm
# постер: показывается до загрузки и при «Движение: выкл.»
ffmpeg -i flow-led.mp4 -frames:v 1 -vf scale=1280:-2 -c:v libwebp -quality 70 \
  assets/video/led-wall-poster.webp
```

После замены любых файлов в `assets/fonts`, `assets/img` или `assets/video` запусти
`python3 scripts/pack_motion_assets.py`. Медиа хранятся в `config/motion-assets/` как
base64-части с SHA-256 (GitHub MCP передаёт только текст), а сборка Pages декодирует их
обратно в обычные файлы. Браузер base64 не скачивает.

Если конец ролика не совпал с началом, склей петлю перекрёстным растворением
последней секунды в первую (для 8-секундного ролика; результат длиной 7 с):

```sh
ffmpeg -i flow-raw.mp4 -filter_complex \
 "[0:v]split[s1][s2];[s1]trim=start=1:end=8,setpts=PTS-STARTPTS,fps=30[a];[s2]trim=start=0:end=1,setpts=PTS-STARTPTS,fps=30[b];[a][b]xfade=transition=fade:duration=1:offset=6[v]" \
 -map "[v]" -an -c:v libx264 -crf 18 -pix_fmt yuv420p flow-led.mp4
```

Для карточек направлений замени `<img>` внутри `.way-media` в
`web/index.template.html` на видео; картинка остаётся постером:

```html
<video src="assets/video/way-make.mp4" poster="assets/img/make.webp"
       muted loop playsinline autoplay preload="metadata"
       width="1312" height="816" aria-hidden="true"></video>
```

Затем `python3 scripts/pack_motion_assets.py` и `python3 scripts/update.py --render-only`.
Видео в карточках сделай легче LED-стены: 960 px по ширине, `-crf 28`. При системной настройке
«уменьшить движение» лучше оставить постер (`autoplay` убрать и запускать
`play()` только если `MR.motionAllowed()`).

Если захочешь видео, которое прокручивается скроллом, как в
[scroll-craft](https://github.com/nateherkai/scroll-craft), кодируй с частыми
ключевыми кадрами: `-c:v libx264 -crf 20 -g 8 -keyint_min 8 -sc_threshold 0 -an`.
Справочник лежит в `.agents/skills/scroll-craft/` (MIT).

## Права

Сгенерированные ролики проверь по условиям Google Flow / Veo своего аккаунта.
В них не должно быть узнаваемых людей, логотипов и чужих персонажей. Добавь
в `IMAGE_CREDITS.md` строку: что за ролик, модель, дата, исходный кадр.

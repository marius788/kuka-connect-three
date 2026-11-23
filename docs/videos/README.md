# 🎥 Videos

## Full Demo (Real KUKA Cell)

The complete game + cleanup is **92 MB** (`Video von marius keck` — raw MP4 from the KRC4 cell).

### Option A — Google Drive (current, works immediately)
- **Link:** https://drive.google.com/file/d/11IhQFTRbLN98H1OE9pHZy4h9QzOdAfaD/preview
- Embedded in `docs/Dokumentation_V2.html` and in the main `README.md` thumbnail.

### Option B — YouTube (recommended for portfolio / README embed)
1. Upload the MP4 to YouTube as **Unlisted**.
2. Title: `KUKA KRC4 — Connect Three | Autonomous Game (HKA Robotics)`
3. Description: Copy the first 3 paragraphs from the main README + link to this repo.
4. Replace the Drive `iframe` in `README.md` with:

   ```markdown
   [![Demo](docs/images/image4_roboter_setup.jpg)](https://www.youtube.com/watch?v=YOUR_ID)
   # or embedded:
   # https://www.youtube-nocookie.com/embed/YOUR_ID
   ```

5. (Optional) Add a 10–15s GIF preview: `ffmpeg -i input.mp4 -vf "fps=10,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 preview.gif`

### Option C — GitHub Release (keeps repo lean)
- Keep the MP4 **out** of git history.
- Create a Release: `gh release create v1.0 docs/videos/demo.mp4 --title "Demo Video" --notes "Full KUKA cell demo"`
- Link in README: `https://github.com/marius788/kuka-connect-three/releases/download/v1.0/demo.mp4`

---

## Thumbnail

- `assets/images/Video Demo.jpg` and `docs/images/image4_roboter_setup.jpg` are used as click-to-play thumbnails in the README.
- To generate a custom thumbnail from the video: `ffmpeg -ss 00:00:02 -i input.mp4 -vframes 1 thumbnail.jpg`

## Why not in the main repo?

GitHub warns on files >50 MB and blocks >100 MB. The 92 MB MP4 is *technically* pushable but makes clones slow. The pattern above keeps the repo fast while still showcasing the video.

> If you want the MP4 in the repo anyway, place it here as `docs/videos/demo.mp4` and commit — `0.00.00.18` / MP4 magic is already verified.

# 1.8.0 (2023/02/03)
- Install ServiceWorker so that MSXplay works as a PWA.

# 1.7.5 (2023/12/25)
- Fixed the problem where `loop` directive was ignored.

# 1.7.4 (2023/12/04)
- Fixed the problem when exporting MML for MSX-DOS where an extra `EOF` marker was added even if it already exists.
- Fixed the problem where the name specified by the meta `name` directive was not reflected when exporting MML without pre-compiling.
- Updated `mgsrc-js` (reverse compiler) to generate `l%2` instead of `l96` that often causes compilation error.

# 1.7.3 (2023/12/03)
- Removed `play after compile` checkbox.

# 1.7.2 (2023/11/27)
- Fixed the problem where `l%n` was not highlighted.

# 1.7.1 (2023/11/25)
- Fixed the problem where the background theme was not immediately changed on Safari.

# 1.7.0 (2023/11/24)
- Fixed the problem where finite-length music was unexpectedly fading on replay.
- Enhanced MML syntax highlighting.

# 1.6.2 (2023/11/07)
- Added functionality for exporting MML in MSX-DOS format.

# 1.6.0 (2023/08/19)
- Fixed the problem where playback rate was ~1.7% higher than real hardware (thanks to @gcielniak).

# 1.5.0 (2023/04/02)
- Replaced the playback engine to use AudioWorklet.

# 1.4.1 (2023/04/01)
- Fixed the problem where background audio playback was not allowed.
- 
# 1.4.0 (2023/02/06)
- Added `loop` property for meta MML params.
- Fixed the problem where fade time was always set zero when export.

# 1.3.0
- Improved PSG emulation quality.

# 1.2.3
- Updated libkss (again) to fix [emu2413 issue #12](https://github.com/digital-sound-antiques/emu2413/issues/12)

# 1.2.2
- Now loading lamejs dynaimcally to reduce JS footprint.
- Updated libkss to fix [emu2413 issue #12](https://github.com/digital-sound-antiques/emu2413/issues/12)

# 1.2.1
- Added a progress indicator and an abort button on the VGM exporter modal.

# 1.2.0
- Added VGM exporter.
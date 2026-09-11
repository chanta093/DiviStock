#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
ffmpeg -y -loop 1 -i "$project_dir/assets/dashboard.png" -i "$project_dir/assets/divistock-narration.mp3" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x0c1412,subtitles=$project_dir/docs/presentation-captions.srt:force_style='FontName=DejaVu Sans,FontSize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BorderStyle=3,Outline=2,Alignment=2,MarginV=32'" -shortest -r 30 -pix_fmt yuv420p -c:v libx264 -preset ultrafast -c:a aac "$project_dir/assets/divistock-presentation.mp4"

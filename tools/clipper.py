import csv
import subprocess
import os

def time_to_seconds(time_str):
    """Converts HH:MM:SS or MM:SS to seconds."""
    parts = time_str.split(':')
    if len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    elif len(parts) == 2:
        return int(parts[0]) * 60 + int(parts[1])
    elif len(parts) == 1:
        try:
            return int(parts[0]) # Assuming it's already in seconds
        except ValueError:
            raise ValueError(f"Timestamp '{time_str}' is not a valid integer for seconds.")
    else:
        raise ValueError(f"Invalid time format: {time_str}")

def create_clips(video_url, timestamps_csv_path, output_folder="clips", clip_duration=10): # <<-- MODIFIED HERE
    """
    Downloads (if needed) and clips a YouTube video based on timestamps.
    Now clips for the specified duration (default 15 seconds).
    """
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    try:
        process = subprocess.run(
            ['yt-dlp', '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', '--get-url', video_url],
            capture_output=True, text=True, check=True, encoding='utf-8'
        )
        # Handle cases where yt-dlp might return multiple URLs (e.g., video and audio separately)
        # We'll try to pick the first one that seems like a video URL.
        # If yt-dlp provides separate video and audio, ffmpeg can handle them as separate inputs.
        # For simplicity here, we assume a single combined stream URL or the video-only URL.
        # More complex handling might be needed for DASH streams if ffmpeg needs separate inputs.
        urls = process.stdout.strip().split('\n')
        actual_video_url = urls[0] # Pick the first URL
        print(f"Using direct video URL: {actual_video_url}")
        input_source = actual_video_url
        # If yt-dlp returns separate video and audio, and you want to use both:
        # video_url_from_dlp = urls[0]
        # audio_url_from_dlp = urls[1] if len(urls) > 1 else None
        # input_source = video_url_from_dlp # and add audio_url_from_dlp as another -i for ffmpeg if needed
    except subprocess.CalledProcessError as e:
        print(f"Error getting video URL with yt-dlp: {e.stderr}")
        print("Falling back to using the YouTube page URL directly with ffmpeg (might be slower or fail).")
        input_source = video_url
    except FileNotFoundError:
        print("Error: yt-dlp command not found. Please ensure it's installed and in your system's PATH.")
        return

    with open(timestamps_csv_path, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        if not reader.fieldnames or 'Timestamp' not in reader.fieldnames:
            print("Error: CSV file must have a header row with at least a 'Timestamp' column.")
            return

        for i, row in enumerate(reader):
            start_time_str = row.get('Timestamp')
            if not start_time_str:
                print(f"Skipping row {i+1} due to missing 'Timestamp'.")
                continue

            try:
                start_seconds = time_to_seconds(start_time_str.strip())
            except ValueError as e:
                print(f"Skipping row {i+1} with invalid timestamp '{start_time_str}': {e}")
                continue

            clip_name_base = row.get('ClipName', f'clip_{i+1}_{start_time_str.replace(":", "-")}')
            output_clip_name = "".join(c if c.isalnum() or c in ['_', '-'] else '_' for c in clip_name_base) # Sanitize filename
            output_filepath = os.path.join(output_folder, f"{output_clip_name}.mp4")

            print(f"Processing clip: {output_clip_name} starting at {start_time_str} ({start_seconds}s) for {clip_duration}s")

            ffmpeg_command = [
                'ffmpeg',
                '-ss', str(start_seconds),
                '-i', input_source,
                # If input_source was just video and you have audio_url_from_dlp:
                # '-i', audio_url_from_dlp, # if you had a separate audio URL
                '-t', str(clip_duration), # Duration of the clip
                '-c', 'copy',
                '-y',
                output_filepath
            ]
            # If you had separate video and audio inputs and are using "-c copy",
            # you might need to map them: e.g. '-map', '0:v', '-map', '1:a'
            # For a single input_source, this is not needed.

            try:
                subprocess.run(ffmpeg_command, check=True, capture_output=True, text=True, encoding='utf-8')
                print(f"Successfully created: {output_filepath}")
            except subprocess.CalledProcessError as e:
                print(f"Error creating clip {output_clip_name} with -c copy: {e.stderr}")
                print("Trying again without '-c copy' (will re-encode)...")
                ffmpeg_command_reencode = [
                    'ffmpeg',
                    '-ss', str(start_seconds),
                    '-i', input_source,
                    # '-i', audio_url_from_dlp, # if you had a separate audio URL
                    '-t', str(clip_duration),
                    '-c:v', 'libx264', # Example re-encode video codec
                    '-c:a', 'aac',    # Example re-encode audio codec
                    '-preset', 'fast', # Faster encoding, larger file
                    '-y',
                    output_filepath
                ]
                try:
                    subprocess.run(ffmpeg_command_reencode, check=True, capture_output=True, text=True, encoding='utf-8')
                    print(f"Successfully re-encoded and created: {output_filepath}")
                except subprocess.CalledProcessError as e2:
                    print(f"Still failed to create clip {output_clip_name} even with re-encoding: {e2.stderr}")
            except FileNotFoundError:
                print("Error: ffmpeg command not found. Please ensure it's installed and in your system's PATH.")
                return # Stop processing if ffmpeg is not found


if __name__ == "__main__":
    youtube_url = input("Enter the YouTube video URL: ")
    csv_file = input("Enter the path to your timestamps CSV file: ")
    # You could also ask for clip duration here if you want it to be dynamic each run:
    # clip_duration_input = input("Enter clip duration in seconds (default is 15): ")
    # custom_clip_duration = int(clip_duration_input) if clip_duration_input.isdigit() else 15

    # create_clips(youtube_url, csv_file, clip_duration=custom_clip_duration)
    create_clips(youtube_url, csv_file) # Uses the default 15s from the function definition
    print("Clipping process finished.")
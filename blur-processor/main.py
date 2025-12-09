import os
import subprocess
import tempfile
import json
from flask import Flask, request, jsonify
from google.cloud import storage

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'})

@app.route('/blur', methods=['POST'])
def blur_video():
    try:
        data = request.json
        source_path = data.get('sourcePath')
        output_path = data.get('outputPath')
        faces = data.get('faces', [])
        bucket_name = data.get('bucket')
        
        if not all([source_path, output_path, bucket_name]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        
        ext = os.path.splitext(source_path)[1] or '.mp4'
        
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as input_tmp:
            input_file = input_tmp.name
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as output_tmp:
            output_file = output_tmp.name
        
        try:
            print(f"Downloading {source_path}")
            blob = bucket.blob(source_path)
            blob.download_to_filename(input_file)
            
            # Get video info including rotation
            probe_cmd = [
                'ffprobe', '-v', 'error', '-select_streams', 'v:0',
                '-show_entries', 'stream=width,height,rotation:stream_tags=rotate',
                '-of', 'json', input_file
            ]
            probe = subprocess.run(probe_cmd, capture_output=True, text=True)
            
            try:
                probe_data = json.loads(probe.stdout)
                stream = probe_data.get('streams', [{}])[0]
                width = int(stream.get('width', 1920))
                height = int(stream.get('height', 1080))
                rotation = int(stream.get('rotation', 0) or stream.get('tags', {}).get('rotate', 0) or 0)
            except:
                width, height, rotation = 1920, 1080, 0
            
            print(f"Video: {width}x{height}, rotation: {rotation}, Faces: {len(faces)}")
            print(f"Face data received: {json.dumps(faces, indent=2)}")
            
            # Handle rotation - swap dimensions if rotated 90/270
            display_width, display_height = width, height
            if abs(rotation) in [90, 270]:
                display_width, display_height = height, width
            
            print(f"Display dimensions: {display_width}x{display_height}")
            
            if faces and len(faces) > 0:
                filter_str = ""
                prev_output = "0:v"
                
                for i, face in enumerate(faces):
                    # Get normalized coordinates
                    nx = face.get('x', 0)
                    ny = face.get('y', 0)
                    nw = face.get('width', 0.1)
                    nh = face.get('height', 0.1)
                    start = face.get('startTime', 0)
                    end = face.get('endTime', 9999)
                    
                    print(f"Face {i} normalized: x={nx:.3f}, y={ny:.3f}, w={nw:.3f}, h={nh:.3f}")
                    
                    # Convert to pixel coordinates using display dimensions
                    fx = int(nx * display_width)
                    fy = int(ny * display_height)
                    fw = int(nw * display_width)
                    fh = int(nh * display_height)
                    
                    # Add padding
                    pad = int(max(fw, fh) * 0.4)
                    fx = max(0, fx - pad)
                    fy = max(0, fy - pad)
                    fw = min(display_width - fx, fw + 2 * pad)
                    fh = min(display_height - fy, fh + 2 * pad)
                    
                    print(f"Face {i} pixels: x={fx}, y={fy}, w={fw}, h={fh}, time={start:.1f}-{end:.1f}s")
                    
                    if i == 0:
                        filter_str += f"[{prev_output}]split[base{i}][blur{i}];"
                    else:
                        filter_str += f"[out{i-1}]split[base{i}][blur{i}];"
                    
                    filter_str += f"[blur{i}]crop={fw}:{fh}:{fx}:{fy},boxblur=50:15[blurred{i}];"
                    filter_str += f"[base{i}][blurred{i}]overlay={fx}:{fy}:enable='between(t,{start},{end})'[out{i}];"
                
                filter_str = filter_str.rstrip(';')
                final_output = f"out{len(faces)-1}"
                
                ffmpeg_cmd = [
                    'ffmpeg', '-i', input_file,
                    '-filter_complex', filter_str,
                    '-map', f'[{final_output}]', '-map', '0:a?',
                    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
                    '-c:a', 'aac',
                    '-y', output_file
                ]
            else:
                print("No faces, copying video")
                ffmpeg_cmd = ['ffmpeg', '-i', input_file, '-c:v', 'libx264', '-c:a', 'aac', '-y', output_file]
            
            print(f"Running FFmpeg...")
            result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True, timeout=600)
            
            if result.returncode != 0:
                print(f"FFmpeg stderr: {result.stderr}")
                return jsonify({'error': 'FFmpeg failed', 'details': result.stderr[-1000:]}), 500
            
            print(f"Uploading to {output_path}")
            output_blob = bucket.blob(output_path)
            output_blob.upload_from_filename(output_file, content_type='video/mp4')
            output_blob.make_public()
            
            return jsonify({'success': True, 'outputPath': output_path, 'url': output_blob.public_url})
        finally:
            if os.path.exists(input_file):
                os.unlink(input_file)
            if os.path.exists(output_file):
                os.unlink(output_file)
                
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))

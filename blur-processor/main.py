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
            
            print(f"Faces received: {json.dumps(faces)}")
            
            if faces and len(faces) > 0:
                # Build time-based enable condition for full-frame blur
                # Blur when ANY face is visible
                time_conditions = []
                for i, face in enumerate(faces):
                    start = face.get('startTime', 0)
                    end = face.get('endTime', 9999)
                    print(f"Face {i}: visible from {start:.1f}s to {end:.1f}s")
                    time_conditions.append(f"between(t,{start},{end})")
                
                # Combine with OR - blur if any face is visible
                enable_condition = "+".join(time_conditions)
                
                # Simple full-frame blur with time-based enable
                filter_str = f"boxblur=50:15:enable='{enable_condition}'"
                
                print(f"Filter: {filter_str}")
                
                ffmpeg_cmd = [
                    'ffmpeg', '-i', input_file,
                    '-vf', filter_str,
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

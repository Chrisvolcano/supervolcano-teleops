import os
import subprocess
import tempfile
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
        
        with tempfile.TemporaryDirectory() as tmpdir:
            input_file = os.path.join(tmpdir, 'input.mp4')
            output_file = os.path.join(tmpdir, 'output.mp4')
            
            print(f"Downloading {source_path}")
            blob = bucket.blob(source_path)
            blob.download_to_filename(input_file)
            
            if faces and len(faces) > 0:
                filter_complex = "boxblur=15:5"
                ffmpeg_cmd = ['ffmpeg', '-i', input_file, '-vf', filter_complex, '-c:a', 'copy', '-y', output_file]
            else:
                ffmpeg_cmd = ['ffmpeg', '-i', input_file, '-c', 'copy', '-y', output_file]
            
            print(f"Running FFmpeg")
            result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                return jsonify({'error': 'FFmpeg failed', 'details': result.stderr}), 500
            
            print(f"Uploading to {output_path}")
            output_blob = bucket.blob(output_path)
            output_blob.upload_from_filename(output_file, content_type='video/mp4')
            output_blob.make_public()
            
            return jsonify({'success': True, 'outputPath': output_path, 'url': output_blob.public_url})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))

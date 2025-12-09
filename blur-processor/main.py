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
        
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as input_tmp:
            input_file = input_tmp.name
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as output_tmp:
            output_file = output_tmp.name
        
        try:
            print(f"Downloading {source_path}")
            blob = bucket.blob(source_path)
            blob.download_to_filename(input_file)
            
            # Get video dimensions
            probe_cmd = [
                'ffprobe', '-v', 'error',
                '-select_streams', 'v:0',
                '-show_entries', 'stream=width,height',
                '-of', 'csv=p=0',
                input_file
            ]
            probe_result = subprocess.run(probe_cmd, capture_output=True, text=True)
            width, height = map(int, probe_result.stdout.strip().split(','))
            print(f"Video dimensions: {width}x{height}")
            
            if faces and len(faces) > 0:
                # Build filter for each face region
                # Uses delogo-style approach: blur specific regions
                filter_parts = []
                
                for i, face in enumerate(faces):
                    # Convert normalized coords to pixels with padding
                    fx = int(face['x'] * width)
                    fy = int(face['y'] * height)
                    fw = int(face['width'] * width)
                    fh = int(face['height'] * height)
                    
                    # Add 20% padding around face
                    pad_x = int(fw * 0.2)
                    pad_y = int(fh * 0.2)
                    fx = max(0, fx - pad_x)
                    fy = max(0, fy - pad_y)
                    fw = min(width - fx, fw + 2 * pad_x)
                    fh = min(height - fy, fh + 2 * pad_y)
                    
                    print(f"Face {i}: x={fx}, y={fy}, w={fw}, h={fh}")
                    
                    # Create blur box for this face
                    # Using drawbox with pixelize effect via scale down then up
                    filter_parts.append(
                        f"boxblur=luma_radius=30:luma_power=3:enable='1':x={fx}:y={fy}:w={fw}:h={fh}"
                    )
                
                # For multiple faces, use split/overlay approach
                # Simpler: apply heavy blur to face regions using multiple crop+blur+overlay
                filter_complex = f"[0:v]split={len(faces)+1}"
                for i in range(len(faces) + 1):
                    filter_complex += f"[v{i}]"
                filter_complex += ";"
                
                for i, face in enumerate(faces):
                    fx = int(face['x'] * width)
                    fy = int(face['y'] * height)
                    fw = int(face['width'] * width)
                    fh = int(face['height'] * height)
                    
                    pad_x = int(fw * 0.3)
                    pad_y = int(fh * 0.3)
                    fx = max(0, fx - pad_x)
                    fy = max(0, fy - pad_y)
                    fw = min(width - fx, fw + 2 * pad_x)
                    fh = min(height - fy, fh + 2 * pad_y)
                    
                    if i == 0:
                        filter_complex += f"[v{i}]crop={fw}:{fh}:{fx}:{fy},boxblur=40:10[blur{i}];"
                        filter_complex += f"[v{len(faces)}][blur{i}]overlay={fx}:{fy}[out{i}];"
                    else:
                        filter_complex += f"[v{i}]crop={fw}:{fh}:{fx}:{fy},boxblur=40:10[blur{i}];"
                        filter_complex += f"[out{i-1}][blur{i}]overlay={fx}:{fy}[out{i}];"
                
                # Final output
                final_out = f"out{len(faces)-1}"
                
                ffmpeg_cmd = [
                    'ffmpeg', '-i', input_file,
                    '-filter_complex', filter_complex,
                    '-map', f'[{final_out}]', '-map', '0:a?',
                    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
                    '-c:a', 'copy', '-movflags', '+faststart',
                    '-y', output_file
                ]
            else:
                ffmpeg_cmd = ['ffmpeg', '-i', input_file, '-c', 'copy', '-y', output_file]
            
            print(f"Running FFmpeg")
            result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                print(f"FFmpeg error: {result.stderr}")
                return jsonify({'error': 'FFmpeg failed', 'details': result.stderr}), 500
            
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
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))

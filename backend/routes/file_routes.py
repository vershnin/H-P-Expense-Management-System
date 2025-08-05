from flask import Blueprint, request, jsonify, send_file, current_app
import os
import logging
from utils.auth import jwt_required

file_bp = Blueprint('files', __name__)

@file_bp.route('/<filename>')
@jwt_required
def download_file(filename):
    try:
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        if os.path.exists(file_path):
            return send_file(file_path)
        else:
            return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        logging.error(f"Error downloading file: {str(e)}")
        return jsonify({'error': 'Failed to download file'}), 500
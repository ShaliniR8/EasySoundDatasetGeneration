import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from python_helpers.dataset_functions import validate_csv, dataset_feature_extraction

app = Flask(__name__)
CORS(app)
app.config['UPLOAD_FOLDER'] = 'extracted'
app.config['FLASK_DIRECTORY'] = os.path.dirname(os.path.realpath(__file__))
socketio = SocketIO(app, cors_allowed_origins="*")

@app.route('/api/v1/datasets/validate_csv', methods=['POST'])
def validate():
    response, status_code = validate_csv(app.config['UPLOAD_FOLDER'], app.config['FLASK_DIRECTORY'])
    return jsonify(response), status_code

@app.route('/api/v1/datasets/feature_extraction', methods=['POST'])
def feature_extraction():
    socketio.start_background_task(target=dataset_feature_extraction, socketio_obj=socketio)
    return jsonify({"status": "success", "message": "Feature extraction started"}), 200

@socketio.on('connect')
def on_connect():
    emit('status', {'message': 'Connection established'})

@socketio.on('disconnect')
def on_disconnect():
    print("WebSocket disconnected")

@app.route('/api/v1/home', methods=['GET'])
def home():
    data = {'message': 'Backend is running.'}
    return jsonify(data)


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)

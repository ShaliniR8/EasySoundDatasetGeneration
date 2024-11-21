import os
from python_helpers.validate import validate_csv
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  
app.config['UPLOAD_FOLDER'] = 'extracted'

@app.route('/api/v1/datasets/validate_csv', methods=['POST'])
def validate():
    response, status_code = validate_csv(os.path.join(app.config['UPLOAD_FOLDER'], 'metadata.csv'))
    return jsonify(response), status_code

@app.route('/api/home', methods=['GET'])
def home():
    data = {'message': 'Backend is running.'}
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True)

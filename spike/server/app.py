from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # dev: allow React origin

@app.get("/")
def hello():
    return jsonify(msg="Hello from Flask")

if __name__ == "__main__":
    app.run(port=5000, debug=True)

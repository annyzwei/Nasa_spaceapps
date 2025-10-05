from flask import Flask, jsonify
from flask_cors import CORS
from apis.get_summary_api import get_summary

app = Flask(__name__)
CORS(app)  # dev: allow React origin

@app.get("/api/hello")
def hello():
    return jsonify(msg="screw u nancy")

@app.get("/s")
def hello2():
    return jsonify(msg="Hello from Flask")

@app.get("/get_summary/<title>")
def get_ai_summary(title):
    result = get_summary(title)
    print("------------")
    print(result)
    return result

if __name__ == "__main__":
    app.run(port=5000, debug=True)

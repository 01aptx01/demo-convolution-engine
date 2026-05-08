from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Preset kernels for teaching/demos.
# Returned as JSON so the frontend can apply them to the client-side engine.
KERNELS = {
    "sobel_x": [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]],
    "sobel_y": [[-1, -2, -1], [0, 0, 0], [1, 2, 1]],
    "laplacian": [[0, 1, 0], [1, -4, 1], [0, 1, 0]],
    "sharpen": [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
    "box_blur": [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
}


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/kernels")
def kernels():
    return jsonify(KERNELS)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)


# X-Ray Vision: Matrix Convolution Engine (Next.js + Flask)

Interactive educational web application that demonstrates the **raw mathematics** behind image filtering and edge detection using a **from-scratch** 3×3 convolution engine.

Crucial constraint: **No ready-made computer vision libraries** (e.g. OpenCV). The client-side engine operates directly on `ImageData` RGBA arrays and uses pure math.

## Architecture

```mermaid
flowchart LR
  BrowserUI[BrowserUI_Nextjs] -->|uploadImage| CanvasHidden[HiddenCanvas_ImageData]
  CanvasHidden -->|rgbaUint8ClampedArray| GrayscaleFn[rgbaToGrayscaleLuma]
  GrayscaleFn -->|grayFloat32| ConvolutionFn[convolve3x3Gray]
  ConvolutionFn -->|resultUint8Clamped| CanvasOutput[OutputCanvas]
  BrowserUI -->|fetchPresets| FlaskAPI[FlaskAPI]
  FlaskAPI -->|jsonPresets| BrowserUI
```

- **Frontend**: Next.js (App Router) + Tailwind CSS + HTML5 `<canvas>` + TypeScript
- **Algorithm execution**: Client-side TypeScript using standard/typed arrays
- **Backend**: Flask (Python) for kernel presets and future storage/config endpoints
- **Deployment**: Docker + Docker Compose

## Repo layout

```
.
├─ web/                      # Next.js app (UI + canvas + math engine)
│  ├─ src/app/page.tsx        # Upload + canvases + kernel grid + live recompute
│  ├─ src/components/
│  │  └─ KernelGrid3x3.tsx    # 3×3 kernel input grid component
│  └─ src/lib/cv/
│     ├─ grayscale.ts         # RGBA -> grayscale luma (Float32)
│     ├─ convolution3x3.ts    # Sliding-window 3×3 convolution (O(N×M))
│     └─ grayToRgba.ts        # Grayscale U8 -> RGBA for canvas ImageData
├─ server/
│  ├─ main.py                 # Flask API: /health and /kernels
│  └─ requirements.txt        # flask, flask-cors
└─ docker-compose.yml         # Run web + server together
```

## The math pipeline (what happens in the browser)

### 1) UI & Canvas Setup (RGBA extraction)
1. User uploads an image in the UI.
2. The browser decodes it via `createImageBitmap(file)`.
3. It is drawn to a **staging (hidden) canvas**.
4. We extract raw pixels:
   - `ctx.getImageData(0, 0, w, h).data`
   - This returns a `Uint8ClampedArray` laid out as **RGBA** in a 1D array:
     - `rgba[i+0]=R, rgba[i+1]=G, rgba[i+2]=B, rgba[i+3]=A`

Key code lives in `web/src/app/page.tsx` (`fileToRgba()`).

### 2) Grayscale conversion (pure math)
We convert RGB to grayscale luminance (Rec.601 luma):

\[
Y = 0.299R + 0.587G + 0.114B
\]

Implementation: `web/src/lib/cv/grayscale.ts` (`rgbaToGrayscaleLuma`).

- Input: `Uint8ClampedArray` RGBA
- Output: `Float32Array` grayscale (one value per pixel)

### 3) 3×3 Convolution engine (sliding window, O(N×M))
For each pixel, we take its **3×3 neighborhood** and compute a dot product with a **dynamic 3×3 kernel**:

\[
out(x,y) = \\sum_{j=-1}^{1} \\sum_{i=-1}^{1} k(i,j)\\cdot gray(x+i, y+j)
\]

- **Border policy**: clamp-to-edge (replicate edges) so output is same size.
- **Educational knobs**:
  - `scale`: normalize kernels (e.g. box blur uses scale \(1/9\))
  - `bias`: shift output (e.g. `128` to visualize signed gradients)
- Final output is clamped to `0..255` for display.

Implementation: `web/src/lib/cv/convolution3x3.ts` (`convolve3x3Gray`).

### 4) Real-time interactivity (3×3 kernel grid)
The UI renders a 3×3 numeric input grid and binds it to React state.
Any coefficient change triggers immediate re-computation and redraw.

- Component: `web/src/components/KernelGrid3x3.tsx`
- Wiring: `web/src/app/page.tsx`

### 5) Convert filtered grayscale back to RGBA for canvas
Canvas `ImageData` expects RGBA, so we expand 1-channel grayscale to RGBA with alpha=255.

Implementation: `web/src/lib/cv/grayToRgba.ts` (`grayU8ToRgba`).

## Flask backend

Location: `server/main.py`

Endpoints:
- `GET /health` → `{ "ok": true }`
- `GET /kernels` → JSON map of preset kernels:
  - Sobel X/Y, Laplacian, Sharpen, Box blur

Notes:
- CORS is enabled via `flask-cors` for frontend integration.
- The current UI does not yet fetch these presets (the endpoint is ready).

## Run with Docker Compose (recommended)

From repo root:

```bash
docker compose up --build
```

- Web: `http://localhost:3000`
- Server: `http://localhost:5000`

## Run locally (without Docker)

### Frontend

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:3000`.

### Backend

```bash
cd server
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Open:
- `http://localhost:5000/health`
- `http://localhost:5000/kernels`

## Implementation notes / constraints
- **No OpenCV / no CV libraries**: all image operations are implemented from scratch on raw arrays.
- **Performance**: inner loops use typed arrays and simple arithmetic. The convolution is the classic \(O(N\\times M)\) sliding window for a 3×3 kernel.

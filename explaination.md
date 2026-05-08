# X-Ray Vision: Matrix Convolution Engine — Explaination (ฉบับอ่านเข้าใจครบ)

เอกสารนี้อธิบายว่า **โปรเจกต์ทำอะไรได้บ้าง** และ **ทำงานยังไง** แบบ “white-box” เพื่อใช้สอนคณิตศาสตร์ของ Computer Vision โดยตรง (ทำเองจากศูนย์, ไม่ใช้ OpenCV/ML)

> หมายเหตุ: ชื่อไฟล์ใช้คำว่า `explaination.md` ตามที่ขอ (สะกดตามนี้)

## เป้าหมายของโปรเจกต์
- สอนแนวคิดหลักของ image processing จาก **พิกเซลดิบ**:
  - การอ่าน `RGBA` จาก `Canvas ImageData`
  - การแปลง `RGB → Grayscale`
  - การทำ **Convolution (Dot Product)** ด้วย kernel ขนาดต่างๆ
  - การจัดการ **ขอบภาพ (Border policy)**
  - การดู **time complexity** และ performance engineering
- ให้ “เห็นสมการจริง” ต่อพิกเซล ไม่ใช่ filter แบบกล่องดำ

## โครงสร้างระบบ (ภาพรวม)

**Frontend (Next.js)** ทำงานหลักทั้งหมด:
- รับรูปจาก Upload หรือ Webcam
- ประมวลผลด้วย typed arrays (`Float32Array`, `Uint8ClampedArray`)
- วาดผลลัพธ์กลับไปที่ `<canvas>`

**Backend (Flask)** เป็น skeleton สำหรับ presets:
- `GET /kernels` ส่ง preset kernels (สำหรับอนาคต/ขยาย)

## Repo layout (ส่วนสำคัญ)
- `web/src/app/page.tsx`: UI หลัก + realtime loop + state + wiring ทุก feature
- `web/src/lib/cv/`:
  - `grayscale.ts`: RGBA → grayscale (มี `_Into` สำหรับ reuse buffer)
  - `convolutionNxN.ts`: NxN convolution + border policy + float output
  - `convolution3x3.ts`: wrapper 3×3 ที่ delegate ไป NxN (เพื่อ backward compatibility)
  - `sobelMagnitude.ts`: Sobel Gx/Gy + magnitude L1/L2
  - `inspector3x3.ts`: Math Inspector 3×3 (hover)
  - `inspectorNxN.ts`: Debugger equation NxN (step-through)
- `web/src/components/`:
  - `MathInspectorOverlay.tsx`: panel ลอยเวลา hover
  - `KernelGridNxN.tsx`: grid kernel 3/5/7
  - `SlidingWindowDebugger.tsx`: slider/stepper (pause mode)
  - `PerfOverlay.tsx`: FPS + allocations counter
- `web/src/lib/ui/drawKernelOverlay.ts`: วาดกรอบ highlight NxN บน input
- `web/src/hooks/useQueryState.ts`: encode/decode state เข้า URL query
- `web/src/hooks/useWebcamStream.ts`: getUserMedia lifecycle (start/stop)

---

## 1) สิ่งที่โปรเจกต์ทำได้ (Feature list)

### 1.1 แหล่งภาพ (Source)
- **Upload mode**: เลือกรูปจากเครื่อง → ประมวลผลทันที
- **Webcam mode**: ใช้กล้อง → ประมวลผลทีละเฟรมด้วย `requestAnimationFrame`

### 1.2 Convolution Kernel แบบ NxN
- เลือกขนาด kernel: **3×3 / 5×5 / 7×7**
- กรอกค่าทุกช่องได้เอง (row-major)
- มี `scale` / `bias` เพื่อช่วยสอน:
  - `scale`: normalization (เช่น blur)
  - `bias`: shift ค่าเพื่อ visualize signed / gradient

### 1.3 Border Policy Toggle (สอน edge cases ที่ขอบภาพ)
- เลือกได้ 3 แบบ:
  - **`clamp`**: นอกภาพ “เกาะขอบ” (replicate edge)
  - **`zero`**: นอกภาพเป็น 0 (zero padding)
  - **`wrap`**: นอกภาพ “วนรอบ” (toroidal wrap-around)

### 1.4 Sobel Edges (Gx + Gy) + Magnitude
- โหมด **edges = sobel** ทำ “2 convolution”:
  - \(G_x = K_x * I\)
  - \(G_y = K_y * I\)
- แล้ว combine เป็น “edge strength”:
  - **L1 (เร็ว)**: \(M = |G_x| + |G_y|\)
  - **L2 (canonical)**: \(M = \sqrt{G_x^2 + G_y^2}\)

### 1.5 Math Inspector (Hover output แล้วเห็นสมการจริง)
เมื่อเอาเมาส์ชี้บน output canvas จะมี panel ลอย แสดง:
- (x, y) ของพิกเซล
- ค่า grayscale neighborhood 3×3 (inputs)
- ค่า kernel 3×3
- สมการ dot product แบบเต็มบรรทัด และค่า:
  - `sum`
  - `sum*scale + bias`
  - `clamp(0..255)`
  - ค่า output แบบ U8

### 1.6 Step-through Sliding Window Debugger (Boss Level)
- กด **Pause** เพื่อหยุด realtime และ “freeze” เฟรมล่าสุด
- ใช้ slider/ปุ่ม stepper หรือกดปุ่มลูกศรบนคีย์บอร์ดเพื่อเลื่อนหน้าต่าง
- ระบบจะ:
  - วาดกรอบ highlight NxN บน input canvas
  - แสดงสมการ dot product แบบ NxN (ยาวตามขนาด kernel)

### 1.7 Shareable State (URL Query)
- ทุกค่าหลักถูก encode ลง URL เช่น:
  - `kSize`, `k` (kernel values), `scale`, `bias`, `policy`
  - `source` (upload/webcam), `edge` (off/sobel), `mag` (l1/l2), `paused`
- ส่ง URL ให้คนอื่นเปิด → ได้ state เดิมทันที เหมาะกับการสอน/แจกโจทย์

### 1.8 Performance Overlay (FPS + Allocations)
- แสดง FPS (moving average)
- แสดง “Allocations/frame (app)”:
  - นับเฉพาะตอน **โค้ดเรา** ต้องสร้าง/ขยาย buffer (เช่น ความละเอียดเปลี่ยน)
  - ทำให้โชว์แนวคิด **reuse typed arrays** ได้ชัด
  - หมายเหตุ: Browser อาจ allocate ภายใน `getImageData()` ซึ่งอยู่นอกการควบคุมของเรา

---

## 2) อธิบายการทำงานแบบเป็นขั้น (Pipeline)

### 2.1 จากแหล่งภาพ → RGBA
- **Upload**:
  - decode ด้วย `createImageBitmap(file)`
  - วาดลง canvas staging
  - `ctx.getImageData(0,0,w,h).data` → `Uint8ClampedArray` RGBA
- **Webcam**:
  - `navigator.mediaDevices.getUserMedia(...)` → stream
  - bind `stream` ให้ `<video>`
  - ใน `requestAnimationFrame`: `drawImage(video)` → `getImageData()`

### 2.2 RGBA → Grayscale (Float32)
ใช้สมการลูม่า (Rec.601):

\[
Y = 0.299R + 0.587G + 0.114B
\]

เหตุผลที่เก็บเป็น `Float32Array`:
- ขั้น convolution เป็น dot product ที่ควรทำบนเลขจริง
- จะได้ไม่ clamp ระหว่างทางโดยไม่จำเป็น

### 2.3 Convolution NxN = Dot Product
ให้ kernel ขนาด \(K \times K\) (K เป็นเลขคี่), radius \(r=(K-1)/2\)

\[
sum(x,y)=\\sum_{j=-r}^{r}\\sum_{i=-r}^{r}k(i,j)\\cdot gray(x+i, y+j)
\]

จากนั้นแปลงเป็นค่าที่แสดงผล:

\[
v = sum\\cdot scale + bias
\]
\[
out = clamp(v, 0, 255)
\]

### 2.4 Border policy มีผลกับ “พิกเซลที่ติดขอบ” ยังไง
สมมติคำนวณพิกเซลที่ (x,y) ใกล้ขอบ แล้วต้องอ่านเพื่อนบ้านที่อยู่นอกภาพ:
- **clamp**: ใช้พิกเซลขอบแทน → ขอบจะดู “ต่อเนื่อง”
- **zero**: ถือว่าเป็น 0 → มักเกิด artifact (ขอบมืด/halo)
- **wrap**: เอาค่าจากฝั่งตรงข้ามของภาพ → เหมาะสาธิตระบบแบบคาบ (periodic boundary)

### 2.5 Sobel edge magnitude ทำไมต้อง 2 convolution
เพราะ gradient มี 2 แกน:
- \(G_x\): ความเปลี่ยนแปลงในแนวนอน
- \(G_y\): ความเปลี่ยนแปลงในแนวตั้ง

แล้วรวมให้เป็น “ความแรงของขอบ”:
- L1: เร็ว, เหมาะ realtime
- L2: ใกล้หลักคณิตศาสตร์ของ magnitude มากกว่า

---

## 3) โหมดการเดโม (ตัวอย่างที่ใช้สอนได้ทันที)

### 3.1 เดโม Blur 5×5 (ค่าเฉลี่ย)
- `kSize = 5`
- kernel: ใส่ `1` ทุกช่อง
- `scale = 1/25 = 0.04`
- `bias = 0`
- `policy = clamp`

**สิ่งที่สอน**: kernel ที่รวม 1 แล้วหารด้วยจำนวนช่องคือ “ค่าเฉลี่ย” → blur/noise reduction

### 3.2 เดโม Sharpen 3×3
- `kSize = 3`
- kernel (row-major):
  - `0,-1,0,-1,5,-1,0,-1,0`
- `scale = 1`, `bias = 0`

**สิ่งที่สอน**: center-weight + ลบเพื่อนบ้าน → เน้นรายละเอียด/ขอบ

### 3.3 เดโม Sobel กับ Webcam (ว้าวสุด)
- `source = webcam`
- `edges = sobel`
- `mag = L1` (ให้ลื่น)
- `policy = clamp`
- `bias = 0` หรือ `bias = 128` เพื่อทำ visualization แบบ shifted

**สิ่งที่สอน**: ทำไมต้องคำนวณ Gx/Gy + magnitude, และทำไม performance สำคัญ

### 3.4 เดโม Border policies (สอน edge cases)
ใช้ kernel edge detection (เช่น Laplacian หรือ Sobel) แล้วสลับ policy:
- `clamp` vs `zero` vs `wrap`

**สิ่งที่สอน**: boundary condition เปลี่ยนผลลัพธ์จริง

### 3.5 เดโม Sliding Window Debugger
1) เปิด webcam หรือ upload รูป  
2) กด **Pause**  
3) เลื่อน slider X/Y หรือกด arrow keys  
4) ดู overlay NxN บน input + ดูสมการ NxN ที่แสดงด้านล่าง  

**สิ่งที่สอน**: convolution เป็น dot product ที่เลื่อนหน้าต่างไปทีละพิกเซล

---

## 4) ตัวอย่าง URL ที่แชร์ได้
ตัวอย่างรูปแบบ query (อาจยาวมากถ้า kernel ใหญ่):

- ตัวอย่าง 3×3:
  - `?kSize=3&k=-1,0,1,-2,0,2,-1,0,1&policy=clamp&scale=1&bias=128&edge=off&mag=l1&source=upload&paused=0`

- ตัวอย่าง Sobel:
  - `?edge=sobel&mag=l2&policy=clamp&bias=0&scale=1&source=webcam&paused=0`

แนวคิด: “แชร์ลิงก์ = แชร์สภาพการสอน” (reproducible)

---

## 5) จุดเน้นด้าน Performance (ทำไมถึงสอนว่าเก่งจริง)

### 5.1 ทำไมต้องมี `_Into` variants
ใน realtime loop ถ้าสร้าง array ใหม่ทุกเฟรม จะเกิด:
- GC pressure
- FPS ตก/กระตุก

ดังนั้นฟังก์ชันแบบ `_Into` จะ “เขียนลง buffer ที่เตรียมไว้” เช่น:
- `rgbaToGrayscaleLumaInto(...)`
- `convolve...Into(...)`
- `grayU8ToRgbaInto(...)`

### 5.2 “0 allocations per frame” แปลว่าอะไรในโปรเจกต์นี้
- เป้าหมายคือ **โค้ดของเรา** ไม่สร้าง typed arrays ใหม่ในแต่ละเฟรม
- การ allocate ของ browser ภายใน `getImageData()` อาจเกิดขึ้นได้ (อยู่นอกการควบคุมเรา)\n\nPerf overlay จึงนับ “allocations (app-controlled)” คือจำนวนครั้งที่เราจำเป็นต้องสร้าง buffer ใหม่ (เช่น resolution เปลี่ยน)

---

## 6) ไฟล์/โมดูลสำคัญ (เชื่อมกับของที่เห็นบนหน้าจอ)
- **UI + loop + wiring**: `web/src/app/page.tsx`
- **NxN kernel + border policy**: `web/src/lib/cv/convolutionNxN.ts`
- **3×3 wrapper**: `web/src/lib/cv/convolution3x3.ts`
- **Sobel magnitude**: `web/src/lib/cv/sobelMagnitude.ts`
- **Hover inspector**: `web/src/lib/cv/inspector3x3.ts` + `web/src/components/MathInspectorOverlay.tsx`
- **Debugger equation**: `web/src/lib/cv/inspectorNxN.ts`
- **Debugger UI**: `web/src/components/SlidingWindowDebugger.tsx`
- **Overlay highlight**: `web/src/lib/ui/drawKernelOverlay.ts`
- **URL share-state**: `web/src/hooks/useQueryState.ts`
- **FPS/alloc overlay**: `web/src/components/PerfOverlay.tsx`
- **Webcam permission lifecycle**: `web/src/hooks/useWebcamStream.ts`


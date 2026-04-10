// Thuật toán Bông tuyết Koch (Thành viên 1)
console.log("Koch loaded");

// ============================================================
// GLSL Shaders cho Koch Snowflake
// ============================================================

// Vertex Shader: nhận tọa độ 2D, áp dụng zoom và aspect ratio
const kochVS = `
    attribute vec2 a_position;
    uniform float u_zoom;
    uniform vec2 u_offset;
    uniform float u_aspect;

    void main() {
        vec2 pos = (a_position + u_offset) * u_zoom;
        // Chia cho aspect ratio để hình không bị méo
        pos.x /= u_aspect;
        gl_Position = vec4(pos, 0.0, 1.0);
    }
`;

// Fragment Shader: tô màu đồng nhất
const kochFS = `
    precision mediump float;
    uniform vec3 u_color;

    void main() {
        gl_FragColor = vec4(u_color, 1.0);
    }
`;

// Cache chương trình WebGL để không phải biên dịch lại mỗi frame
let kochProgram = null;
let kochBuffer = null;

// ============================================================
// Hàm đệ quy sinh các điểm trên đường cong Koch
// ============================================================
// Mỗi đoạn thẳng p1->p2 được chia thành 4 đoạn:
//   p1 -> A -> C -> B -> p2
// trong đó A và B chia đoạn thành 3 phần bằng nhau,
// C là đỉnh của tam giác đều dựng trên đoạn giữa AB, hướng ra ngoài.
function generateKochPoints(p1, p2, depth, points) {
    if (depth === 0) {
        // Trường hợp cơ sở: thêm điểm đầu của đoạn
        points.push(p1.x, p1.y);
        return;
    }

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    // Điểm A: 1/3 đoạn p1->p2
    const a = { x: p1.x + dx / 3, y: p1.y + dy / 3 };
    // Điểm B: 2/3 đoạn p1->p2
    const b = { x: p1.x + 2 * dx / 3, y: p1.y + 2 * dy / 3 };

    // Tính đỉnh C bằng phương pháp trung điểm + vector pháp tuyến
    // C nằm ở phía "trái" của vector A->B (hướng ra ngoài bông tuyết)
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    // Trung điểm M của AB
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    // Vector pháp tuyến (quay 90 độ sang trái): (-aby, abx)
    // Chiều cao tam giác đều = cạnh * sqrt(3)/2
    const h = Math.sqrt(3) / 2;
    const c = {
        x: mx - aby * h,
        y: my + abx * h
    };

    // Đệ quy cho 4 đoạn con
    generateKochPoints(p1, a, depth - 1, points);
    generateKochPoints(a, c, depth - 1, points);
    generateKochPoints(c, b, depth - 1, points);
    generateKochPoints(b, p2, depth - 1, points);
}

// ============================================================
// Hàm render chính cho Bông tuyết Koch
// ============================================================
function renderKoch(gl, config) {
    // 1. Biên dịch shader (chỉ lần đầu)
    if (!kochProgram) {
        kochProgram = compileKochProgram(gl, kochVS, kochFS);
        kochBuffer = gl.createBuffer();
    }
    gl.useProgram(kochProgram);

    // 2. Giới hạn iterations an toàn (tối đa 7 để tránh tràn bộ nhớ)
    const iterations = Math.min(config.iterations, 7);

    // 3. Tạo 3 đỉnh tam giác đều ban đầu
    //    Thứ tự NGƯỢC chiều kim đồng hồ (CCW): top -> bottom-left -> bottom-right
    //    Điều này đảm bảo tam giác con Koch luôn hướng RA NGOÀI
    const size = 0.7; // Kích thước (bán kính ngoại tiếp)
    const top    = { x:  0,                              y:  size };
    const bLeft  = { x: -size * Math.sin(Math.PI / 3),   y: -size * 0.5 };
    const bRight = { x:  size * Math.sin(Math.PI / 3),   y: -size * 0.5 };

    // 4. Sinh điểm đệ quy cho 3 cạnh (theo thứ tự CCW)
    const points = [];
    generateKochPoints(top,    bRight, iterations, points); // Cạnh phải
    generateKochPoints(bRight, bLeft,  iterations, points); // Cạnh dưới
    generateKochPoints(bLeft,  top,    iterations, points); // Cạnh trái
    // Khép kín bông tuyết
    points.push(top.x, top.y);

    // 5. Đẩy dữ liệu đỉnh lên GPU
    const vertices = new Float32Array(points);
    gl.bindBuffer(gl.ARRAY_BUFFER, kochBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

    const posLoc = gl.getAttribLocation(kochProgram, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // 6. Thiết lập viewport đúng kích thước canvas
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // 7. Truyền uniforms (zoom, offset, aspect ratio, màu)
    const aspect = gl.canvas.width / gl.canvas.height;
    gl.uniform1f(gl.getUniformLocation(kochProgram, "u_zoom"), config.zoom);
    gl.uniform2f(gl.getUniformLocation(kochProgram, "u_offset"), config.offsetX, config.offsetY);
    gl.uniform1f(gl.getUniformLocation(kochProgram, "u_aspect"), aspect);

    const color = hexToRgbKoch(config.colorPrimary);
    gl.uniform3fv(gl.getUniformLocation(kochProgram, "u_color"), color);

    // 8. Vẽ bông tuyết bằng LINE_STRIP (đường liền nét)
    gl.drawArrays(gl.LINE_STRIP, 0, points.length / 2);
}

// ============================================================
// Hàm hỗ trợ
// ============================================================

// Biên dịch vertex shader + fragment shader thành chương trình WebGL
function compileKochProgram(gl, vsSource, fsSource) {
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error("Koch VS Error:", gl.getShaderInfoLog(vs));
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error("Koch FS Error:", gl.getShaderInfoLog(fs));
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error("Koch Link Error:", gl.getProgramInfoLog(prog));
    }
    return prog;
}

// Chuyển đổi mã màu Hex (#RRGGBB) sang mảng RGB [0.0, 1.0]
function hexToRgbKoch(hex) {
    return [
        parseInt(hex.slice(1, 3), 16) / 255,
        parseInt(hex.slice(3, 5), 16) / 255,
        parseInt(hex.slice(5, 7), 16) / 255
    ];
}

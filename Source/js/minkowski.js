function createMinkowskiIslandVertices(depth) {
    // Giới hạn depth để tránh số đoạn tăng quá nhanh
    depth = Math.max(0, Math.min(Math.floor(depth), 4));

    const vertices = [];

    function add(a, b) {
        return [a[0] + b[0], a[1] + b[1], 0.0];
    }

    function scale(v, s) {
        return [v[0] * s, v[1] * s, 0.0];
    }

    function lerp(a, b, t) {
        return [
            a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t,
            0.0
        ];
    }

    function subdivideSegment(p0, p8, currentDepth) {
        if (currentDepth === 0) {
            vertices.push(p0[0], p0[1], p0[2]);
            return;
        }

        // Vector 1/4 đoạn gốc
        const dx = (p8[0] - p0[0]) / 4;
        const dy = (p8[1] - p0[1]) / 4;

        // u = bước tiến dọc theo đoạn
        const u = [dx, dy, 0.0];

        // Pháp tuyến ra ngoài cho polygon đi theo chiều kim đồng hồ:
        // n = (dy, -dx)
        const n = [dy, -dx, 0.0];

        // Tạo 9 điểm: p0 ... p8
        const p1 = add(p0, u);         // đi thẳng 1 bước
        const p2 = add(p1, n);         // đi vuông góc ra ngoài
        const p3 = add(p2, u);         // đi ngang
        const p4 = add(p3, [-n[0], -n[1], 0.0]); // trở lại trục cũ
        const p5 = add(p4, [-n[0], -n[1], 0.0]); // đi tiếp sang phía đối diện
        const p6 = add(p5, u);         // đi ngang
        const p7 = add(p6, n);         // quay lại trục cũ
        // p8 là điểm cuối đoạn gốc

        // 8 đoạn con
        subdivideSegment(p0, p1, currentDepth - 1);
        subdivideSegment(p1, p2, currentDepth - 1);
        subdivideSegment(p2, p3, currentDepth - 1);
        subdivideSegment(p3, p4, currentDepth - 1);
        subdivideSegment(p4, p5, currentDepth - 1);
        subdivideSegment(p5, p6, currentDepth - 1);
        subdivideSegment(p6, p7, currentDepth - 1);
        subdivideSegment(p7, p8, currentDepth - 1);
    }

    // Dùng thứ tự chiều kim đồng hồ để pháp tuyến n = (dy, -dx) là hướng ra ngoài
    const corners = [
        [-0.6, -0.6, 0.0], // trái dưới
        [-0.6,  0.6, 0.0], // trái trên
        [ 0.6,  0.6, 0.0], // phải trên
        [ 0.6, -0.6, 0.0]  // phải dưới
    ];

    // 4 cạnh của hình vuông
    for (let i = 0; i < 4; i++) {
        const start = corners[i];
        const end = corners[(i + 1) % 4];
        subdivideSegment(start, end, depth);
    }

    // Đóng đường
    vertices.push(corners[0][0], corners[0][1], corners[0][2]);

    return new Float32Array(vertices);
}

// ============================================================
// GLSL Shaders cho Minkowski Island
// ============================================================

const minkowskiVS = `
    attribute vec3 a_position;
    uniform float u_zoom;
    uniform vec2 u_offset;
    uniform float u_aspect;

    void main() {
        vec3 pos = a_position;
        pos.xy = (pos.xy + u_offset) * u_zoom;
        pos.x /= u_aspect;
        gl_Position = vec4(pos, 1.0);
    }
`;

const minkowskiFS = `
    precision mediump float;
    uniform vec3 u_color;

    void main() {
        gl_FragColor = vec4(u_color, 1.0);
    }
`;

let minkowskiProgram = null;
let minkowskiBuffer = null;

// ============================================================
// Hàm render chính cho Minkowski Island
// ============================================================
function renderMinkowski(gl, config) {
    // 1. Biên dịch shader (chỉ lần đầu)
    if (!minkowskiProgram) {
        minkowskiProgram = compileMinkowskiProgram(gl, minkowskiVS, minkowskiFS);
        minkowskiBuffer = gl.createBuffer();
    }
    gl.useProgram(minkowskiProgram);

    // 2. Giới hạn iterations an toàn
    const iterations = Math.min(config.iterations, 4);

    // 3. Tạo dữ liệu đỉnh Minkowski Island
    const vertices = createMinkowskiIslandVertices(iterations);

    // 4. Đẩy dữ liệu lên GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, minkowskiBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

    const posLoc = gl.getAttribLocation(minkowskiProgram, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    // 5. Thiết lập viewport
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // 6. Truyền uniforms
    const aspect = gl.canvas.width / gl.canvas.height;
    gl.uniform1f(gl.getUniformLocation(minkowskiProgram, "u_zoom"), config.zoom);
    gl.uniform2f(gl.getUniformLocation(minkowskiProgram, "u_offset"), config.offsetX, config.offsetY);
    gl.uniform1f(gl.getUniformLocation(minkowskiProgram, "u_aspect"), aspect);

    const color = hexToRgbMinkowski(config.colorPrimary);
    gl.uniform3fv(gl.getUniformLocation(minkowskiProgram, "u_color"), color);

    // 7. Vẽ đường
    gl.drawArrays(gl.LINE_STRIP, 0, vertices.length / 3);
}

// ============================================================
// Hàm hỗ trợ
// ============================================================

function compileMinkowskiProgram(gl, vsSource, fsSource) {
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error("Minkowski VS Error:", gl.getShaderInfoLog(vs));
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error("Minkowski FS Error:", gl.getShaderInfoLog(fs));
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error("Minkowski Link Error:", gl.getProgramInfoLog(prog));
    }
    return prog;
}

function hexToRgbMinkowski(hex) {
    return [
        parseInt(hex.slice(1, 3), 16) / 255,
        parseInt(hex.slice(3, 5), 16) / 255,
        parseInt(hex.slice(5, 7), 16) / 255
    ];
}

console.log("Minkowski loaded");
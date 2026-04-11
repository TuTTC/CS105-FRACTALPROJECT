function createSierpinskiVertices(depth) {
    // Chuẩn hóa depth để tránh treo trình duyệt
    depth = Math.max(0, Math.min(Math.floor(depth), 8));

    const vertices = [];

    // Tam giác đều tương đối, nằm gọn trong vùng clip space [-1, 1]
    const p1 = [-0.8, -0.6, 0.0]; // trái dưới
    const p2 = [ 0.8, -0.6, 0.0]; // phải dưới
    const p3 = [ 0.0,  0.8, 0.0]; // đỉnh trên

    /**
     * Tính trung điểm của 2 điểm.
     * @param {number[]} a
     * @param {number[]} b
     * @returns {number[]}
     */
    function midpoint(a, b) {
        return [
            (a[0] + b[0]) / 2,
            (a[1] + b[1]) / 2,
            0.0
        ];
    }

    function subdivide(a, b, c, currentDepth) {
        if (currentDepth === 0) {
            // Đến lá: đưa đúng 1 tam giác vào buffer
            vertices.push(
                a[0], a[1], a[2],
                b[0], b[1], b[2],
                c[0], c[1], c[2]
            );
            return;
        }

        const ab = midpoint(a, b);
        const bc = midpoint(b, c);
        const ca = midpoint(c, a);

        // 3 tam giác ở góc, bỏ tam giác giữa
        subdivide(a,  ab, ca, currentDepth - 1);
        subdivide(ab, b,  bc, currentDepth - 1);
        subdivide(ca, bc, c,  currentDepth - 1);
    }

    subdivide(p1, p2, p3, depth);

    return new Float32Array(vertices);
}

// ============================================================
// GLSL Shaders cho Sierpinski Triangle
// ============================================================

const sierpinskiVS = `
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

const sierpinskiFS = `
    precision mediump float;
    uniform vec3 u_color;

    void main() {
        gl_FragColor = vec4(u_color, 1.0);
    }
`;

let sierpinskiProgram = null;
let sierpinskiBuffer = null;

// ============================================================
// Hàm render chính cho Sierpinski Triangle
// ============================================================
function renderSierpinski(gl, config) {
    // 1. Biên dịch shader (chỉ lần đầu)
    if (!sierpinskiProgram) {
        sierpinskiProgram = compileSierpinskiProgram(gl, sierpinskiVS, sierpinskiFS);
        sierpinskiBuffer = gl.createBuffer();
    }
    gl.useProgram(sierpinskiProgram);

    // 2. Giới hạn iterations an toàn
    const iterations = Math.min(config.iterations, 8);

    // 3. Tạo dữ liệu đỉnh Sierpinski
    const vertices = createSierpinskiVertices(iterations);

    // 4. Đẩy dữ liệu lên GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, sierpinskiBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

    const posLoc = gl.getAttribLocation(sierpinskiProgram, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    // 5. Thiết lập viewport
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // 6. Truyền uniforms
    const aspect = gl.canvas.width / gl.canvas.height;
    gl.uniform1f(gl.getUniformLocation(sierpinskiProgram, "u_zoom"), config.zoom);
    gl.uniform2f(gl.getUniformLocation(sierpinskiProgram, "u_offset"), config.offsetX, config.offsetY);
    gl.uniform1f(gl.getUniformLocation(sierpinskiProgram, "u_aspect"), aspect);

    const color = hexToRgbSierpinski(config.colorPrimary);
    gl.uniform3fv(gl.getUniformLocation(sierpinskiProgram, "u_color"), color);

    // 7. Vẽ tam giác
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);
}

// ============================================================
// Hàm hỗ trợ
// ============================================================

function compileSierpinskiProgram(gl, vsSource, fsSource) {
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error("Sierpinski VS Error:", gl.getShaderInfoLog(vs));
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error("Sierpinski FS Error:", gl.getShaderInfoLog(fs));
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error("Sierpinski Link Error:", gl.getProgramInfoLog(prog));
    }
    return prog;
}

function hexToRgbSierpinski(hex) {
    return [
        parseInt(hex.slice(1, 3), 16) / 255,
        parseInt(hex.slice(3, 5), 16) / 255,
        parseInt(hex.slice(5, 7), 16) / 255
    ];
}

console.log("Sierpinski loaded");
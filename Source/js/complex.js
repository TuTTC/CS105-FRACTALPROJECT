// Thuật toán Mandelbrot/Julia (Thành viên 3 & 4)
console.log("Complex loaded");

// File: js/julia.js

// LƯU Ý: Đoạn shader này dùng WebGL 2 (#version 300 es)
const juliaVS_v2 = `#version 300 es
    in vec4 a_position;
    void main() {
        gl_Position = a_position;
    }
`;

const juliaFS_v2 = `#version 300 es
    precision highp float;

    // Các biến nhận từ giao diện UI của bạn
    uniform vec2 u_resolution;
    uniform float u_zoom;
    uniform vec2 u_offset;
    uniform float u_iterations;
    uniform vec2 u_c;
    
    uniform vec3 u_colorPrimary;
    uniform vec3 u_colorSecondary;
    uniform vec3 u_colorBg;

    out vec4 fragColor;

    // Chất lượng khử răng cưa (tăng lên 2.0 hoặc 3.0 nếu muốn nét hơn, nhưng sẽ nặng máy)
    const float QUALITY = 2.0; 

    // Hàm nhân số phức
    vec2 complexMultiply(vec2 a, vec2 b) {
        return vec2(a.x*a.x - a.y*a.y, 2.0*a.x*a.y);
    }

    // Hàm vẽ tập Julia với Smooth Coloring
    vec3 draw(vec2 z, vec2 c) {
        float i = 0.0;
        while (i < u_iterations) {
            z = complexMultiply(z, z) + c;
            if (length(z) > 4.0) break;
            i++;
        }

        if (i >= u_iterations) {
            return u_colorBg; // Thuộc tập Julia -> Tô màu nền
        } else {
            // Công thức làm mượt màu (Smooth Shading) của Adam Murray
            float shade = (i - log2(log(length(z)))) / u_iterations;
            
            // Pha trộn giữa màu chính và màu phụ dựa trên UI
            return mix(u_colorPrimary, u_colorSecondary, sqrt(shade));
        }
    }

    void main() {
        vec3 color = vec3(0.0);
        float samples = 0.0;
        float subpixel = 1.0 / QUALITY;

        // Vòng lặp khử răng cưa (Anti-aliasing)
        for (float x = 0.0; x < 1.0; x += subpixel) {
            for (float y = 0.0; y < 1.0; y += subpixel) {
                vec2 fragCoord = gl_FragCoord.xy + vec2(x, y);
                vec2 coord = (2.0 * fragCoord - u_resolution) / min(u_resolution.x, u_resolution.y);
                
                // Áp dụng Zoom và Offset từ UI
                vec2 z = coord / u_zoom - u_offset;

                color += draw(z, u_c);
                samples++;
            }
        }
        
        // Chia trung bình màu của các mẫu
        fragColor = vec4(color / samples, 1.0);
    }
`;

function renderJulia(gl, config) {
    // 1. Biên dịch Shader
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, juliaVS_v2);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.error("VS Error:", gl.getShaderInfoLog(vertexShader));
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, juliaFS_v2);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.error("FS Error:", gl.getShaderInfoLog(fragmentShader));
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    // 2. Thiết lập Buffer (vẽ bằng TRIANGLE_STRIP như code mẫu của Adam)
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // 3. Helper chuyển Hex sang RGB
    const hexToRgb = (hex) => {
        return [
            parseInt(hex.slice(1, 3), 16) / 255,
            parseInt(hex.slice(3, 5), 16) / 255,
            parseInt(hex.slice(5, 7), 16) / 255
        ];
    };

    // 4. Truyền dữ liệu từ 'config' (Lấy từ UI) xuống GPU
    gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), gl.canvas.width, gl.canvas.height);
    gl.uniform1f(gl.getUniformLocation(program, "u_zoom"), config.zoom);
    gl.uniform2f(gl.getUniformLocation(program, "u_offset"), config.offsetX, config.offsetY);
    gl.uniform1f(gl.getUniformLocation(program, "u_iterations"), config.iterations);
    
    // Sử dụng hằng số C đẹp từ code mẫu (-0.73, -0.2) làm mặc định nếu UI không truyền xuống
    const cReal = config.cReal !== undefined ? config.cReal : -0.73;
    const cImag = config.cImag !== undefined ? config.cImag : -0.2;
    gl.uniform2f(gl.getUniformLocation(program, "u_c"), cReal, cImag);

    gl.uniform3fv(gl.getUniformLocation(program, "u_colorPrimary"), hexToRgb(config.colorPrimary));
    gl.uniform3fv(gl.getUniformLocation(program, "u_colorSecondary"), hexToRgb(config.colorSecondary));
    gl.uniform3fv(gl.getUniformLocation(program, "u_colorBg"), hexToRgb(config.colorBg));

    // 5. Vẽ
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
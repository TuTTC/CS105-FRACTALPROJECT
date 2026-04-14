// js/carpet.js
console.log("Carpet loaded");

/**
 * Tạo dữ liệu đỉnh cho Sierpinski Carpet.
 * Mỗi ô vuông được vẽ bằng 2 tam giác để WebGL có thể render với gl.TRIANGLES.
 */
function createCarpetVertices(depth) {
	// Carpet tăng theo 8^depth nên cần chặn depth để tránh lag.
	depth = Math.max(0, Math.min(Math.floor(depth), 5));

	const vertices = [];

	/**
	 * Đưa 1 ô vuông vào buffer bằng 2 tam giác.
	 * @param {number} x Góc trái dưới (x)
	 * @param {number} y Góc trái dưới (y)
	 * @param {number} size Cạnh ô vuông
	 */
	function pushSquare(x, y, size) {
		const x0 = x;
		const y0 = y;
		const x1 = x + size;
		const y1 = y + size;

		// Tam giác 1: trái dưới -> phải dưới -> phải trên
		vertices.push(x0, y0, 0.0, x1, y0, 0.0, x1, y1, 0.0);

		// Tam giác 2: trái dưới -> phải trên -> trái trên
		vertices.push(x0, y0, 0.0, x1, y1, 0.0, x0, y1, 0.0);
	}

	/**
	 * Chia ô vuông thành lưới 3x3, bỏ ô giữa, đệ quy 8 ô còn lại.
	 */
	function subdivide(x, y, size, currentDepth) {
		if (currentDepth === 0) {
			pushSquare(x, y, size);
			return;
		}

		const childSize = size / 3;

		for (let row = 0; row < 3; row++) {
			for (let col = 0; col < 3; col++) {
				// Bỏ ô trung tâm để tạo lỗ rỗng của Sierpinski Carpet.
				if (row === 1 && col === 1) {
					continue;
				}

				const childX = x + col * childSize;
				const childY = y + row * childSize;
				subdivide(childX, childY, childSize, currentDepth - 1);
			}
		}
	}

	// Ô gốc nằm gọn trong clip-space để luôn nhìn thấy trên canvas.
	subdivide(-0.8, -0.8, 1.6, depth);

	return new Float32Array(vertices);
}

const carpetVS = `
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

const carpetFS = `
    precision mediump float;
    uniform vec3 u_color;

    void main() {
        gl_FragColor = vec4(u_color, 1.0);
    }
`;

let carpetProgram = null;
let carpetBuffer = null;

function renderCarpet(gl, config) {
	// Biên dịch program một lần, tái sử dụng cho các frame sau.
	if (!carpetProgram) {
		carpetProgram = compileCarpetProgram(gl, carpetVS, carpetFS);
		carpetBuffer = gl.createBuffer();
	}

	gl.useProgram(carpetProgram);

	// Dùng iterations từ UI nhưng vẫn chặn an toàn phía renderer.
	const iterations = Math.min(config.iterations, 5);
	const vertices = createCarpetVertices(iterations);

	gl.bindBuffer(gl.ARRAY_BUFFER, carpetBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

	const posLoc = gl.getAttribLocation(carpetProgram, "a_position");
	gl.enableVertexAttribArray(posLoc);
	gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	const aspect = gl.canvas.width / gl.canvas.height;
	gl.uniform1f(gl.getUniformLocation(carpetProgram, "u_zoom"), config.zoom);
	gl.uniform2f(
		gl.getUniformLocation(carpetProgram, "u_offset"),
		config.offsetX,
		config.offsetY,
	);
	gl.uniform1f(gl.getUniformLocation(carpetProgram, "u_aspect"), aspect);

	const color = hexToRgbCarpet(config.colorPrimary);
	gl.uniform3fv(gl.getUniformLocation(carpetProgram, "u_color"), color);

	gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);
}

function compileCarpetProgram(gl, vsSource, fsSource) {
	const vs = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vs, vsSource);
	gl.compileShader(vs);
	if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
		console.error("Carpet VS Error:", gl.getShaderInfoLog(vs));
	}

	const fs = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fs, fsSource);
	gl.compileShader(fs);
	if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
		console.error("Carpet FS Error:", gl.getShaderInfoLog(fs));
	}

	const prog = gl.createProgram();
	gl.attachShader(prog, vs);
	gl.attachShader(prog, fs);
	gl.linkProgram(prog);
	if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
		console.error("Carpet Link Error:", gl.getProgramInfoLog(prog));
	}

	return prog;
}

function hexToRgbCarpet(hex) {
	return [
		parseInt(hex.slice(1, 3), 16) / 255,
		parseInt(hex.slice(3, 5), 16) / 255,
		parseInt(hex.slice(5, 7), 16) / 255,
	];
}

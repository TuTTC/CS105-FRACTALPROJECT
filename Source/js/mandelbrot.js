// js/mandelbrot.js
console.log("Mandelbrot loaded");

// Renderer này đi theo cùng một kiểu với js/complex.js:
// - Vẽ 1 hình chữ nhật phủ toàn màn hình
// - Tính Mandelbrot trực tiếp trong fragment shader
// - Dùng màu từ UI để tô vùng thoát và vùng nằm trong tập

const mandelbrotVS_v2 = `#version 300 es
    in vec4 a_position;

    void main() {
        gl_Position = a_position;
    }
`;

const mandelbrotFS_v2 = `#version 300 es
    precision highp float;

    uniform vec2 u_resolution;
    uniform float u_zoom;
    uniform vec2 u_offset;
    uniform float u_iterations;
    uniform vec3 u_colorPrimary;
    uniform vec3 u_colorSecondary;
    uniform vec3 u_colorBg;

    out vec4 fragColor;

    // Tính z^2 + c cho số phức z = (x, y)
    vec2 complexSquare(vec2 z) {
        return vec2(
            z.x * z.x - z.y * z.y,
            2.0 * z.x * z.y
        );
    }

    // Vẽ Mandelbrot cho một điểm c trên mặt phẳng phức.
    vec3 drawMandelbrot(vec2 c) {
        vec2 z = vec2(0.0);
        float i = 0.0;

        // Nếu z thoát ra ngoài bán kính 2, điểm đó không thuộc tập.
        while (i < u_iterations) {
            z = complexSquare(z) + c;
            if (dot(z, z) > 4.0) {
                break;
            }
            i += 1.0;
        }

        // Không thoát ra được sau đủ số lần lặp: điểm nằm trong tập Mandelbrot.
        if (i >= u_iterations) {
            return u_colorBg;
        }

        // Làm mượt màu bằng cách dùng độ lớn cuối cùng của z.
        float magnitude = length(z);
        float smoothI = i;
        if (magnitude > 0.0) {
            smoothI = i + 1.0 - log2(log2(magnitude));
        }

        float t = clamp(smoothI / u_iterations, 0.0, 1.0);

        // Pha màu chính và màu phụ để có chuyển sắc mềm hơn.
        return mix(u_colorPrimary, u_colorSecondary, sqrt(t));
    }

    void main() {
        // Đổi pixel hiện tại sang hệ tọa độ phức.
        vec2 coord = (2.0 * gl_FragCoord.xy - u_resolution) / min(u_resolution.x, u_resolution.y);

        // Zoom làm phóng to vùng nhìn; offset làm dịch chuyển tâm quan sát.
        vec2 c = coord / u_zoom - u_offset;

        fragColor = vec4(drawMandelbrot(c), 1.0);
    }
`;

let mandelbrotProgram = null;
let mandelbrotBuffer = null;

function renderMandelbrot(gl, config) {
	// Biên dịch program một lần rồi tái sử dụng cho những lần vẽ sau.
	if (!mandelbrotProgram) {
		mandelbrotProgram = compileMandelbrotProgram(
			gl,
			mandelbrotVS_v2,
			mandelbrotFS_v2,
		);
		mandelbrotBuffer = gl.createBuffer();
	}

	gl.useProgram(mandelbrotProgram);

	// Mandelbrot cần nhiều vòng lặp để đẹp, nhưng vẫn nên chặn để tránh chậm máy.
	const iterations = Math.max(1, Math.min(config.iterations, 1000));

	// Hình chữ nhật full-screen: 2 tam giác tạo thành 1 quad.
	const vertices = new Float32Array([
		-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0,
	]);

	gl.bindBuffer(gl.ARRAY_BUFFER, mandelbrotBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

	const posLoc = gl.getAttribLocation(mandelbrotProgram, "a_position");
	gl.enableVertexAttribArray(posLoc);
	gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	// Truyền dữ liệu từ UI xuống shader.
	gl.uniform2f(
		gl.getUniformLocation(mandelbrotProgram, "u_resolution"),
		gl.canvas.width,
		gl.canvas.height,
	);
	gl.uniform1f(gl.getUniformLocation(mandelbrotProgram, "u_zoom"), config.zoom);
	gl.uniform2f(
		gl.getUniformLocation(mandelbrotProgram, "u_offset"),
		config.offsetX,
		config.offsetY,
	);
	gl.uniform1f(
		gl.getUniformLocation(mandelbrotProgram, "u_iterations"),
		iterations,
	);

	const hexToRgb = (hex) => [
		parseInt(hex.slice(1, 3), 16) / 255,
		parseInt(hex.slice(3, 5), 16) / 255,
		parseInt(hex.slice(5, 7), 16) / 255,
	];

	gl.uniform3fv(
		gl.getUniformLocation(mandelbrotProgram, "u_colorPrimary"),
		hexToRgb(config.colorPrimary),
	);
	gl.uniform3fv(
		gl.getUniformLocation(mandelbrotProgram, "u_colorSecondary"),
		hexToRgb(config.colorSecondary),
	);
	gl.uniform3fv(
		gl.getUniformLocation(mandelbrotProgram, "u_colorBg"),
		hexToRgb(config.colorBg),
	);

	// Vẽ full-screen quad.
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function compileMandelbrotProgram(gl, vsSource, fsSource) {
	const vs = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vs, vsSource);
	gl.compileShader(vs);
	if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
		console.error("Mandelbrot VS Error:", gl.getShaderInfoLog(vs));
	}

	const fs = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fs, fsSource);
	gl.compileShader(fs);
	if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
		console.error("Mandelbrot FS Error:", gl.getShaderInfoLog(fs));
	}

	const prog = gl.createProgram();
	gl.attachShader(prog, vs);
	gl.attachShader(prog, fs);
	gl.linkProgram(prog);
	if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
		console.error("Mandelbrot Link Error:", gl.getProgramInfoLog(prog));
	}

	return prog;
}

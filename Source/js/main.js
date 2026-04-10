// Quản lý luồng chính (Thành viên 1)
console.log("Main loaded");

// js/main.js

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('glcanvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('experimental-webgl') || canvas.getContext('webgl');

    if (!gl) {
        alert("Trình duyệt của bạn không hỗ trợ WebGL");
        return;
    }

    // Hàm thay đổi kích thước canvas cho khớp với CSS thực tế
    function resizeCanvas() {
        const displayWidth = canvas.clientWidth;
        const displayHeight = canvas.clientHeight;

        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = displayWidth;
            canvas.height = displayHeight;
        }
    }

    // Hàm chuyên biệt chuyển đổi Hex sang RGB để WebGL sử dụng (0.0 - 1.0)
    function hexToRgb(hex) {
        if (!hex) return [0, 0, 0];
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return [r, g, b];
    }

    // Hàm render chính, quyết định sẽ gọi script nào
    function draw() {
        resizeCanvas();
        updateUIDisplays();
        
        const config = getUIConfig();

        // Dọn dẹp canvas với màu nền được chọn từ UI
        const bgColor = hexToRgb(config.colorBg);
        gl.clearColor(bgColor[0], bgColor[1], bgColor[2], 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Điều hướng thuật toán
        switch (config.fractalType) {
            case 'julia':
                // Gọi hàm từ js/complex.js
                renderJulia(gl, config);
                break;
            case 'mandelbrot':
                // Chờ thành viên 3 code renderMandelbrot(gl, config)
                console.log("Đang chờ hàm Mandelbrot");
                break;
            case 'koch':
                // Chờ thành viên 1 code renderKoch(gl, config)
                renderKoch(gl, config);
                break;
            case 'sierpinski':
                // Chờ thành viên 2 code renderSierpinski(gl, config)
                break;
        }
    }

    // Đăng ký sự kiện: Bất cứ khi nào UI thay đổi thì gọi hàm draw()
    const controls = ['fractal-select', 'iterations', 'zoom', 'color-primary', 'color-secondary', 'color-bg'];
    controls.forEach(id => {
        document.getElementById(id).addEventListener('input', draw);
    });
    document.getElementById('fractal-select').addEventListener('change', draw);document.getElementById('fractal-select').addEventListener('change', () => {
    adjustUIForFractalType(); // Điều chỉnh thanh trượt theo loại Fractal
    draw(); // Vẽ lại canvas
    });
    // Xử lý nút Reset
    document.getElementById('reset-btn').addEventListener('click', () => {
        document.getElementById('iterations').value = 100;
        document.getElementById('zoom').value = 1.0;
        document.getElementById('color-primary').value = "#2563eb";
        document.getElementById('color-secondary').value = "#38bdf8";
        document.getElementById('color-bg').value = "#ffffff";
        currentOffsetX = 0.0;
        currentOffsetY = 0.0;
        adjustUIForFractalType();
        draw();
    });

    // Xử lý các nút thiết lập nhanh
    document.getElementById('btn-light').addEventListener('click', () => {
        document.getElementById('color-bg').value = "#ffffff";
        document.getElementById('color-primary').value = "#2563eb";
        draw();
    });

    document.getElementById('btn-dark').addEventListener('click', () => {
        document.getElementById('color-bg').value = "#0f172a";
        document.getElementById('color-primary').value = "#38bdf8";
        draw();
    });
    // ============================================================
    // Zoom bằng lăn chuột (Mouse Wheel)
    // ============================================================
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomInput = document.getElementById('zoom');
        let currentZoom = parseFloat(zoomInput.value);
        
        // Zoom theo hệ số nhân (mượt hơn cộng trừ tuyến tính)
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        currentZoom = Math.max(0.1, Math.min(100, currentZoom * zoomFactor));
        
        zoomInput.value = currentZoom.toFixed(2);
        draw();
    }, { passive: false });

    // ============================================================
    // Kéo thả chuột để di chuyển (Pan / Drag)
    // ============================================================
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        canvas.style.cursor = 'grabbing';
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const zoomInput = document.getElementById('zoom');
        const currentZoom = parseFloat(zoomInput.value);
        
        // Tính delta di chuyển và chuyển đổi sang hệ tọa độ WebGL
        const dx = (e.clientX - lastMouseX) / canvas.clientWidth * 2 / currentZoom;
        const dy = -(e.clientY - lastMouseY) / canvas.clientHeight * 2 / currentZoom;
        
        updateOffset(dx, dy);
        
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        
        draw();
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
        canvas.style.cursor = 'grab';
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
        canvas.style.cursor = 'grab';
    });

    // Đặt cursor mặc định cho canvas
    canvas.style.cursor = 'grab';

    // Điều chỉnh UI cho loại fractal mặc định khi trang vừa load
    adjustUIForFractalType();

    // Vẽ lần đầu tiên khi web vừa load xong
    draw();
});
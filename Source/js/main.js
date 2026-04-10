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

    // Hàm render chính, quyết định sẽ gọi script nào
    function draw() {
        resizeCanvas();
        updateUIDisplays();
        
        const config = getUIConfig();

        // Dọn dẹp canvas trước khi vẽ mới
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
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
        draw();
    });

    // Vẽ lần đầu tiên khi web vừa load xong
    // (Vì giá trị mặc định của select đang là mandelbrot nên bạn cần chuyển sang julia trên UI để thấy kết quả)
    draw();
});
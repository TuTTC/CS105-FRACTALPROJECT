// js/ui.js
console.log("UI loaded");

// Biến lưu trữ trạng thái dịch chuyển (Pan/Offset)
// Sẽ được cập nhật bởi main.js khi người dùng kéo thả chuột trên Canvas
let currentOffsetX = 0.0;
let currentOffsetY = 0.0;

// Hàm lấy toàn bộ trạng thái hiện tại của bảng điều khiển
function getUIConfig() {
    return {
        fractalType: document.getElementById('fractal-select').value,
        iterations: parseInt(document.getElementById('iterations').value, 10),
        zoom: parseFloat(document.getElementById('zoom').value),
        
        // Trạng thái màu sắc
        colorPrimary: document.getElementById('color-primary').value,
        colorSecondary: document.getElementById('color-secondary').value,
        colorBg: document.getElementById('color-bg').value,
        
        // Tọa độ dịch chuyển (dành cho WebGL shaders)
        offsetX: currentOffsetX,
        offsetY: currentOffsetY,
        
        // Hằng số phức mặc định cho tập Julia (C = -0.73 - 0.2i)
        // Nếu sau này bạn thêm thanh trượt cho C_real và C_imag vào HTML, 
        // bạn có thể lấy giá trị từ document.getElementById() ở đây.
        cReal: -0.73,
        cImag: -0.2
    };
}

// Cập nhật số liệu hiển thị bằng văn bản bên cạnh các thanh trượt
function updateUIDisplays() {
    document.getElementById('iterations-val').innerText = document.getElementById('iterations').value;
    document.getElementById('zoom-val').innerText = document.getElementById('zoom').value;
}

// Hàm này được gọi khi loại Fractal thay đổi để điều chỉnh UI cho phù hợp
function adjustUIForFractalType() {
    const type = document.getElementById('fractal-select').value;
    const iterInput = document.getElementById('iterations');

    if (type === 'koch' || type === 'sierpinski') {
        // Fractal hình học: Giới hạn đệ quy để tránh treo trình duyệt
        iterInput.min = "0";
        iterInput.max = "7";
        // Nếu giá trị hiện tại vượt quá max mới, ép nó về mức an toàn
        if (parseInt(iterInput.value) > 7) {
            iterInput.value = "3"; 
        }
    } else {
        // Fractal điểm ảnh (Mandelbrot/Julia): Cần số lần lặp lớn để ra chi tiết
        iterInput.min = "1";
        iterInput.max = "1000";
        if (parseInt(iterInput.value) <= 7) {
            iterInput.value = "100"; // Đặt lại mức mặc định hợp lý
        }
    }
    
    // Đặt lại tọa độ di chuyển về trung tâm mỗi khi đổi loại hình
    currentOffsetX = 0.0;
    currentOffsetY = 0.0;
    
    // Cập nhật lại số liệu hiển thị sau khi thay đổi
    updateUIDisplays();
}

// Hàm hỗ trợ để main.js có thể cập nhật tọa độ dịch chuyển
function updateOffset(dx, dy) {
    currentOffsetX += dx;
    currentOffsetY += dy;
}

// Hàm hỗ trợ để main.js có thể đặt lại UI về trạng thái ban đầu
function resetUI() {
    document.getElementById('iterations').value = 100;
    document.getElementById('zoom').value = 1.0;
    document.getElementById('color-primary').value = "#2563eb";
    document.getElementById('color-secondary').value = "#38bdf8";
    document.getElementById('color-bg').value = "#ffffff";
    
    currentOffsetX = 0.0;
    currentOffsetY = 0.0;
    
    adjustUIForFractalType();
}
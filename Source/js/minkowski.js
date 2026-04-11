// Thuật toán Đảo Minkowski (Thành viên 2 - Vương)
// Sinh dữ liệu đỉnh cho Minkowski Island để vẽ bằng gl.LINE_STRIP

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

console.log("Minkowski loaded");
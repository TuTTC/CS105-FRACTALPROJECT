// Thuật toán Tam giác Sierpinski (Thành viên 2 - Vương)
// Sinh dữ liệu đỉnh cho Tam giác Sierpinski để vẽ bằng gl.TRIANGLES

function createSierpinskiVertices(depth) {
    // Chuẩn hóa depth để tránh treo trình duyệt
    depth = Math.max(0, Math.min(Math.floor(depth), 8));

    const vertices = [];

    // Tam giác đều tương đối, nằm gọn trong vùng clip space [-1, 1]
    const p1 = [-0.8, -0.6, 0.0]; // trái dưới
    const p2 = [ 0.8, -0.6, 0.0]; // phải dưới
    const p3 = [ 0.0,  0.8, 0.0]; // đỉnh trên

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

console.log("Sierpinski loaded");
// Coordinates match the 24 × 16 Lantern Quay player map.
export function drawQuay(canvas, showGrid) {
  const pen = canvas.getContext("2d");
  if (!pen) return;
  pen.save();
  pen.setTransform(canvas.width / 24, 0, 0, canvas.height / 16, 0, 0);

  const block = (x, y, width, height, colour, edge) => {
    pen.fillStyle = colour;
    pen.fillRect(x, y, width, height);
    if (edge) {
      pen.strokeStyle = edge;
      pen.lineWidth = .08;
      pen.strokeRect(x, y, width, height);
    }
  };
  const line = (points, colour, width) => {
    pen.beginPath();
    pen.moveTo(...points[0]);
    for (const point of points.slice(1)) pen.lineTo(...point);
    pen.strokeStyle = colour;
    pen.lineWidth = width;
    pen.stroke();
  };
  const planks = (x, y, width, height) => {
    block(x, y, width, height, "#8f6650", "#17292b");
    for (let row = y + .28; row < y + height; row += .28) {
      line([[x + .05, row], [x + width - .05, row]], "#5f4b41", .025);
    }
  };

  block(0, 0, 24, 16, "#264b50");
  for (let i = 0; i < 152; i += 1) {
    const x = ((i * 79) % 235) / 10;
    const y = 7.4 + ((i * 103) % 850) / 100;
    line([[x, y], [x + .42, y - .018]], "#3b6263", .026);
  }
  block(0, 0, 24, 7.45, "#9b9277", "#17292b");
  for (let y = 0; y < 7.45; y += .55) {
    line([[0, y], [24, y]], "#777765", .032);
    for (let x = Math.round(y / .55) % 2 ? .4 : 0; x <= 24; x += .76) {
      line([[x, y], [x, Math.min(y + .55, 7.45)]], "#777765", .032);
    }
  }
  planks(9.85, 6.89, 2.87, 6.65);
  planks(8.04, 12.02, 8.04, 2.4);
  block(11.03, 13.79, .98, .35, "#253b3d", "#514537");
  for (const x of [11.02, 11.55]) line([[x, 14.12], [x, 15.0]], "#cea071", .07);
  for (const y of [14.22, 14.42, 14.62, 14.82]) line([[11.02, y], [11.55, y]], "#d6ac76", .05);
  planks(3, 2.15, 5.3, 3.8);
  line([[3, 5.95], [3, 2.15], [8.3, 2.15], [8.3, 5.95], [6.43, 5.95]], "#243037", .2);
  line([[3, 5.95], [5.42, 5.95]], "#243037", .2);
  block(3.38, 2.52, 1.38, .87, "#735141", "#40382f");
  block(6.55, 2.41, 1.37, .59, "#bb9164", "#554739");
  block(13.18, 1.15, 6.54, 5.2, "#a1987e", "#555648");
  for (const [x, y] of [[13.6, 1.62], [14.39, 1.78], [18.37, 1.51], [18.86, 2.16], [19.04, 4.49]]) {
    block(x, y, .55, .55, "#a47a50", "#4a4235");
    line([[x, y], [x + .55, y + .55]], "#d2a570", .07);
  }
  block(15.28, 3.88, 1.6, .7, "#6d6351", "#17292b");
  line([[16.08, 4.27], [15.36, 5.99], [13.11, 7.96], [13.31, 9.72], [11.81, 12.46], [11.31, 13.6], [12.04, 15.12]], "#d8b183", .052);
  block(20.23, 6.51, 1.91, 2.74, "#6b7262", "#17292b");
  for (let y = 6.8; y < 9.25; y += .32) line([[20.28, y], [22.09, y]], "#4d5549", .07);
  block(20.83, 8.51, .68, .6, "#455558", "#ccc29a");
  pen.beginPath();
  pen.moveTo(16.14, 9.65);
  for (const point of [[16.54, 8.92], [17.27, 8.66], [18.76, 8.66], [19.46, 9.06], [19.68, 9.74], [19.1, 10.28], [16.96, 10.43]]) pen.lineTo(...point);
  pen.closePath();
  pen.fillStyle = "#ac8463";
  pen.fill();
  pen.strokeStyle = "#463d37";
  pen.lineWidth = .15;
  pen.stroke();

  if (showGrid) {
    for (let x = 1; x < 24; x += 1) line([[x, 0], [x, 16]], "#fbf6dd55", .027);
    for (let y = 1; y < 16; y += 1) line([[0, y], [24, y]], "#fbf6dd55", .027);
  }
  pen.restore();
}

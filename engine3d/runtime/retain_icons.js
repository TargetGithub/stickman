// Badge icons for the retention kit (retain_layout.js ICONS), drawn with canvas 2D paths in a sticker style: a flat
// colour fill with a dark outline. No emoji or icon fonts (they differ between machines); the "?" uses the
// page's caption font. Browser only (renderer): the timeline never sees these.

import { FONT } from "./overlay.js";

const INK = "#2b2d42";

/**
 * Draw icon `name` centred in a size × size canvas context.
 * @param {CanvasRenderingContext2D} g
 * @param {string} name
 * @param {string} hex  the icon's main colour
 * @param {number} size
 */
export function drawIcon(g, name, hex, size) {
  const s = size / 100; // icons are drawn on a 100 × 100 grid
  g.save();
  g.scale(s, s);
  g.lineJoin = "round";
  g.lineCap = "round";
  g.lineWidth = 5;
  g.strokeStyle = INK;
  const fill = (c) => ((g.fillStyle = c), g.fill(), g.stroke());
  const path = (f) => (g.beginPath(), f(), g);
  (ICON_PATHS[name] ?? ICON_PATHS.question)({ g, fill, path, hex });
  g.restore();
}

const star = (g, cx, cy, r, inner = 0.45) => {
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * inner : r;
    g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath();
};

const ICON_PATHS = {
  ear: ({ g, path, fill, hex }) => {
    path(() => {
      g.moveTo(34, 40);
      g.bezierCurveTo(30, 14, 74, 8, 76, 38);
      g.bezierCurveTo(78, 56, 60, 58, 60, 72);
      g.bezierCurveTo(60, 88, 40, 92, 36, 78);
    });
    g.lineWidth = 6;
    g.stroke();
    path(() => g.ellipse(55, 42, 22, 28, 0, 0, Math.PI * 2));
    g.globalCompositeOperation = "destination-over";
    fill("#ffd7b5");
    g.globalCompositeOperation = "source-over";
    path(() => {
      g.moveTo(46, 40);
      g.bezierCurveTo(46, 28, 64, 28, 64, 40);
      g.bezierCurveTo(64, 50, 54, 50, 54, 58);
    });
    g.strokeStyle = hex;
    g.lineWidth = 6;
    g.stroke();
    // Sound waves coming in.
    g.strokeStyle = INK;
    g.lineWidth = 4;
    for (const r of [10, 18]) path(() => g.arc(20, 50, r, -0.7, 0.7)).stroke();
  },
  hand: ({ g, path, fill }) => {
    const skin = "#ffd7b5";
    for (const [x, top] of [[33, 18], [45, 12], [57, 14], [69, 22]]) {
      path(() => g.roundRect(x - 5.5, top, 11, 46, 5.5));
      fill(skin);
    }
    path(() => g.roundRect(26, 46, 50, 40, 16));
    fill(skin);
    path(() => {
      g.moveTo(28, 64);
      g.quadraticCurveTo(12, 50, 18, 44);
      g.quadraticCurveTo(24, 40, 34, 56);
    });
    fill(skin);
  },
  mouth: ({ g, path, fill, hex }) => {
    path(() => {
      g.moveTo(18, 40);
      g.quadraticCurveTo(50, 46, 82, 40);
      g.quadraticCurveTo(80, 84, 50, 84);
      g.quadraticCurveTo(20, 84, 18, 40);
    });
    fill("#7a1f3d");
    path(() => g.ellipse(50, 72, 18, 9, 0, Math.PI, 0));
    g.fillStyle = hex;
    g.fill();
    path(() => g.rect(26, 42, 48, 9));
    g.fillStyle = "#ffffff";
    g.fill();
    path(() => {
      g.moveTo(18, 40);
      g.quadraticCurveTo(50, 46, 82, 40);
      g.quadraticCurveTo(80, 84, 50, 84);
      g.quadraticCurveTo(20, 84, 18, 40);
    }).stroke();
  },
  eye: ({ g, path, fill, hex }) => {
    path(() => {
      g.moveTo(10, 50);
      g.quadraticCurveTo(50, 12, 90, 50);
      g.quadraticCurveTo(50, 88, 10, 50);
    });
    fill("#ffffff");
    path(() => g.arc(50, 50, 18, 0, Math.PI * 2));
    fill(hex);
    path(() => g.arc(50, 50, 8, 0, Math.PI * 2));
    g.fillStyle = INK;
    g.fill();
    path(() => g.arc(44, 44, 4, 0, Math.PI * 2));
    g.fillStyle = "#ffffff";
    g.fill();
  },
  question: ({ g, hex }) => {
    g.font = `bold 84px ${FONT}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineWidth = 9;
    g.strokeText("?", 50, 54);
    g.fillStyle = hex;
    g.fillText("?", 50, 54);
  },
  star: ({ g, path, fill, hex }) => {
    path(() => star(g, 50, 53, 40));
    fill(hex);
  },
  check: ({ g, path, hex }) => {
    path(() => {
      g.moveTo(20, 52);
      g.lineTo(42, 74);
      g.lineTo(82, 28);
    });
    g.lineWidth = 22;
    g.stroke();
    g.lineWidth = 12;
    g.strokeStyle = hex;
    g.stroke();
  },
  heart: ({ g, path, fill, hex }) => {
    path(() => {
      g.moveTo(50, 84);
      g.bezierCurveTo(10, 58, 12, 22, 34, 20);
      g.bezierCurveTo(44, 19, 50, 28, 50, 34);
      g.bezierCurveTo(50, 28, 56, 19, 66, 20);
      g.bezierCurveTo(88, 22, 90, 58, 50, 84);
    });
    fill(hex);
  },
  drop: ({ g, path, fill, hex }) => {
    path(() => {
      g.moveTo(50, 10);
      g.bezierCurveTo(56, 30, 78, 46, 78, 64);
      g.arc(50, 64, 28, 0, Math.PI);
      g.bezierCurveTo(22, 46, 44, 30, 50, 10);
    });
    fill(hex);
    path(() => g.ellipse(40, 64, 6, 11, 0.3, 0, Math.PI * 2));
    g.fillStyle = "rgba(255,255,255,0.8)";
    g.fill();
  },
  sun: ({ g, path, fill, hex }) => {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      path(() => {
        g.moveTo(50 + Math.cos(a) * 30, 50 + Math.sin(a) * 30);
        g.lineTo(50 + Math.cos(a) * 44, 50 + Math.sin(a) * 44);
      });
      g.lineWidth = 7;
      g.stroke();
    }
    path(() => g.arc(50, 50, 22, 0, Math.PI * 2));
    fill(hex);
  },
  leaf: ({ g, path, fill, hex }) => {
    path(() => {
      g.moveTo(18, 82);
      g.bezierCurveTo(14, 36, 50, 14, 84, 16);
      g.bezierCurveTo(86, 52, 62, 86, 18, 82);
    });
    fill(hex);
    path(() => {
      g.moveTo(18, 82);
      g.quadraticCurveTo(46, 54, 70, 30);
    }).stroke();
  },
  apple: ({ g, path, fill, hex }) => {
    path(() => {
      g.moveTo(50, 30);
      g.bezierCurveTo(30, 18, 12, 34, 16, 56);
      g.bezierCurveTo(20, 80, 38, 90, 50, 82);
      g.bezierCurveTo(62, 90, 80, 80, 84, 56);
      g.bezierCurveTo(88, 34, 70, 18, 50, 30);
    });
    fill(hex);
    path(() => {
      g.moveTo(50, 30);
      g.quadraticCurveTo(50, 18, 56, 10);
    }).stroke();
    path(() => g.ellipse(64, 18, 10, 5, -0.5, 0, Math.PI * 2));
    fill("#5bbf4a");
  },
  music: ({ g, path, fill, hex }) => {
    path(() => {
      g.moveTo(38, 72);
      g.lineTo(38, 24);
      g.lineTo(76, 16);
      g.lineTo(76, 62);
    });
    g.lineWidth = 7;
    g.stroke();
    path(() => g.ellipse(30, 74, 11, 8, -0.4, 0, Math.PI * 2));
    fill(hex);
    path(() => g.ellipse(68, 64, 11, 8, -0.4, 0, Math.PI * 2));
    fill(hex);
  },
  home: ({ g, path, fill, hex }) => {
    path(() => {
      g.moveTo(14, 48);
      g.lineTo(50, 16);
      g.lineTo(86, 48);
      g.closePath();
    });
    fill(hex);
    path(() => g.rect(24, 46, 52, 38));
    fill("#fff3d6");
    path(() => g.roundRect(43, 58, 14, 26, 3));
    fill(hex);
  },
  moon: ({ g, path, fill }) => {
    path(() => {
      g.arc(50, 50, 34, Math.PI * 0.35, Math.PI * 1.65);
      g.bezierCurveTo(46, 28, 46, 72, 60, 82);
    });
    fill("#ffe680");
  },
  snow: ({ g, path, hex }) => {
    g.strokeStyle = hex;
    g.lineWidth = 7;
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI) / 3;
      path(() => {
        g.moveTo(50 - Math.cos(a) * 36, 50 - Math.sin(a) * 36);
        g.lineTo(50 + Math.cos(a) * 36, 50 + Math.sin(a) * 36);
      }).stroke();
    }
    g.lineWidth = 5;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const [x, y] = [50 + Math.cos(a) * 24, 50 + Math.sin(a) * 24];
      for (const d of [-0.6, 0.6]) path(() => {
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a + d) * 10, y + Math.sin(a + d) * 10);
      }).stroke();
    }
  },
};

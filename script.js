document.documentElement.classList.add("js");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealItems = document.querySelectorAll("[data-reveal]");
const countItems = document.querySelectorAll("[data-count]");
const navLinks = Array.from(document.querySelectorAll(".site-nav a[href^='#']"));
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);
const header = document.querySelector(".site-header");
const neuralCanvas = document.getElementById("neural-canvas");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.16 }
);

revealItems.forEach((item) => {
  if (reducedMotion) {
    item.classList.add("is-visible");
    return;
  }

  revealObserver.observe(item);
});

const animateCount = (element) => {
  const target = Number.parseFloat(element.dataset.count || "0");
  const decimals = Number.parseInt(element.dataset.decimals || "0", 10);

  if (!Number.isFinite(target)) {
    return;
  }

  if (reducedMotion) {
    element.textContent = target.toFixed(decimals);
    return;
  }

  const duration = 900;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const value = target * progress;
    element.textContent = value.toFixed(decimals);

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  };

  requestAnimationFrame(tick);
};

const countObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      animateCount(entry.target);
      countObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.45 }
);

countItems.forEach((item) => countObserver.observe(item));

const setActiveLink = (id) => {
  navLinks.forEach((link) => {
    const active = link.getAttribute("href") === `#${id}`;
    link.setAttribute("aria-current", active ? "true" : "false");
  });
};

const sectionObserver = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

    if (!visible.length) {
      return;
    }

    setActiveLink(visible[0].target.id);
  },
  {
    threshold: [0.2, 0.35, 0.5, 0.75],
    rootMargin: "-28% 0px -50% 0px",
  }
);

sections.forEach((section) => sectionObserver.observe(section));

const syncHeader = () => {
  if (!header) {
    return;
  }

  header.classList.toggle("scrolled", window.scrollY > 18);
};

syncHeader();
window.addEventListener("scroll", syncHeader, { passive: true });

const currentYear = document.getElementById("current-year");
if (currentYear) {
  currentYear.textContent = String(new Date().getFullYear());
}

const initializeNeuralField = (canvas) => {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const pointer = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    active: false,
  };
  let width = 0;
  let height = 0;
  let dpr = 1;
  let frameId = 0;
  let brainGeometry = null;
  let intracorticalArray = [];
  let surfaceArray = [];
  let fiberCurves = [];
  let signalLanes = [];

  const lerp = (start, end, amount) => start + (end - start) * amount;
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

  const sampleBezier = (p0, p1, p2, p3, t) => {
    const mt = 1 - t;
    const x =
      mt * mt * mt * p0.x +
      3 * mt * mt * t * p1.x +
      3 * mt * t * t * p2.x +
      t * t * t * p3.x;
    const y =
      mt * mt * mt * p0.y +
      3 * mt * mt * t * p1.y +
      3 * mt * t * t * p2.y +
      t * t * t * p3.y;

    return { x, y };
  };

  const buildPerspectiveArray = ({
    originX,
    originY,
    cols,
    rows,
    stepX,
    stepY,
    skewX,
    skewY,
    depthX,
    depthY,
    group,
  }) => {
    const contacts = [];

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = originX + col * stepX + row * skewX;
        const y = originY + row * stepY - col * skewY;

        contacts.push({
          group,
          row,
          col,
          x,
          y,
          baseX: x + depthX,
          baseY: y + depthY,
          radius: group === "surface" ? 5 : 3,
          seed: (row + 1) * 17 + (col + 1) * 23,
        });
      }
    }

    return contacts;
  };

  const buildFiber = (start, end, phase) => {
    const middleX = lerp(start.x, end.x, 0.5);
    const lift = Math.abs(end.x - start.x) * 0.08 + height * 0.04;

    return {
      phase,
      p0: { x: start.x, y: start.y },
      p1: { x: middleX - 80, y: start.y - lift },
      p2: { x: middleX + 36, y: end.y - lift * 0.42 },
      p3: { x: end.x, y: end.y },
    };
  };

  const setPointerHome = () => {
    pointer.x = width * 0.74;
    pointer.y = height * 0.26;
    pointer.targetX = pointer.x;
    pointer.targetY = pointer.y;
  };

  const rebuild = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(dpr, dpr);

    brainGeometry = {
      cx: width * 0.72,
      cy: height * 0.28,
      sx: width * 0.18,
      sy: height * 0.13,
    };

    intracorticalArray = buildPerspectiveArray({
      originX: brainGeometry.cx - brainGeometry.sx * 0.32,
      originY: brainGeometry.cy - brainGeometry.sy * 0.14,
      cols: 6,
      rows: 6,
      stepX: 18,
      stepY: 12.5,
      skewX: 4.2,
      skewY: 2.2,
      depthX: 6,
      depthY: 11,
      group: "intracortical",
    });

    surfaceArray = buildPerspectiveArray({
      originX: width * 0.12,
      originY: height * 0.77,
      cols: 10,
      rows: 4,
      stepX: 34,
      stepY: 14,
      skewX: 11,
      skewY: 2.4,
      depthX: 9,
      depthY: 8,
      group: "surface",
    });

    const sourceContacts = [0, 5, 10, 17, 24, 31]
      .map((index) => intracorticalArray[index])
      .filter(Boolean);
    const targetContacts = [1, 6, 10, 15, 23, 31]
      .map((index) => surfaceArray[index])
      .filter(Boolean);

    fiberCurves = sourceContacts.map((contact, index) =>
      buildFiber(
        { x: contact.x, y: contact.y },
        { x: targetContacts[index].x, y: targetContacts[index].y },
        index * 0.19
      )
    );

    signalLanes = [
      {
        baseY: height * 0.15,
        amplitude: 16,
        width: 1.9,
        speed: 0.0018,
        color: "rgba(58, 166, 188, 0.34)",
      },
      {
        baseY: height * 0.22,
        amplitude: 11,
        width: 1.4,
        speed: 0.0014,
        color: "rgba(103, 212, 224, 0.28)",
      },
      {
        baseY: height * 0.68,
        amplitude: 8,
        width: 1.15,
        speed: 0.0012,
        color: "rgba(150, 100, 63, 0.22)",
      },
    ];

    setPointerHome();
  };

  const sampleLaneY = (lane, x, time) => {
    const pointerDistance = x - pointer.x;
    const pointerEnvelope = Math.exp(-(pointerDistance * pointerDistance) / 54000);
    const wave =
      Math.sin(x * 0.011 + time * lane.speed + lane.baseY * 0.0024) * lane.amplitude +
      Math.sin(x * 0.0048 + time * lane.speed * 0.62) * lane.amplitude * 0.24;
    const pointerLift = (pointer.y - lane.baseY) * pointerEnvelope * 0.16;

    return lane.baseY + wave + pointerLift;
  };

  const drawHudLabel = (x, y, title, detail, align = "left") => {
    context.save();
    context.textAlign = align;
    context.font = "500 10px 'IBM Plex Mono', monospace";
    context.fillStyle = "rgba(16, 61, 68, 0.54)";
    context.fillText(title, x, y);
    context.font = "500 12px 'IBM Plex Mono', monospace";
    context.fillStyle = "rgba(16, 61, 68, 0.82)";
    context.fillText(detail, x, y + 18);
    context.restore();
  };

  const traceBrainPath = (scale = 1, offsetX = 0, offsetY = 0) => {
    const { cx, cy, sx, sy } = brainGeometry;
    context.moveTo(cx - sx * 0.92 * scale + offsetX, cy + sy * 0.08 * scale + offsetY);
    context.bezierCurveTo(
      cx - sx * 1.12 * scale + offsetX,
      cy - sy * 0.62 * scale + offsetY,
      cx - sx * 0.44 * scale + offsetX,
      cy - sy * 1.08 * scale + offsetY,
      cx + sx * 0.14 * scale + offsetX,
      cy - sy * 0.92 * scale + offsetY
    );
    context.bezierCurveTo(
      cx + sx * 0.9 * scale + offsetX,
      cy - sy * 0.78 * scale + offsetY,
      cx + sx * 1.06 * scale + offsetX,
      cy - sy * 0.08 * scale + offsetY,
      cx + sx * 0.92 * scale + offsetX,
      cy + sy * 0.18 * scale + offsetY
    );
    context.bezierCurveTo(
      cx + sx * 0.82 * scale + offsetX,
      cy + sy * 0.74 * scale + offsetY,
      cx + sx * 0.16 * scale + offsetX,
      cy + sy * 0.94 * scale + offsetY,
      cx - sx * 0.42 * scale + offsetX,
      cy + sy * 0.88 * scale + offsetY
    );
    context.bezierCurveTo(
      cx - sx * 1.02 * scale + offsetX,
      cy + sy * 0.62 * scale + offsetY,
      cx - sx * 1.08 * scale + offsetX,
      cy + sy * 0.24 * scale + offsetY,
      cx - sx * 0.92 * scale + offsetX,
      cy + sy * 0.08 * scale + offsetY
    );
  };

  const drawSignalLanes = (time) => {
    signalLanes.forEach((lane, laneIndex) => {
      context.beginPath();

      for (let x = -40; x <= width + 40; x += 14) {
        const y = sampleLaneY(lane, x, time);

        if (x === -40) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }

      context.strokeStyle = lane.color;
      context.lineWidth = lane.width;
      context.stroke();

      for (let pulse = 0; pulse < 3; pulse += 1) {
        const progress = (time * 0.00008 * (1 + laneIndex * 0.12) + pulse * 0.31 + laneIndex * 0.08) % 1;
        const x = progress * (width + 120) - 60;
        const y = sampleLaneY(lane, x, time);
        const glow = context.createRadialGradient(x, y, 0, x, y, 32);
        glow.addColorStop(0, "rgba(58, 166, 188, 0.34)");
        glow.addColorStop(1, "rgba(58, 166, 188, 0)");
        context.fillStyle = glow;
        context.beginPath();
        context.arc(x, y, 32, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = "rgba(16, 61, 68, 0.72)";
        context.beginPath();
        context.arc(x, y, 2.8, 0, Math.PI * 2);
        context.fill();
      }
    });

    context.save();
    context.strokeStyle = "rgba(16, 61, 68, 0.18)";
    context.lineWidth = 1;
    const spikeBase = height * 0.245;
    for (let spike = 0; spike < 18; spike += 1) {
      const x = width * 0.53 + spike * 22;
      const amplitude = 8 + Math.sin(time * 0.004 + spike * 0.9) * 7;
      context.beginPath();
      context.moveTo(x, spikeBase + amplitude * 0.28);
      context.lineTo(x, spikeBase - amplitude);
      context.stroke();
    }
    context.restore();
  };

  const drawBrainShell = (time) => {
    context.save();

    const { cx, cy, sx, sy } = brainGeometry;
    const fill = context.createRadialGradient(cx, cy, 0, cx, cy, sx * 1.24);
    fill.addColorStop(0, "rgba(58, 166, 188, 0.12)");
    fill.addColorStop(0.58, "rgba(58, 166, 188, 0.05)");
    fill.addColorStop(1, "rgba(58, 166, 188, 0)");

    context.beginPath();
    traceBrainPath();
    context.closePath();
    context.fillStyle = fill;
    context.fill();
    context.strokeStyle = "rgba(16, 61, 68, 0.18)";
    context.lineWidth = 2.2;
    context.stroke();

    context.beginPath();
    traceBrainPath(1.04, 7, -3);
    context.strokeStyle = "rgba(58, 166, 188, 0.16)";
    context.lineWidth = 1;
    context.stroke();

    for (let line = 0; line < 6; line += 1) {
      const verticalMix = line / 5;
      const startX = cx - sx * (0.76 - line * 0.05);
      const startY = cy - sy * (0.48 - verticalMix * 0.94);
      const endX = cx + sx * (0.78 - line * 0.07);
      const endY = cy - sy * (0.36 - verticalMix * 0.98);
      const lift = Math.sin(time * 0.0014 + line * 0.7) * 8;

      context.beginPath();
      context.moveTo(startX, startY);
      context.bezierCurveTo(
        cx - sx * 0.22 + line * 8,
        cy - sy * (0.88 - verticalMix * 0.36) + lift,
        cx + sx * 0.18 - line * 6,
        cy + sy * (-0.72 + verticalMix * 0.66) - lift * 0.7,
        endX,
        endY
      );
      context.strokeStyle = `rgba(58, 166, 188, ${0.14 + line * 0.015})`;
      context.lineWidth = 1;
      context.stroke();
    }

    context.beginPath();
    context.arc(cx + sx * 0.54, cy - sy * 0.12, sy * 0.42, -Math.PI * 0.2, Math.PI * 0.84);
    context.strokeStyle = "rgba(103, 212, 224, 0.2)";
    context.lineWidth = 1.2;
    context.stroke();

    context.restore();

    context.save();
    context.strokeStyle = "rgba(16, 61, 68, 0.2)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(cx + sx * 0.2, cy - sy * 0.58);
    context.lineTo(cx + sx * 0.74, cy - sy * 0.92);
    context.lineTo(cx + sx * 0.96, cy - sy * 0.92);
    context.stroke();
    context.restore();

    drawHudLabel(cx + sx * 0.98, cy - sy * 0.98, "Intracortical Array", "Utah-style implant", "left");
  };

  const drawArrayPlate = (contacts, options, time) => {
    const { cols, rows, kind, labelX, labelY, labelTitle, labelDetail } = options;
    const topLeft = contacts[0];
    const topRight = contacts[cols - 1];
    const bottomLeft = contacts[(rows - 1) * cols];
    const bottomRight = contacts[contacts.length - 1];
    const padX = kind === "surface" ? 16 : 8;
    const padY = kind === "surface" ? 14 : 10;

    context.save();
    context.beginPath();
    context.moveTo(topLeft.baseX - padX, topLeft.baseY - padY);
    context.lineTo(topRight.baseX + padX, topRight.baseY - padY * 0.4);
    context.lineTo(bottomRight.baseX + padX * 0.7, bottomRight.baseY + padY);
    context.lineTo(bottomLeft.baseX - padX, bottomLeft.baseY + padY * 0.7);
    context.closePath();

    const plateFill = context.createLinearGradient(topLeft.baseX, topLeft.baseY, bottomRight.baseX, bottomRight.baseY);
    plateFill.addColorStop(0, kind === "surface" ? "rgba(255, 255, 255, 0.24)" : "rgba(255, 255, 255, 0.18)");
    plateFill.addColorStop(1, kind === "surface" ? "rgba(29, 88, 97, 0.12)" : "rgba(16, 61, 68, 0.1)");
    context.fillStyle = plateFill;
    context.fill();
    context.strokeStyle = kind === "surface" ? "rgba(16, 61, 68, 0.2)" : "rgba(58, 166, 188, 0.2)";
    context.lineWidth = 1.1;
    context.stroke();

    for (let row = 0; row < rows; row += 1) {
      const left = contacts[row * cols];
      const right = contacts[row * cols + cols - 1];
      context.beginPath();
      context.moveTo(left.baseX, left.baseY);
      context.lineTo(right.baseX, right.baseY);
      context.strokeStyle = "rgba(16, 61, 68, 0.08)";
      context.lineWidth = 1;
      context.stroke();
    }

    for (let col = 0; col < cols; col += 1) {
      const top = contacts[col];
      const bottom = contacts[(rows - 1) * cols + col];
      context.beginPath();
      context.moveTo(top.baseX, top.baseY);
      context.lineTo(bottom.baseX, bottom.baseY);
      context.strokeStyle = "rgba(16, 61, 68, 0.08)";
      context.lineWidth = 1;
      context.stroke();
    }

    contacts.forEach((contact) => {
      const pointerDistance = Math.hypot(pointer.x - contact.x, pointer.y - contact.y);
      const pointerGain = clamp(1 - pointerDistance / (kind === "surface" ? 240 : 180), 0, 1);
      const scanWave =
        0.5 +
        0.5 * Math.sin(time * (kind === "surface" ? 0.0042 : 0.0052) + contact.col * 0.9 - contact.row * 0.7 + contact.seed * 0.04);
      const intensity = 0.18 + scanWave * 0.42 + pointerGain * 0.46;

      if (kind === "intracortical") {
        context.beginPath();
        context.moveTo(contact.baseX, contact.baseY);
        context.lineTo(contact.x, contact.y);
        context.strokeStyle = `rgba(16, 61, 68, ${0.16 + intensity * 0.42})`;
        context.lineWidth = 1.1;
        context.stroke();

        const tipGlow = context.createRadialGradient(contact.x, contact.y, 0, contact.x, contact.y, 18);
        tipGlow.addColorStop(0, `rgba(58, 166, 188, ${0.18 + intensity * 0.4})`);
        tipGlow.addColorStop(1, "rgba(58, 166, 188, 0)");
        context.fillStyle = tipGlow;
        context.beginPath();
        context.arc(contact.x, contact.y, 18, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = `rgba(13, 52, 58, ${0.5 + intensity * 0.3})`;
        context.beginPath();
        context.arc(contact.x, contact.y, contact.radius + intensity * 1.1, 0, Math.PI * 2);
        context.fill();
      } else {
        const padWidth = 12 + intensity * 2.4;
        const padHeight = 7 + intensity * 1.2;
        const glow = context.createRadialGradient(contact.x, contact.y, 0, contact.x, contact.y, 20);
        glow.addColorStop(0, `rgba(150, 100, 63, ${0.14 + intensity * 0.28})`);
        glow.addColorStop(1, "rgba(150, 100, 63, 0)");
        context.fillStyle = glow;
        context.beginPath();
        context.arc(contact.x, contact.y, 20, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = `rgba(255, 255, 255, ${0.3 + intensity * 0.16})`;
        context.strokeStyle = `rgba(150, 100, 63, ${0.18 + intensity * 0.34})`;
        context.lineWidth = 1;
        context.beginPath();
        context.roundRect(contact.x - padWidth / 2, contact.y - padHeight / 2, padWidth, padHeight, 4);
        context.fill();
        context.stroke();
      }
    });

    context.restore();
    drawHudLabel(labelX, labelY, labelTitle, labelDetail);
  };

  const drawFiberBundles = (time) => {
    fiberCurves.forEach((fiber, fiberIndex) => {
      context.beginPath();
      for (let step = 0; step <= 24; step += 1) {
        const progress = step / 24;
        const point = sampleBezier(fiber.p0, fiber.p1, fiber.p2, fiber.p3, progress);

        if (step === 0) {
          context.moveTo(point.x, point.y);
        } else {
          context.lineTo(point.x, point.y);
        }
      }
      context.strokeStyle = "rgba(58, 166, 188, 0.14)";
      context.lineWidth = 1.15;
      context.stroke();

      for (let pulse = 0; pulse < 2; pulse += 1) {
        const progress = (time * 0.00012 * (1 + fiberIndex * 0.08) + fiber.phase + pulse * 0.46) % 1;
        const point = sampleBezier(fiber.p0, fiber.p1, fiber.p2, fiber.p3, progress);
        const next = sampleBezier(fiber.p0, fiber.p1, fiber.p2, fiber.p3, Math.min(progress + 0.03, 1));

        const pulseGlow = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, 18);
        pulseGlow.addColorStop(0, "rgba(58, 166, 188, 0.32)");
        pulseGlow.addColorStop(1, "rgba(58, 166, 188, 0)");
        context.fillStyle = pulseGlow;
        context.beginPath();
        context.arc(point.x, point.y, 18, 0, Math.PI * 2);
        context.fill();

        context.strokeStyle = "rgba(103, 212, 224, 0.42)";
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(point.x, point.y);
        context.lineTo(next.x, next.y);
        context.stroke();
      }
    });
  };

  const drawReticle = (time) => {
    const alpha = pointer.active ? 0.82 : 0.32;
    const radius = pointer.active ? 30 : 20;

    context.save();
    context.translate(pointer.x, pointer.y);
    context.strokeStyle = `rgba(16, 61, 68, ${alpha})`;
    context.lineWidth = 1.2;
    context.setLineDash([7, 8]);
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);

    context.strokeStyle = `rgba(58, 166, 188, ${alpha})`;
    context.beginPath();
    context.arc(0, 0, radius + 12, Math.PI * 0.18 + time * 0.0012, Math.PI * 0.92 + time * 0.0012);
    context.stroke();
    context.beginPath();
    context.arc(0, 0, radius + 20, -Math.PI * 0.84 - time * 0.001, -Math.PI * 0.18 - time * 0.001);
    context.stroke();

    context.beginPath();
    context.moveTo(-radius - 12, 0);
    context.lineTo(radius + 12, 0);
    context.moveTo(0, -radius - 12);
    context.lineTo(0, radius + 12);
    context.stroke();

    const glow = context.createRadialGradient(0, 0, 0, 0, 0, 80);
    glow.addColorStop(0, "rgba(58, 166, 188, 0.22)");
    glow.addColorStop(1, "rgba(58, 166, 188, 0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(0, 0, 80, 0, Math.PI * 2);
    context.fill();
    context.restore();
  };

  const frame = (time) => {
    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = "source-over";

    drawSignalLanes(time);

    pointer.x += (pointer.targetX - pointer.x) * 0.08;
    pointer.y += (pointer.targetY - pointer.y) * 0.08;

    drawBrainShell(time);
    drawFiberBundles(time);
    drawArrayPlate(intracorticalArray, {
      cols: 6,
      rows: 6,
      kind: "intracortical",
      labelX: brainGeometry.cx + brainGeometry.sx * 0.74,
      labelY: brainGeometry.cy - brainGeometry.sy * 0.34,
      labelTitle: "Implant Interface",
      labelDetail: "6 x 6 active contacts",
    }, time);
    drawArrayPlate(surfaceArray, {
      cols: 10,
      rows: 4,
      kind: "surface",
      labelX: width * 0.11,
      labelY: height * 0.7,
      labelTitle: "Decoder Readout",
      labelDetail: "ECoG / signal matrix",
    }, time);

    drawReticle(time);

    if (!reducedMotion) {
      frameId = requestAnimationFrame(frame);
    }
  };

  const movePointer = (event) => {
    pointer.targetX = event.clientX;
    pointer.targetY = event.clientY;
    pointer.active = true;
  };

  const resetPointer = () => {
    pointer.active = false;
    pointer.targetX = width * 0.72;
    pointer.targetY = height * 0.28;
  };

  rebuild();

  if (reducedMotion) {
    frame(0);
    return;
  }

  frameId = requestAnimationFrame(frame);
  window.addEventListener("resize", rebuild);
  window.addEventListener("pointermove", movePointer, { passive: true });
  document.addEventListener("pointerleave", resetPointer);
  window.addEventListener("blur", resetPointer);
};

if (neuralCanvas) {
  initializeNeuralField(neuralCanvas);
}

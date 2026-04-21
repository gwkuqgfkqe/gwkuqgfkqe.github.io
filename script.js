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
    pulseAt: 0,
  };
  let width = 0;
  let height = 0;
  let dpr = 1;
  let frameId = 0;
  let brainGeometry = null;
  let neurons = [];
  let edges = [];
  let adjacency = [];
  let electrodeArray = { cols: 0, rows: 0, contacts: [] };
  let collectors = [];
  let bursts = [];

  const lerp = (start, end, amount) => start + (end - start) * amount;
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  const distance = (from, to) => Math.hypot(from.x - to.x, from.y - to.y);

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

  const sampleBridge = (start, end, t, bend = 0.18) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy) || 1;
    const normalX = -dy / length;
    const normalY = dx / length;
    const lift = Math.min(26, length * bend);

    return sampleBezier(
      start,
      {
        x: lerp(start.x, end.x, 0.28) + normalX * lift,
        y: lerp(start.y, end.y, 0.28) + normalY * lift,
      },
      {
        x: lerp(start.x, end.x, 0.72) + normalX * lift * 0.62,
        y: lerp(start.y, end.y, 0.72) + normalY * lift * 0.62,
      },
      end,
      t
    );
  };

  const brainContainsNormalized = (nx, ny) => {
    const leftHemisphere = ((nx + 0.3) ** 2) / 0.47 + ((ny + 0.02) ** 2) / 0.56 <= 1;
    const rightHemisphere = ((nx - 0.3) ** 2) / 0.47 + ((ny + 0.02) ** 2) / 0.56 <= 1;
    const crown = (nx ** 2) / 1.03 + ((ny + 0.2) ** 2) / 0.58 <= 1;
    const lowerMass = (nx ** 2) / 0.9 + ((ny - 0.16) ** 2) / 0.68 <= 1;
    const brainStemCut = (nx ** 2) / 0.03 + ((ny - 0.98) ** 2) / 0.02 <= 1;

    return (leftHemisphere || rightHemisphere || crown || lowerMass) && !brainStemCut && ny > -0.96 && ny < 1.04;
  };

  const brainContainsPoint = (x, y) => {
    if (!brainGeometry) {
      return false;
    }

    const nx = (x - brainGeometry.cx) / brainGeometry.sx;
    const ny = (y - brainGeometry.cy) / brainGeometry.sy;
    return brainContainsNormalized(nx, ny);
  };

  const traceBrainPath = (scale = 1, offsetX = 0, offsetY = 0) => {
    const { cx, cy, sx, sy } = brainGeometry;

    context.moveTo(cx - sx * 0.98 * scale + offsetX, cy + sy * 0.08 * scale + offsetY);
    context.bezierCurveTo(
      cx - sx * 1.16 * scale + offsetX,
      cy - sy * 0.52 * scale + offsetY,
      cx - sx * 0.76 * scale + offsetX,
      cy - sy * 0.94 * scale + offsetY,
      cx - sx * 0.22 * scale + offsetX,
      cy - sy * 0.9 * scale + offsetY
    );
    context.bezierCurveTo(
      cx + sx * 0.18 * scale + offsetX,
      cy - sy * 1.02 * scale + offsetY,
      cx + sx * 0.82 * scale + offsetX,
      cy - sy * 0.86 * scale + offsetY,
      cx + sx * 0.98 * scale + offsetX,
      cy - sy * 0.26 * scale + offsetY
    );
    context.bezierCurveTo(
      cx + sx * 1.1 * scale + offsetX,
      cy + sy * 0.18 * scale + offsetY,
      cx + sx * 0.82 * scale + offsetX,
      cy + sy * 0.78 * scale + offsetY,
      cx + sx * 0.2 * scale + offsetX,
      cy + sy * 0.86 * scale + offsetY
    );
    context.bezierCurveTo(
      cx - sx * 0.18 * scale + offsetX,
      cy + sy * 0.92 * scale + offsetY,
      cx - sx * 0.78 * scale + offsetX,
      cy + sy * 0.72 * scale + offsetY,
      cx - sx * 0.98 * scale + offsetX,
      cy + sy * 0.08 * scale + offsetY
    );
  };

  const buildElectrodeArray = () => {
    const cols = width < 900 ? 4 : 5;
    const rows = width < 900 ? 4 : 5;
    const contacts = [];
    const plateX = brainGeometry.cx + brainGeometry.sx * 0.12;
    const plateY = brainGeometry.cy - brainGeometry.sy * 0.84;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const index = row * cols + col;
        const baseX = plateX + col * 18 + row * 4.2;
        const baseY = plateY + row * 12.5 - col * 2.2;
        const tipX = brainGeometry.cx + brainGeometry.sx * (0.08 + col * 0.11) + row * 2.1;
        const tipY = brainGeometry.cy - brainGeometry.sy * (0.48 - row * 0.12) - col * 1.4;

        contacts.push({
          index,
          row,
          col,
          baseX,
          baseY,
          tipX,
          tipY,
          seed: 13 + index * 17,
        });
      }
    }

    return { cols, rows, contacts };
  };

  const setPointerHome = () => {
    pointer.x = brainGeometry.cx - brainGeometry.sx * 0.08;
    pointer.y = brainGeometry.cy - brainGeometry.sy * 0.02;
    pointer.targetX = pointer.x;
    pointer.targetY = pointer.y;
  };

  const buildNeuralField = () => {
    neurons = [];
    edges = [];
    adjacency = [];
    collectors = [];
    bursts = [];
    electrodeArray = buildElectrodeArray();

    const targetCount = width < 900 ? 110 : 165;
    let attempts = 0;

    while (neurons.length < targetCount && attempts < targetCount * 40) {
      const nx = Math.random() * 2.1 - 1.05;
      const ny = Math.random() * 1.92 - 0.96;
      attempts += 1;

      if (!brainContainsNormalized(nx, ny)) {
        continue;
      }

      const candidate = {
        x: brainGeometry.cx + nx * brainGeometry.sx,
        y: brainGeometry.cy + ny * brainGeometry.sy,
      };

      const tooClose = neurons.some((node) => distance(node, candidate) < (width < 900 ? 18 : 16));
      if (tooClose) {
        continue;
      }

      neurons.push({
        ...candidate,
        radius: 1.7 + Math.random() * 1.7,
        phase: Math.random() * Math.PI * 2,
        seed: Math.random() * 1000,
      });
    }

    const edgeKeys = new Set();

    neurons.forEach((node, index) => {
      const nearest = neurons
        .map((neighbor, neighborIndex) => ({
          neighborIndex,
          dist: index === neighborIndex ? Number.POSITIVE_INFINITY : distance(node, neighbor),
        }))
        .filter(({ dist }) => dist < Math.min(brainGeometry.sx * 0.34, 104))
        .sort((left, right) => left.dist - right.dist)
        .slice(0, 4);

      nearest.forEach(({ neighborIndex, dist }) => {
        const from = Math.min(index, neighborIndex);
        const to = Math.max(index, neighborIndex);
        const key = `${from}:${to}`;

        if (edgeKeys.has(key)) {
          return;
        }

        edgeKeys.add(key);
        edges.push({
          a: from,
          b: to,
          length: dist,
          seed: 29 + edges.length * 11,
        });
      });
    });

    adjacency = Array.from({ length: neurons.length }, () => []);
    edges.forEach((edge, edgeIndex) => {
      adjacency[edge.a].push({ to: edge.b, weight: edge.length, edgeIndex });
      adjacency[edge.b].push({ to: edge.a, weight: edge.length, edgeIndex });
    });

    const usedNeurons = new Set();
    const collectorCount = Math.min(electrodeArray.contacts.length, width < 900 ? 8 : 10);
    collectors = electrodeArray.contacts.slice(0, collectorCount).map((contact, collectorIndex) => {
      let bestIndex = 0;
      let bestScore = Number.POSITIVE_INFINITY;

      neurons.forEach((node, nodeIndex) => {
        if (usedNeurons.has(nodeIndex)) {
          return;
        }

        const score = distance(node, { x: contact.tipX, y: contact.tipY }) + Math.abs(node.x - contact.tipX) * 0.12;
        if (score < bestScore) {
          bestScore = score;
          bestIndex = nodeIndex;
        }
      });

      usedNeurons.add(bestIndex);
      const node = neurons[bestIndex];
      const dx = contact.tipX - node.x;
      const dy = contact.tipY - node.y;
      const length = Math.hypot(dx, dy) || 1;
      const normalX = -dy / length;
      const normalY = dx / length;
      const lift = Math.min(28, length * 0.2);

      return {
        collectorIndex,
        contactIndex: contact.index,
        nodeIndex: bestIndex,
        contact,
        curveA: {
          x: lerp(node.x, contact.tipX, 0.28) + normalX * lift,
          y: lerp(node.y, contact.tipY, 0.28) + normalY * lift - 14,
        },
        curveB: {
          x: lerp(node.x, contact.tipX, 0.72) + normalX * lift * 0.54,
          y: lerp(node.y, contact.tipY, 0.72) + normalY * lift * 0.54 - 8,
        },
      };
    });
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
      cx: width * (width < 900 ? 0.54 : 0.61),
      cy: height * (width < 900 ? 0.29 : 0.34),
      sx: Math.min(width * (width < 900 ? 0.31 : 0.24), 420),
      sy: Math.min(height * (width < 900 ? 0.19 : 0.22), 250),
    };

    buildNeuralField();
    setPointerHome();
  };

  const getNearestNeuronIndex = (x, y) => {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    neurons.forEach((node, index) => {
      const currentDistance = Math.hypot(node.x - x, node.y - y);
      if (currentDistance < bestDistance) {
        bestDistance = currentDistance;
        bestIndex = index;
      }
    });

    return bestIndex;
  };

  const getHoverFocus = () => {
    const fallback = {
      x: brainGeometry.cx - brainGeometry.sx * 0.08,
      y: brainGeometry.cy - brainGeometry.sy * 0.04,
    };
    const index = neurons.length
      ? getNearestNeuronIndex(pointer.active ? pointer.x : fallback.x, pointer.active ? pointer.y : fallback.y)
      : 0;
    const node = neurons[index] || fallback;

    return {
      x: node.x,
      y: node.y,
      intensity: pointer.active ? 1 : 0.44,
    };
  };

  const createBurst = (sourceX, sourceY) => {
    if (!neurons.length) {
      return;
    }

    const sourceIndex = getNearestNeuronIndex(sourceX, sourceY);
    const nodeTimes = Array.from({ length: neurons.length }, () => Number.POSITIVE_INFINITY);
    const parents = Array.from({ length: neurons.length }, () => -1);
    const visited = Array.from({ length: neurons.length }, () => false);
    nodeTimes[sourceIndex] = 0;

    for (let step = 0; step < neurons.length; step += 1) {
      let current = -1;
      let currentTime = Number.POSITIVE_INFINITY;

      for (let index = 0; index < neurons.length; index += 1) {
        if (!visited[index] && nodeTimes[index] < currentTime) {
          current = index;
          currentTime = nodeTimes[index];
        }
      }

      if (current === -1) {
        break;
      }

      visited[current] = true;
      adjacency[current].forEach(({ to, weight }) => {
        const nextTime = currentTime + 40 + weight * 4.8;
        if (nextTime < nodeTimes[to]) {
          nodeTimes[to] = nextTime;
          parents[to] = current;
        }
      });
    }

    const collectorSchedule = collectors
      .map((collector) => {
        const reachTime = nodeTimes[collector.nodeIndex];
        if (!Number.isFinite(reachTime)) {
          return null;
        }

        return {
          collectorIndex: collector.collectorIndex,
          launchAt: reachTime + 140 + collector.collectorIndex * 34,
        };
      })
      .filter(Boolean);

    const maxTime = nodeTimes.reduce(
      (maximum, value) => (Number.isFinite(value) ? Math.max(maximum, value) : maximum),
      0
    );

    bursts.push({
      start: performance.now(),
      sourceIndex,
      nodeTimes,
      parents,
      collectorSchedule,
      duration: maxTime + 1400,
    });

    bursts = bursts.slice(-3);
  };

  const getNodeBurstIntensity = (burst, nodeIndex, elapsed) => {
    const fireAt = burst.nodeTimes[nodeIndex];
    if (!Number.isFinite(fireAt)) {
      return 0;
    }

    const waveFront = Math.exp(-((elapsed - fireAt) ** 2) / 18000);
    const tail = elapsed > fireAt ? Math.exp(-(elapsed - fireAt) / 480) * 0.74 : 0;
    const sourceBoost = nodeIndex === burst.sourceIndex ? Math.exp(-(elapsed - fireAt) / 260) * 0.46 : 0;

    return Math.max(waveFront * 1.18, tail + sourceBoost);
  };

  const drawPulseSegment = (start, end, progress, widthScale) => {
    const current = sampleBridge(start, end, progress, 0.14);
    const previous = sampleBridge(start, end, Math.max(progress - 0.05, 0), 0.14);
    const glow = context.createRadialGradient(current.x, current.y, 0, current.x, current.y, 24);
    glow.addColorStop(0, "rgba(130, 245, 255, 0.62)");
    glow.addColorStop(1, "rgba(130, 245, 255, 0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(current.x, current.y, 24, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "rgba(130, 245, 255, 0.82)";
    context.lineWidth = 2 * widthScale;
    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.lineTo(current.x, current.y);
    context.stroke();
  };

  const drawBackdrop = (time) => {
    const { cx, cy, sx, sy } = brainGeometry;
    const mainGlow = context.createRadialGradient(cx, cy, 0, cx, cy, sx * 1.36);
    mainGlow.addColorStop(0, "rgba(93, 223, 255, 0.16)");
    mainGlow.addColorStop(0.58, "rgba(93, 223, 255, 0.06)");
    mainGlow.addColorStop(1, "rgba(93, 223, 255, 0)");
    context.fillStyle = mainGlow;
    context.beginPath();
    context.arc(cx, cy, sx * 1.36, 0, Math.PI * 2);
    context.fill();

    const lowField = context.createLinearGradient(0, cy + sy * 0.42, width, cy + sy * 0.82);
    lowField.addColorStop(0, "rgba(64, 201, 228, 0)");
    lowField.addColorStop(0.32, "rgba(64, 201, 228, 0.08)");
    lowField.addColorStop(0.68, "rgba(64, 201, 228, 0.12)");
    lowField.addColorStop(1, "rgba(64, 201, 228, 0)");
    context.strokeStyle = lowField;
    context.lineWidth = 1.2;

    for (let lane = 0; lane < 3; lane += 1) {
      context.beginPath();
      for (let x = -40; x <= width + 40; x += 16) {
        const wave =
          Math.sin(x * 0.008 + time * 0.0012 + lane * 1.4) * (10 + lane * 4) +
          Math.sin(x * 0.0046 + time * 0.0006 + lane * 0.7) * 4;
        const y = cy + sy * (0.56 + lane * 0.18) + wave;

        if (x === -40) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }
      context.stroke();
    }
  };

  const drawBrainVolume = (time) => {
    const { cx, cy, sx, sy } = brainGeometry;
    const hover = getHoverFocus();

    context.save();
    context.beginPath();
    traceBrainPath();
    context.closePath();

    const shellFill = context.createRadialGradient(cx - sx * 0.2, cy - sy * 0.24, sx * 0.08, cx, cy, sx * 1.18);
    shellFill.addColorStop(0, "rgba(167, 248, 255, 0.16)");
    shellFill.addColorStop(0.34, "rgba(90, 212, 236, 0.12)");
    shellFill.addColorStop(0.72, "rgba(32, 99, 131, 0.08)");
    shellFill.addColorStop(1, "rgba(16, 61, 68, 0)");
    context.fillStyle = shellFill;
    context.fill();
    context.strokeStyle = "rgba(109, 232, 255, 0.24)";
    context.lineWidth = 2.4;
    context.stroke();

    context.beginPath();
    traceBrainPath(1.05, sx * 0.04, -sy * 0.03);
    context.strokeStyle = "rgba(109, 232, 255, 0.1)";
    context.lineWidth = 1;
    context.stroke();

    context.clip();

    const hoverGlow = context.createRadialGradient(hover.x, hover.y, 0, hover.x, hover.y, sx * 0.44);
    hoverGlow.addColorStop(0, `rgba(130, 245, 255, ${0.24 * hover.intensity})`);
    hoverGlow.addColorStop(0.4, `rgba(130, 245, 255, ${0.12 * hover.intensity})`);
    hoverGlow.addColorStop(1, "rgba(130, 245, 255, 0)");
    context.fillStyle = hoverGlow;
    context.fillRect(cx - sx * 1.4, cy - sy * 1.4, sx * 2.8, sy * 2.8);

    const depthWash = context.createLinearGradient(cx, cy - sy, cx, cy + sy);
    depthWash.addColorStop(0, "rgba(255, 255, 255, 0.06)");
    depthWash.addColorStop(0.48, "rgba(52, 168, 195, 0.05)");
    depthWash.addColorStop(1, "rgba(10, 35, 49, 0.1)");
    context.fillStyle = depthWash;
    context.fillRect(cx - sx * 1.2, cy - sy * 1.2, sx * 2.4, sy * 2.4);

    for (let fold = 0; fold < 13; fold += 1) {
      const progress = fold / 12;
      const startX = cx - sx * (0.78 - progress * 0.16);
      const startY = cy - sy * (0.55 - progress * 1.02);
      const endX = cx + sx * (0.78 - progress * 0.12);
      const endY = cy - sy * (0.5 - progress * 1.08);
      const drift = Math.sin(time * 0.001 + fold * 0.62) * 9;

      context.beginPath();
      context.moveTo(startX, startY);
      context.bezierCurveTo(
        cx - sx * 0.24 + fold * 7,
        cy - sy * (0.96 - progress * 0.18) + drift,
        cx + sx * 0.2 - fold * 4,
        cy + sy * (-0.78 + progress * 0.62) - drift * 0.7,
        endX,
        endY
      );
      context.strokeStyle = `rgba(122, 236, 255, ${0.05 + (1 - Math.abs(progress - 0.5)) * 0.08})`;
      context.lineWidth = 1.1;
      context.stroke();
    }

    bursts.forEach((burst) => {
      const elapsed = time - burst.start;
      if (elapsed < 0 || elapsed > burst.duration) {
        return;
      }

      const source = neurons[burst.sourceIndex];
      const ringRadius = 18 + elapsed * 0.19;
      const ringAlpha = clamp(0.32 - elapsed / 2200, 0, 0.32);

      context.beginPath();
      context.arc(source.x, source.y, ringRadius, 0, Math.PI * 2);
      context.strokeStyle = `rgba(130, 245, 255, ${ringAlpha})`;
      context.lineWidth = 1.4;
      context.stroke();
    });

    context.restore();
  };

  const drawNeuralMesh = (time) => {
    const hover = getHoverFocus();

    edges.forEach((edge) => {
      const start = neurons[edge.a];
      const end = neurons[edge.b];
      const midpoint = {
        x: lerp(start.x, end.x, 0.5),
        y: lerp(start.y, end.y, 0.5),
      };
      const hoverGain = clamp(1 - distance(midpoint, hover) / 180, 0, 1);
      let burstGain = 0;

      bursts.forEach((burst) => {
        const elapsed = time - burst.start;
        const edgeTime = (burst.nodeTimes[edge.a] + burst.nodeTimes[edge.b]) * 0.5;
        if (!Number.isFinite(edgeTime)) {
          return;
        }

        burstGain = Math.max(burstGain, Math.exp(-((elapsed - edgeTime) ** 2) / 32000));
      });

      context.strokeStyle = `rgba(110, 232, 255, ${0.035 + hoverGain * 0.08 + burstGain * 0.16})`;
      context.lineWidth = 0.85 + burstGain * 0.8;
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    });

    bursts.forEach((burst) => {
      const elapsed = time - burst.start;
      if (elapsed < 0 || elapsed > burst.duration) {
        return;
      }

      burst.parents.forEach((parentIndex, nodeIndex) => {
        if (parentIndex < 0) {
          return;
        }

        const startTime = burst.nodeTimes[parentIndex];
        const endTime = burst.nodeTimes[nodeIndex];
        if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
          return;
        }

        const localTime = elapsed - startTime;
        const travelTime = Math.max(80, endTime - startTime);
        if (localTime < 0 || localTime > travelTime + 120) {
          return;
        }

        drawPulseSegment(neurons[parentIndex], neurons[nodeIndex], clamp(localTime / travelTime, 0, 1), 1);
      });
    });

    neurons.forEach((node, index) => {
      const ambient = 0.18 + 0.18 * Math.sin(time * 0.0018 + node.phase);
      const hoverGain = clamp(1 - distance(node, hover) / 132, 0, 1);
      let burstGain = 0;

      bursts.forEach((burst) => {
        const elapsed = time - burst.start;
        burstGain = Math.max(burstGain, getNodeBurstIntensity(burst, index, elapsed));
      });

      const glowRadius = 10 + hoverGain * 16 + burstGain * 26;
      const glow = context.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowRadius);
      glow.addColorStop(0, `rgba(140, 246, 255, ${0.18 + hoverGain * 0.18 + burstGain * 0.34})`);
      glow.addColorStop(1, "rgba(140, 246, 255, 0)");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = `rgba(223, 252, 255, ${0.56 + ambient * 0.2 + burstGain * 0.24})`;
      context.beginPath();
      context.arc(node.x, node.y, node.radius + hoverGain * 0.8 + burstGain * 1.3, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = `rgba(21, 54, 72, ${0.5 + burstGain * 0.26})`;
      context.beginPath();
      context.arc(node.x, node.y, Math.max(0.9, node.radius * 0.42), 0, Math.PI * 2);
      context.fill();
    });
  };

  const drawElectrodeArray = (time) => {
    const { contacts, cols, rows } = electrodeArray;
    if (!contacts.length) {
      return;
    }

    const topLeft = contacts[0];
    const topRight = contacts[cols - 1];
    const bottomLeft = contacts[(rows - 1) * cols];
    const bottomRight = contacts[contacts.length - 1];
    const contactActivity = Array.from({ length: contacts.length }, () => 0);

    bursts.forEach((burst) => {
      burst.collectorSchedule.forEach((item) => {
        const phase = time - burst.start - item.launchAt;
        if (phase < 0 || phase > 760) {
          return;
        }

        const collector = collectors[item.collectorIndex];
        contactActivity[collector.contactIndex] = Math.max(contactActivity[collector.contactIndex], 1 - phase / 760);
      });
    });

    context.save();
    context.beginPath();
    context.moveTo(topLeft.baseX - 18, topLeft.baseY - 14);
    context.lineTo(topRight.baseX + 16, topRight.baseY - 8);
    context.lineTo(bottomRight.baseX + 14, bottomRight.baseY + 10);
    context.lineTo(bottomLeft.baseX - 16, bottomLeft.baseY + 12);
    context.closePath();

    const plateFill = context.createLinearGradient(topLeft.baseX, topLeft.baseY, bottomRight.baseX, bottomRight.baseY);
    plateFill.addColorStop(0, "rgba(255, 255, 255, 0.34)");
    plateFill.addColorStop(0.48, "rgba(144, 244, 255, 0.18)");
    plateFill.addColorStop(1, "rgba(19, 69, 88, 0.2)");
    context.fillStyle = plateFill;
    context.fill();
    context.strokeStyle = "rgba(122, 236, 255, 0.24)";
    context.lineWidth = 1.15;
    context.stroke();

    for (let row = 0; row < rows; row += 1) {
      const left = contacts[row * cols];
      const right = contacts[row * cols + cols - 1];
      context.beginPath();
      context.moveTo(left.baseX, left.baseY);
      context.lineTo(right.baseX, right.baseY);
      context.strokeStyle = "rgba(122, 236, 255, 0.08)";
      context.lineWidth = 1;
      context.stroke();
    }

    for (let col = 0; col < cols; col += 1) {
      const top = contacts[col];
      const bottom = contacts[(rows - 1) * cols + col];
      context.beginPath();
      context.moveTo(top.baseX, top.baseY);
      context.lineTo(bottom.baseX, bottom.baseY);
      context.strokeStyle = "rgba(122, 236, 255, 0.08)";
      context.lineWidth = 1;
      context.stroke();
    }

    collectors.forEach((collector) => {
      const node = neurons[collector.nodeIndex];
      const target = {
        x: collector.contact.tipX,
        y: collector.contact.tipY,
      };
      context.beginPath();
      context.moveTo(node.x, node.y);
      for (let step = 1; step <= 12; step += 1) {
        const point = sampleBezier(node, collector.curveA, collector.curveB, target, step / 12);
        context.lineTo(point.x, point.y);
      }
      context.strokeStyle = "rgba(122, 236, 255, 0.07)";
      context.lineWidth = 0.95;
      context.stroke();
    });

    contacts.forEach((contact) => {
      const active = contactActivity[contact.index];
      const shimmer = 0.24 + 0.18 * Math.sin(time * 0.0026 + contact.seed * 0.17);

      context.beginPath();
      context.moveTo(contact.baseX, contact.baseY);
      context.lineTo(contact.tipX, contact.tipY);
      context.strokeStyle = `rgba(122, 236, 255, ${0.1 + shimmer * 0.16 + active * 0.36})`;
      context.lineWidth = 1.05 + active * 0.9;
      context.stroke();

      const tipGlow = context.createRadialGradient(contact.tipX, contact.tipY, 0, contact.tipX, contact.tipY, 14 + active * 10);
      tipGlow.addColorStop(0, `rgba(122, 236, 255, ${0.2 + active * 0.34})`);
      tipGlow.addColorStop(1, "rgba(122, 236, 255, 0)");
      context.fillStyle = tipGlow;
      context.beginPath();
      context.arc(contact.tipX, contact.tipY, 14 + active * 10, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = `rgba(237, 253, 255, ${0.42 + shimmer * 0.2 + active * 0.22})`;
      context.beginPath();
      context.roundRect(contact.baseX - 4.5, contact.baseY - 3.6, 9, 7.2, 3);
      context.fill();
      context.strokeStyle = `rgba(122, 236, 255, ${0.18 + active * 0.36})`;
      context.lineWidth = 1;
      context.stroke();
    });

    bursts.forEach((burst) => {
      burst.collectorSchedule.forEach((item) => {
        const phase = time - burst.start - item.launchAt;
        if (phase < 0 || phase > 760) {
          return;
        }

        const collector = collectors[item.collectorIndex];
        const node = neurons[collector.nodeIndex];
        const contact = collector.contact;

        if (phase <= 460) {
          const progress = clamp(phase / 460, 0, 1);
          const point = sampleBezier(node, collector.curveA, collector.curveB, { x: contact.tipX, y: contact.tipY }, progress);
          const previous = sampleBezier(
            node,
            collector.curveA,
            collector.curveB,
            { x: contact.tipX, y: contact.tipY },
            Math.max(progress - 0.06, 0)
          );
          const glow = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, 24);
          glow.addColorStop(0, "rgba(130, 245, 255, 0.7)");
          glow.addColorStop(1, "rgba(130, 245, 255, 0)");
          context.fillStyle = glow;
          context.beginPath();
          context.arc(point.x, point.y, 24, 0, Math.PI * 2);
          context.fill();

          context.strokeStyle = "rgba(130, 245, 255, 0.86)";
          context.lineWidth = 2.1;
          context.beginPath();
          context.moveTo(previous.x, previous.y);
          context.lineTo(point.x, point.y);
          context.stroke();
        } else {
          const progress = clamp((phase - 460) / 220, 0, 1);
          const point = {
            x: lerp(contact.tipX, contact.baseX, progress),
            y: lerp(contact.tipY, contact.baseY, progress),
          };
          const glow = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, 22);
          glow.addColorStop(0, "rgba(130, 245, 255, 0.72)");
          glow.addColorStop(1, "rgba(130, 245, 255, 0)");
          context.fillStyle = glow;
          context.beginPath();
          context.arc(point.x, point.y, 22, 0, Math.PI * 2);
          context.fill();
        }
      });
    });

    context.restore();
  };

  const drawPointerField = (time) => {
    const hover = getHoverFocus();
    const pulseAge = pointer.pulseAt ? time - pointer.pulseAt : Number.POSITIVE_INFINITY;
    const haloRadius = pointer.active ? 36 : 24;
    const field = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 88);
    field.addColorStop(0, `rgba(130, 245, 255, ${pointer.active ? 0.16 : 0.08})`);
    field.addColorStop(1, "rgba(130, 245, 255, 0)");
    context.fillStyle = field;
    context.beginPath();
    context.arc(pointer.x, pointer.y, 88, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = `rgba(122, 236, 255, ${pointer.active ? 0.42 : 0.18})`;
    context.lineWidth = 1.1;
    context.beginPath();
    context.arc(pointer.x, pointer.y, haloRadius + Math.sin(time * 0.006) * 1.8, 0, Math.PI * 2);
    context.stroke();

    if (pointer.active && !brainContainsPoint(pointer.x, pointer.y)) {
      context.strokeStyle = "rgba(122, 236, 255, 0.18)";
      context.lineWidth = 1;
      context.setLineDash([6, 7]);
      context.beginPath();
      context.moveTo(pointer.x, pointer.y);
      context.lineTo(hover.x, hover.y);
      context.stroke();
      context.setLineDash([]);
    }

    if (pulseAge >= 0 && pulseAge < 520) {
      const rippleRadius = 18 + pulseAge * 0.14;
      const rippleAlpha = clamp(0.36 - pulseAge / 1600, 0, 0.36);
      context.beginPath();
      context.arc(pointer.x, pointer.y, rippleRadius, 0, Math.PI * 2);
      context.strokeStyle = `rgba(130, 245, 255, ${rippleAlpha})`;
      context.lineWidth = 1.4;
      context.stroke();
    }
  };

  const frame = (time) => {
    context.clearRect(0, 0, width, height);
    pointer.x += (pointer.targetX - pointer.x) * 0.12;
    pointer.y += (pointer.targetY - pointer.y) * 0.12;
    bursts = bursts.filter((burst) => time - burst.start < burst.duration);

    drawBackdrop(time);
    drawBrainVolume(time);
    drawNeuralMesh(time);
    drawElectrodeArray(time);
    drawPointerField(time);

    if (!reducedMotion) {
      frameId = requestAnimationFrame(frame);
    }
  };

  const movePointer = (event) => {
    pointer.targetX = event.clientX;
    pointer.targetY = event.clientY;
    pointer.active = true;
  };

  const triggerBurst = (event) => {
    pointer.targetX = event.clientX;
    pointer.targetY = event.clientY;
    pointer.active = true;
    pointer.pulseAt = performance.now();
    createBurst(event.clientX, event.clientY);
  };

  const resetPointer = () => {
    pointer.active = false;
    setPointerHome();
  };

  rebuild();

  if (reducedMotion) {
    frame(0);
    return;
  }

  frameId = requestAnimationFrame(frame);
  window.addEventListener("resize", rebuild);
  window.addEventListener("pointermove", movePointer, { passive: true });
  window.addEventListener("pointerdown", triggerBurst, { passive: true });
  document.addEventListener("pointerleave", resetPointer);
  window.addEventListener("blur", resetPointer);
};

if (neuralCanvas) {
  initializeNeuralField(neuralCanvas);
}

document.documentElement.classList.add("js");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealItems = document.querySelectorAll("[data-reveal]");
const eagerRevealItems = new Set(document.querySelectorAll(".hero [data-reveal]"));
const countItems = document.querySelectorAll("[data-count]");
const navLinks = Array.from(document.querySelectorAll(".site-nav a[href^='#']"));
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);
const header = document.querySelector(".site-header");
const neuralCanvas = document.getElementById("neural-canvas");
const brainStageImage = document.getElementById("brain-stage-image");
const rootStyle = document.documentElement.style;
const brainCrop = {
  left: 171 / 1200,
  right: (1200 - 992) / 1200,
  top: 59 / 800,
  bottom: (800 - 754) / 800,
};
brainCrop.visibleWidth = 1 - brainCrop.left - brainCrop.right;
brainCrop.visibleHeight = 1 - brainCrop.top - brainCrop.bottom;

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
  if (reducedMotion || eagerRevealItems.has(item)) {
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

  const brainImage = new Image();
  brainImage.decoding = "async";

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
  let stageLayout = {
    contentLeft: 0,
    contentWidth: 0,
    desktop: false,
  };
  let brainImageReady = false;
  let brainMaskData = null;
  let brainMaskWidth = 0;
  let brainMaskHeight = 0;
  let neurons = [];
  let edges = [];
  let adjacency = [];
  let bursts = [];

  const lerp = (start, end, amount) => start + (end - start) * amount;
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  const distance = (from, to) => Math.hypot(from.x - to.x, from.y - to.y);
  const buildBrainMask = () => {
    if (!brainImage.naturalWidth || !brainImage.naturalHeight) {
      return;
    }

    const maskCanvas = document.createElement("canvas");
    brainMaskWidth = 560;
    brainMaskHeight = Math.max(1, Math.round((brainImage.naturalHeight / brainImage.naturalWidth) * brainMaskWidth));
    maskCanvas.width = brainMaskWidth;
    maskCanvas.height = brainMaskHeight;

    const maskContext = maskCanvas.getContext("2d");
    if (!maskContext) {
      return;
    }

    maskContext.clearRect(0, 0, brainMaskWidth, brainMaskHeight);
    maskContext.drawImage(brainImage, 0, 0, brainMaskWidth, brainMaskHeight);
    brainMaskData = maskContext.getImageData(0, 0, brainMaskWidth, brainMaskHeight).data;
  };

  const getBrainPixelInfo = (u, v) => {
    const mappedU = brainCrop.left + u * brainCrop.visibleWidth;
    const mappedV = brainCrop.top + v * brainCrop.visibleHeight;
    if (!brainMaskData || !brainMaskWidth || !brainMaskHeight) {
      return {
        alpha: brainContainsRelative(u, v) ? 1 : 0,
        luminance: 0.62,
        signal: 0.42,
      };
    }

    const maskX = clamp(Math.round(mappedU * (brainMaskWidth - 1)), 0, brainMaskWidth - 1);
    const maskY = clamp(Math.round(mappedV * (brainMaskHeight - 1)), 0, brainMaskHeight - 1);
    const pixelIndex = (maskY * brainMaskWidth + maskX) * 4;
    const red = brainMaskData[pixelIndex];
    const green = brainMaskData[pixelIndex + 1];
    const blue = brainMaskData[pixelIndex + 2];
    const alpha = brainMaskData[pixelIndex + 3] / 255;
    const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
    const cyan = clamp(((green * 0.58 + blue * 0.9) - red * 0.18) / 255, 0, 1);
    const signal = clamp(luminance * 0.52 + cyan * 0.84 - 0.22, 0, 1) * alpha;

    return {
      alpha,
      luminance,
      signal,
    };
  };

  const brainContainsRelative = (u, v) => {
    if (u < 0 || u > 1 || v < 0 || v > 1) {
      return false;
    }

    if (brainMaskData && brainMaskWidth && brainMaskHeight) {
      const mappedU = brainCrop.left + u * brainCrop.visibleWidth;
      const mappedV = brainCrop.top + v * brainCrop.visibleHeight;
      const maskX = clamp(Math.round(mappedU * (brainMaskWidth - 1)), 0, brainMaskWidth - 1);
      const maskY = clamp(Math.round(mappedV * (brainMaskHeight - 1)), 0, brainMaskHeight - 1);
      const alphaIndex = (maskY * brainMaskWidth + maskX) * 4 + 3;
      return brainMaskData[alphaIndex] > 18;
    }

    const lobe =
      ((u - 0.44) ** 2) / 0.19 +
        ((v - 0.4) ** 2) / 0.15 <=
        1 ||
      ((u - 0.68) ** 2) / 0.12 +
        ((v - 0.42) ** 2) / 0.16 <=
        1;
    const cerebellum = ((u - 0.69) ** 2) / 0.022 + ((v - 0.8) ** 2) / 0.018 <= 1;
    const stem = ((u - 0.57) ** 2) / 0.003 + ((v - 0.95) ** 2) / 0.03 <= 1;
    return lobe || cerebellum || stem;
  };

  const brainContainsPoint = (x, y) => {
    if (!brainGeometry) {
      return false;
    }

    const u = (x - brainGeometry.left) / brainGeometry.width;
    const v = (y - brainGeometry.top) / brainGeometry.height;
    return brainContainsRelative(u, v);
  };

  const setPointerHome = () => {
    if (!brainGeometry) {
      return;
    }

    pointer.x = brainGeometry.left + brainGeometry.width * 0.48;
    pointer.y = brainGeometry.top + brainGeometry.height * 0.4;
    pointer.targetX = pointer.x;
    pointer.targetY = pointer.y;
  };

  const sampleBrainPoint = (preferSignal = false) => {
    if (!brainGeometry) {
      return {
        x: width * 0.5,
        y: height * 0.25,
        signal: 0.42,
        luminance: 0.62,
      };
    }

    for (let attempt = 0; attempt < 220; attempt += 1) {
      const x = brainGeometry.left + Math.random() * brainGeometry.width;
      const y = brainGeometry.top + Math.random() * brainGeometry.height;
      const u = (x - brainGeometry.left) / brainGeometry.width;
      const v = (y - brainGeometry.top) / brainGeometry.height;

      if (!brainContainsRelative(u, v)) {
        continue;
      }

      const pixel = getBrainPixelInfo(u, v);
      if (!preferSignal || Math.random() < 0.16 + pixel.signal * 1.28) {
        return {
          x,
          y,
          signal: pixel.signal,
          luminance: pixel.luminance,
        };
      }
    }

    return {
      x: brainGeometry.left + brainGeometry.width * 0.48,
      y: brainGeometry.top + brainGeometry.height * 0.42,
      signal: 0.54,
      luminance: 0.72,
    };
  };

  const buildNeuralField = () => {
    neurons = [];
    edges = [];
    adjacency = [];
    bursts = [];

    const targetCount = width < 900 ? 260 : 420;
    const signalTarget = Math.round(targetCount * 0.88);
    const minSpacing = width < 900 ? 12 : 10;
    let attempts = 0;

    while (neurons.length < targetCount && attempts < targetCount * 90) {
      const candidate = sampleBrainPoint(neurons.length < signalTarget);
      attempts += 1;

      if (neurons.some((node) => distance(node, candidate) < minSpacing)) {
        continue;
      }

      neurons.push({
        ...candidate,
        radius: 0.9 + candidate.signal * 2.7 + Math.random() * 0.9,
        twinkle: Math.random() * Math.PI * 2,
        seed: Math.random() * 1000,
        signal: candidate.signal,
        luminance: candidate.luminance,
      });
    }

    const edgeKeys = new Set();
    neurons.forEach((node, index) => {
      const nearest = neurons
        .map((neighbor, neighborIndex) => ({
          neighborIndex,
          dist: index === neighborIndex ? Number.POSITIVE_INFINITY : distance(node, neighbor),
          signal: (node.signal + neighbor.signal) * 0.5,
        }))
        .filter(({ dist }) => dist < Math.min(brainGeometry.width * 0.14, 122))
        .sort((left, right) => (left.dist - left.signal * 18) - (right.dist - right.signal * 18))
        .slice(0, width < 900 ? 6 : 7);

      nearest.forEach(({ neighborIndex, dist, signal }) => {
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
          signal,
        });
      });
    });

    adjacency = Array.from({ length: neurons.length }, () => []);
    edges.forEach((edge, edgeIndex) => {
      const weight = edge.length * (1.72 - edge.signal * 0.34);
      adjacency[edge.a].push({ neighborIndex: edge.b, edgeIndex, weight });
      adjacency[edge.b].push({ neighborIndex: edge.a, edgeIndex, weight });
    });
  };

  const buildPropagationTimes = (sourceIndex) => {
    const nodeTimes = Array.from({ length: neurons.length }, () => Number.POSITIVE_INFINITY);
    const frontier = [{ index: sourceIndex, time: 0 }];
    nodeTimes[sourceIndex] = 0;

    while (frontier.length) {
      frontier.sort((left, right) => right.time - left.time);
      const current = frontier.pop();
      if (!current || current.time !== nodeTimes[current.index]) {
        continue;
      }

      adjacency[current.index].forEach(({ neighborIndex, weight }) => {
        const jitter = 7 + Math.abs(Math.sin(neurons[neighborIndex].seed * 1.37 + current.index * 0.11)) * 12;
        const nextTime = current.time + weight + jitter;
        if (nextTime >= nodeTimes[neighborIndex]) {
          return;
        }

        nodeTimes[neighborIndex] = nextTime;
        frontier.push({ index: neighborIndex, time: nextTime });
      });
    }

    return nodeTimes.map((time, index) => (
      Number.isFinite(time)
        ? time
        : distance(neurons[index], neurons[sourceIndex]) * 3.6 + 42
    ));
  };

  const rebuild = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(dpr, dpr);

    const visibleRatio =
      brainImageReady && brainImage.naturalWidth
        ? (brainImage.naturalHeight * brainCrop.visibleHeight) / (brainImage.naturalWidth * brainCrop.visibleWidth)
        : 695 / 821;
    const desktop = width >= 960;
    const contentWidth = Math.min(width - (width < 620 ? 16 : 32), 1180);
    const contentLeft = (width - contentWidth) * 0.5;
    stageLayout = {
      contentLeft,
      contentWidth,
      desktop,
    };

    let imageWidth;
    let imageHeight;
    let imageLeft;
    let imageTop;

    if (desktop) {
      const anchorX = width * 0.5;
      const anchorY = clamp(height * 0.39, 316, 396);
      imageWidth = clamp(Math.min(contentWidth * 0.72, width * 0.58), 700, 860);
      imageHeight = imageWidth * visibleRatio;
      imageLeft = clamp(20, anchorX - imageWidth * 0.5, width - imageWidth - 20);
      imageTop = clamp(72, anchorY - imageHeight * 0.45, height - imageHeight - 28);
    } else {
      const anchorX = width * 0.5;
      const anchorY = clamp(height * 0.31, 230, 304);
      imageWidth = clamp(Math.min(width * 0.86, contentWidth * 0.9), 320, 540);
      imageHeight = imageWidth * visibleRatio;
      imageLeft = clamp(12, anchorX - imageWidth * 0.5, width - imageWidth - 12);
      imageTop = clamp(72, anchorY - imageHeight * 0.42, height - imageHeight - 20);
    }

    brainGeometry = {
      left: imageLeft,
      top: imageTop,
      width: imageWidth,
      height: imageHeight,
      right: imageLeft + imageWidth,
      bottom: imageTop + imageHeight,
      cx: imageLeft + imageWidth * 0.47,
      cy: imageTop + imageHeight * 0.48,
    };

    const frameWidth = imageWidth / brainCrop.visibleWidth;
    const frameHeight = imageHeight / brainCrop.visibleHeight;
    const frameLeft = imageLeft - frameWidth * brainCrop.left;
    const frameTop = imageTop - frameHeight * brainCrop.top;

    rootStyle.setProperty("--brain-left", `${imageLeft}px`);
    rootStyle.setProperty("--brain-top", `${imageTop}px`);
    rootStyle.setProperty("--brain-width", `${imageWidth}px`);
    rootStyle.setProperty("--brain-height", `${imageHeight}px`);
    rootStyle.setProperty("--brain-frame-left", `${frameLeft}px`);
    rootStyle.setProperty("--brain-frame-top", `${frameTop}px`);
    rootStyle.setProperty("--brain-frame-width", `${frameWidth}px`);
    rootStyle.setProperty("--brain-frame-height", `${frameHeight}px`);

    buildNeuralField();
    if (!pointer.active) {
      setPointerHome();
    }
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
      x: brainGeometry.left + brainGeometry.width * 0.48,
      y: brainGeometry.top + brainGeometry.height * 0.42,
    };
    const focusX = pointer.active ? pointer.x : fallback.x;
    const focusY = pointer.active ? pointer.y : fallback.y;
    const node = neurons[neurons.length ? getNearestNeuronIndex(focusX, focusY) : 0] || fallback;

    return {
      x: node.x,
      y: node.y,
      intensity: pointer.active ? 1 : 0.42,
    };
  };

  const createBurst = (sourceX, sourceY) => {
    if (!neurons.length) {
      return;
    }

    const sourceIndex = getNearestNeuronIndex(sourceX, sourceY);
    const sourceNode = neurons[sourceIndex];
    const sourcePoint = { x: sourceNode.x, y: sourceNode.y };
    const nodeTimes = buildPropagationTimes(sourceIndex);

    const sparkCount = width < 900 ? 42 : 72;
    const sparks = Array.from({ length: sparkCount }, (_, index) => ({
      angle: (Math.PI * 2 * index) / sparkCount + (Math.random() - 0.5) * 0.34,
      speed: 180 + Math.random() * 280,
      drift: (Math.random() - 0.5) * 0.8,
      radius: 1.4 + Math.random() * 2.8,
      life: 920 + Math.random() * 720,
    }));

    const maxTime = nodeTimes.reduce((maximum, value) => Math.max(maximum, value), 0);
    const waveOffsets = [
      0,
      92 + Math.random() * 18,
      196 + Math.random() * 34,
      322 + Math.random() * 56,
    ];
    const flareTarget = width < 900 ? 14 : 24;
    const flareCandidates = nodeTimes
      .map((time, index) => ({
        index,
        time,
        weight: neurons[index].signal + Math.random() * 0.16,
      }))
      .filter(({ time, index }) => (
        Number.isFinite(time) &&
        time > 24 &&
        time < maxTime * 0.95 &&
        neurons[index].signal > 0.16
      ))
      .sort((left, right) => left.time - right.time || right.weight - left.weight);
    const flareStep = Math.max(1, Math.floor(flareCandidates.length / flareTarget));
    const flareNodes = flareCandidates
      .filter((_, index) => index % flareStep === 0)
      .slice(0, flareTarget)
      .map(({ index, time }) => ({
        index,
        time,
        amplitude: 0.7 + Math.random() * 0.6,
      }));
    const scatterTarget = width < 900 ? 28 : 44;
    const scatterStep = Math.max(1, Math.floor(flareCandidates.length / scatterTarget));
    const scatterNodes = flareCandidates
      .filter((_, index) => index % scatterStep === 0)
      .slice(0, scatterTarget)
      .map(({ index, time }) => ({
        index,
        time,
        reach: 10 + Math.random() * 18,
        amplitude: 0.42 + Math.random() * 0.48,
        angle: Math.random() * Math.PI * 2,
      }));

    bursts.push({
      start: performance.now(),
      sourceIndex,
      sourcePoint,
      nodeTimes,
      sparks,
      flareNodes,
      scatterNodes,
      waveOffsets,
      segmentLength: 0.14 + Math.random() * 0.12,
      duration: maxTime + waveOffsets[waveOffsets.length - 1] + 1900,
    });

    bursts = bursts.slice(-4);
  };

  const getNodeBurstIntensity = (burst, nodeIndex, elapsed) => {
    const fireAt = burst.nodeTimes[nodeIndex];
    let best = 0;

    burst.waveOffsets.forEach((offset, waveIndex) => {
      const shifted = elapsed - offset;
      const waveFront = Math.exp(-((shifted - fireAt) ** 2) / (waveIndex === 0 ? 11500 : 16500));
      const tail = shifted > fireAt
        ? Math.exp(-(shifted - fireAt) / (waveIndex === 0 ? 320 : 420)) * (waveIndex === 0 ? 0.82 : 0.44)
        : 0;
      const sourceBoost = nodeIndex === burst.sourceIndex && shifted >= fireAt - 10
        ? Math.exp(-(shifted - fireAt) / (waveIndex === 0 ? 220 : 320)) * (waveIndex === 0 ? 0.54 : 0.22)
        : 0;
      best = Math.max(best, waveFront * (waveIndex === 0 ? 1.2 : 0.72), tail + sourceBoost);
    });

    return best;
  };

  const drawBackdrop = () => {
    if (!brainGeometry) {
      return;
    }

    const brainField = context.createRadialGradient(
      brainGeometry.cx - brainGeometry.width * 0.12,
      brainGeometry.cy + brainGeometry.height * 0.02,
      brainGeometry.width * 0.05,
      brainGeometry.cx - brainGeometry.width * 0.12,
      brainGeometry.cy + brainGeometry.height * 0.02,
      brainGeometry.width * 0.74
    );
    brainField.addColorStop(0, "rgba(10, 51, 62, 0.16)");
    brainField.addColorStop(0.26, "rgba(18, 88, 104, 0.1)");
    brainField.addColorStop(0.62, "rgba(70, 218, 248, 0.04)");
    brainField.addColorStop(1, "rgba(70, 218, 248, 0)");
    context.fillStyle = brainField;
    context.beginPath();
    context.arc(
      brainGeometry.cx - brainGeometry.width * 0.12,
      brainGeometry.cy + brainGeometry.height * 0.02,
      brainGeometry.width * 0.74,
      0,
      Math.PI * 2
    );
    context.fill();

    const underGlow = context.createRadialGradient(
      brainGeometry.cx,
      brainGeometry.cy,
      0,
      brainGeometry.cx,
      brainGeometry.cy,
      brainGeometry.width * 0.72
    );
    underGlow.addColorStop(0, "rgba(85, 221, 255, 0.2)");
    underGlow.addColorStop(0.45, "rgba(85, 221, 255, 0.08)");
    underGlow.addColorStop(1, "rgba(85, 221, 255, 0)");
    context.fillStyle = underGlow;
    context.beginPath();
    context.arc(brainGeometry.cx, brainGeometry.cy, brainGeometry.width * 0.6, 0, Math.PI * 2);
    context.fill();

    const textVeil = context.createLinearGradient(0, 0, width * 0.6, 0);
    textVeil.addColorStop(0, "rgba(247, 250, 249, 0.22)");
    textVeil.addColorStop(0.38, "rgba(247, 250, 249, 0.12)");
    textVeil.addColorStop(0.82, "rgba(247, 250, 249, 0.02)");
    textVeil.addColorStop(1, "rgba(247, 250, 249, 0)");
    context.fillStyle = textVeil;
    context.fillRect(0, 0, width * (width < 960 ? 0.92 : 0.52), Math.min(height, 720));
  };

  const drawBrainAsset = (time) => {
    if (!brainImageReady || !brainGeometry || !brainImage.naturalWidth || !brainImage.naturalHeight) {
      return;
    }

    const hover = getHoverFocus();
    const sourceX = brainImage.naturalWidth * brainCrop.left;
    const sourceY = brainImage.naturalHeight * brainCrop.top;
    const sourceWidth = brainImage.naturalWidth * brainCrop.visibleWidth;
    const sourceHeight = brainImage.naturalHeight * brainCrop.visibleHeight;
    const driftX = pointer.active
      ? clamp((pointer.x - brainGeometry.cx) / brainGeometry.width, -0.55, 0.55)
      : Math.sin(time * 0.00045) * 0.08;
    const driftY = pointer.active
      ? clamp((pointer.y - brainGeometry.cy) / brainGeometry.height, -0.55, 0.55)
      : Math.cos(time * 0.00038) * 0.05;
    const backX = brainGeometry.left - driftX * 22;
    const backY = brainGeometry.top - driftY * 18;
    const frontX = brainGeometry.left + driftX * 9;
    const frontY = brainGeometry.top + driftY * 7;

    context.save();
    context.globalAlpha = 0.16;
    context.shadowColor = "rgba(86, 233, 255, 0.42)";
    context.shadowBlur = 42;
    context.drawImage(
      brainImage,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      backX,
      backY,
      brainGeometry.width,
      brainGeometry.height
    );
    context.restore();

    context.save();
    context.globalAlpha = 0.82;
    context.shadowColor = "rgba(96, 239, 255, 0.32)";
    context.shadowBlur = 26;
    context.drawImage(
      brainImage,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      frontX,
      frontY,
      brainGeometry.width,
      brainGeometry.height
    );
    context.restore();

    const hoverGlow = context.createRadialGradient(
      hover.x,
      hover.y,
      0,
      hover.x,
      hover.y,
      brainGeometry.width * 0.18
    );
    hoverGlow.addColorStop(0, `rgba(112, 244, 255, ${0.24 * hover.intensity})`);
    hoverGlow.addColorStop(0.35, `rgba(112, 244, 255, ${0.1 * hover.intensity})`);
    hoverGlow.addColorStop(1, "rgba(112, 244, 255, 0)");
    context.save();
    context.globalCompositeOperation = "screen";
    context.fillStyle = hoverGlow;
    context.beginPath();
    context.arc(hover.x, hover.y, brainGeometry.width * 0.18, 0, Math.PI * 2);
    context.fill();
    context.restore();
  };

  const drawForegroundVeil = () => {
    if (!brainGeometry) {
      return;
    }

    const veilRight = stageLayout.desktop
      ? Math.min(width, stageLayout.contentLeft + stageLayout.contentWidth * 0.68)
      : width;
    const veilHeight = Math.min(height, stageLayout.desktop ? 720 : 760);
    const leftVeil = context.createLinearGradient(0, 0, veilRight, 0);
    leftVeil.addColorStop(0, "rgba(247, 250, 249, 0.2)");
    leftVeil.addColorStop(0.28, "rgba(247, 250, 249, 0.12)");
    leftVeil.addColorStop(0.56, "rgba(247, 250, 249, 0.06)");
    leftVeil.addColorStop(0.82, "rgba(247, 250, 249, 0.02)");
    leftVeil.addColorStop(1, "rgba(247, 250, 249, 0)");
    context.fillStyle = leftVeil;
    context.fillRect(0, 0, veilRight, veilHeight);

    const focusX = stageLayout.contentLeft + stageLayout.contentWidth * (stageLayout.desktop ? 0.25 : 0.35);
    const focusY = stageLayout.desktop ? 320 : 288;
    const focusRadius = stageLayout.desktop ? 470 : 284;
    const copyHalo = context.createRadialGradient(
      focusX,
      focusY,
      0,
      focusX,
      focusY,
      focusRadius
    );
    copyHalo.addColorStop(0, "rgba(250, 248, 243, 0.18)");
    copyHalo.addColorStop(0.42, "rgba(250, 248, 243, 0.08)");
    copyHalo.addColorStop(0.78, "rgba(250, 248, 243, 0.02)");
    copyHalo.addColorStop(1, "rgba(250, 248, 243, 0)");
    context.fillStyle = copyHalo;
    context.beginPath();
    context.arc(focusX, focusY, focusRadius, 0, Math.PI * 2);
    context.fill();
  };

  const drawEdgePulse = (edge, burst, elapsed, amplitude = 1) => {
    const timeA = burst.nodeTimes[edge.a];
    const timeB = burst.nodeTimes[edge.b];
    if (!Number.isFinite(timeA) || !Number.isFinite(timeB) || Math.abs(timeA - timeB) < 1) {
      return 0;
    }

    const forward = timeA <= timeB;
    const fromNode = neurons[forward ? edge.a : edge.b];
    const toNode = neurons[forward ? edge.b : edge.a];
    const startAt = Math.min(timeA, timeB);
    const travelDuration = clamp(edge.length * 1.7, 92, 220);
    const progress = (elapsed - startAt) / travelDuration;

    if (progress < 0 || progress > 1.24) {
      return 0;
    }

    const head = clamp(progress, 0, 1);
    const tail = clamp(head - burst.segmentLength, 0, 1);
    const segmentStrength = clamp(1 - Math.abs(progress - 0.5) * 1.6, 0, 1);

    const startX = lerp(fromNode.x, toNode.x, tail);
    const startY = lerp(fromNode.y, toNode.y, tail);
    const endX = lerp(fromNode.x, toNode.x, head);
    const endY = lerp(fromNode.y, toNode.y, head);
    const gradient = context.createLinearGradient(startX, startY, endX, endY);
    gradient.addColorStop(0, "rgba(142, 248, 255, 0)");
    gradient.addColorStop(0.25, `rgba(142, 248, 255, ${(0.24 + edge.signal * 0.14) * amplitude})`);
    gradient.addColorStop(0.75, `rgba(248, 255, 255, ${(0.72 + segmentStrength * 0.18) * amplitude})`);
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    context.strokeStyle = gradient;
    context.lineWidth = (1.2 + edge.signal * 1.6 + segmentStrength * 1.9) * (0.8 + amplitude * 0.35);
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();

    const nodeFlash = context.createRadialGradient(endX, endY, 0, endX, endY, 16 + edge.signal * 10);
    nodeFlash.addColorStop(0, `rgba(240, 255, 255, ${(0.54 + segmentStrength * 0.24) * amplitude})`);
    nodeFlash.addColorStop(1, "rgba(138, 246, 255, 0)");
    context.fillStyle = nodeFlash;
    context.beginPath();
    context.arc(endX, endY, 16 + edge.signal * 10, 0, Math.PI * 2);
    context.fill();

    return segmentStrength * amplitude;
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
      const hoverGain = clamp(1 - distance(midpoint, hover) / 170, 0, 1);
      let burstGain = 0;

      bursts.forEach((burst) => {
        const elapsed = time - burst.start;
        const edgeTime = (burst.nodeTimes[edge.a] + burst.nodeTimes[edge.b]) * 0.5;
        burst.waveOffsets.forEach((offset, waveIndex) => {
          const shifted = elapsed - offset;
          const waveAmplitude = waveIndex === 0 ? 1 : 0.62 - waveIndex * 0.14;
          burstGain = Math.max(
            burstGain,
            Math.exp(-((shifted - edgeTime) ** 2) / (waveIndex === 0 ? 12000 : 17000)) * waveAmplitude
          );
        });
      });

      context.strokeStyle = `rgba(132, 244, 255, ${0.026 + edge.signal * 0.1 + hoverGain * 0.06 + burstGain * 0.22})`;
      context.lineWidth = 0.8 + edge.signal * 1.1 + burstGain * 1.05;
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();

      bursts.forEach((burst) => {
        burst.waveOffsets.forEach((offset, waveIndex) => {
          const waveAmplitude = waveIndex === 0 ? 1 : 0.62 - waveIndex * 0.14;
          drawEdgePulse(edge, burst, time - burst.start - offset, waveAmplitude);
        });
      });
    });

    neurons.forEach((node, index) => {
      const ambient = 0.08 + node.signal * 0.22 + 0.12 * Math.sin(time * 0.0017 + node.twinkle);
      const hoverGain = clamp(1 - distance(node, hover) / 120, 0, 1);
      let burstGain = 0;

      bursts.forEach((burst) => {
        const elapsed = time - burst.start;
        burstGain = Math.max(burstGain, getNodeBurstIntensity(burst, index, elapsed));
      });

      const glowRadius = 8 + node.signal * 15 + hoverGain * 10 + burstGain * 34;
      const glow = context.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowRadius);
      glow.addColorStop(0, `rgba(142, 248, 255, ${0.12 + node.signal * 0.2 + hoverGain * 0.12 + burstGain * 0.42})`);
      glow.addColorStop(1, "rgba(142, 248, 255, 0)");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = `rgba(235, 252, 255, ${0.38 + ambient * 0.36 + burstGain * 0.3})`;
      context.beginPath();
      context.arc(node.x, node.y, node.radius + hoverGain * 0.7 + burstGain * 1.3, 0, Math.PI * 2);
      context.fill();
    });
  };

  const drawBurstEffects = (time) => {
    bursts.forEach((burst) => {
      const elapsed = time - burst.start;
      if (elapsed < 0 || elapsed > burst.duration) {
        return;
      }

      const sourceFlash = context.createRadialGradient(
        burst.sourcePoint.x,
        burst.sourcePoint.y,
        0,
        burst.sourcePoint.x,
        burst.sourcePoint.y,
        36 + elapsed * 0.08
      );
      sourceFlash.addColorStop(0, `rgba(248, 255, 255, ${Math.exp(-elapsed / 210) * 0.8})`);
      sourceFlash.addColorStop(0.25, `rgba(122, 241, 255, ${Math.exp(-elapsed / 360) * 0.46})`);
      sourceFlash.addColorStop(1, "rgba(122, 241, 255, 0)");
      context.fillStyle = sourceFlash;
      context.beginPath();
      context.arc(burst.sourcePoint.x, burst.sourcePoint.y, 36 + elapsed * 0.08, 0, Math.PI * 2);
      context.fill();

      for (let ringIndex = 0; ringIndex < 6; ringIndex += 1) {
        const ringElapsed = elapsed - ringIndex * 90;
        if (ringElapsed < 0 || ringElapsed > 1000) {
          continue;
        }

        const ringRadius = 16 + ringElapsed * 0.28;
        const ringAlpha = clamp(0.34 - ringElapsed / 1800, 0, 0.34);
        context.beginPath();
        context.arc(burst.sourcePoint.x, burst.sourcePoint.y, ringRadius, 0, Math.PI * 2);
        context.strokeStyle = `rgba(132, 244, 255, ${ringAlpha})`;
        context.lineWidth = 1.2 + Math.exp(-ringElapsed / 300) * 0.4;
        context.stroke();
      }

      burst.sparks.forEach((spark) => {
        const progress = clamp(elapsed / spark.life, 0, 1);
        if (progress <= 0 || progress >= 1) {
          return;
        }

        const travel = spark.speed * progress * (1 - progress * 0.14);
        const x =
          burst.sourcePoint.x +
          Math.cos(spark.angle) * travel +
          Math.sin(progress * 10 + spark.drift * 4) * 6;
        const y =
          burst.sourcePoint.y +
          Math.sin(spark.angle) * travel * 0.78 +
          Math.cos(progress * 12 + spark.drift * 5) * 5;

        if (!brainContainsPoint(x, y)) {
          return;
        }

        const glow = context.createRadialGradient(x, y, 0, x, y, 18);
        glow.addColorStop(0, `rgba(138, 246, 255, ${0.46 * (1 - progress)})`);
        glow.addColorStop(1, "rgba(138, 246, 255, 0)");
        context.fillStyle = glow;
        context.beginPath();
        context.arc(x, y, 18, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = `rgba(236, 252, 255, ${0.82 - progress * 0.5})`;
        context.beginPath();
        context.arc(x, y, spark.radius, 0, Math.PI * 2);
        context.fill();
      });

      burst.flareNodes.forEach((flare) => {
        const flareElapsed = elapsed - flare.time;
        if (flareElapsed < -40 || flareElapsed > 520) {
          return;
        }

        const node = neurons[flare.index];
        if (!node) {
          return;
        }

        const flareStrength = Math.max(
          Math.exp(-((flareElapsed - 16) ** 2) / 8000),
          flareElapsed > 0 ? Math.exp(-flareElapsed / 220) * 0.72 : 0
        ) * flare.amplitude;
        const flareRadius = 14 + flareStrength * 18;
        const flareGlow = context.createRadialGradient(node.x, node.y, 0, node.x, node.y, flareRadius);
        flareGlow.addColorStop(0, `rgba(246, 255, 255, ${0.46 * flareStrength})`);
        flareGlow.addColorStop(0.45, `rgba(128, 243, 255, ${0.22 * flareStrength})`);
        flareGlow.addColorStop(1, "rgba(128, 243, 255, 0)");
        context.fillStyle = flareGlow;
        context.beginPath();
        context.arc(node.x, node.y, flareRadius, 0, Math.PI * 2);
        context.fill();

        context.strokeStyle = `rgba(246, 255, 255, ${0.4 * flareStrength})`;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(node.x - flareRadius * 0.6, node.y);
        context.lineTo(node.x + flareRadius * 0.6, node.y);
        context.moveTo(node.x, node.y - flareRadius * 0.6);
        context.lineTo(node.x, node.y + flareRadius * 0.6);
        context.stroke();
      });

      burst.scatterNodes.forEach((scatter) => {
        const scatterElapsed = elapsed - scatter.time;
        if (scatterElapsed < -50 || scatterElapsed > 460) {
          return;
        }

        const node = neurons[scatter.index];
        if (!node) {
          return;
        }

        const scatterStrength = Math.max(
          Math.exp(-((scatterElapsed - 18) ** 2) / 5600),
          scatterElapsed > 0 ? Math.exp(-scatterElapsed / 180) * 0.74 : 0
        ) * scatter.amplitude;
        const reach = scatter.reach * (0.7 + scatterStrength * 0.9);
        const branchX = node.x + Math.cos(scatter.angle) * reach;
        const branchY = node.y + Math.sin(scatter.angle) * reach;

        context.strokeStyle = `rgba(172, 249, 255, ${0.42 * scatterStrength})`;
        context.lineWidth = 1 + scatterStrength * 1.2;
        context.beginPath();
        context.moveTo(node.x, node.y);
        context.lineTo(branchX, branchY);
        context.stroke();

        const tipGlow = context.createRadialGradient(branchX, branchY, 0, branchX, branchY, 10 + reach * 0.55);
        tipGlow.addColorStop(0, `rgba(248, 255, 255, ${0.34 * scatterStrength})`);
        tipGlow.addColorStop(1, "rgba(172, 249, 255, 0)");
        context.fillStyle = tipGlow;
        context.beginPath();
        context.arc(branchX, branchY, 10 + reach * 0.55, 0, Math.PI * 2);
        context.fill();
      });
    });
  };

  const drawPointerField = (time) => {
    const pulseAge = pointer.pulseAt ? time - pointer.pulseAt : Number.POSITIVE_INFINITY;
    const haloRadius = pointer.active ? 28 : 20;
    const field = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 72);
    field.addColorStop(0, `rgba(138, 246, 255, ${pointer.active ? 0.12 : 0.06})`);
    field.addColorStop(1, "rgba(138, 246, 255, 0)");
    context.fillStyle = field;
    context.beginPath();
    context.arc(pointer.x, pointer.y, 72, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = `rgba(138, 246, 255, ${pointer.active ? 0.36 : 0.16})`;
    context.lineWidth = 1;
    context.beginPath();
    context.arc(pointer.x, pointer.y, haloRadius + Math.sin(time * 0.006) * 1.5, 0, Math.PI * 2);
    context.stroke();

    if (pulseAge >= 0 && pulseAge < 560) {
      const rippleRadius = 16 + pulseAge * 0.18;
      const rippleAlpha = clamp(0.32 - pulseAge / 1700, 0, 0.32);
      context.beginPath();
      context.arc(pointer.x, pointer.y, rippleRadius, 0, Math.PI * 2);
      context.strokeStyle = `rgba(138, 246, 255, ${rippleAlpha})`;
      context.lineWidth = 1.1;
      context.stroke();
    }
  };

  const frame = (time) => {
    context.clearRect(0, 0, width, height);
    pointer.x += (pointer.targetX - pointer.x) * 0.12;
    pointer.y += (pointer.targetY - pointer.y) * 0.12;
    bursts = bursts.filter((burst) => time - burst.start < burst.duration);

    drawBackdrop();
    drawBrainAsset(time);
    drawNeuralMesh(time);
    drawBurstEffects(time);
    drawPointerField(time);
    drawForegroundVeil();

    if (!reducedMotion) {
      frameId = requestAnimationFrame(frame);
    }
  };

  const movePointer = (event) => {
    if (!brainContainsPoint(event.clientX, event.clientY)) {
      if (pointer.active) {
        resetPointer();
      }
      return;
    }

    pointer.targetX = event.clientX;
    pointer.targetY = event.clientY;
    pointer.active = true;
  };

  const triggerBurst = (event) => {
    if (!brainContainsPoint(event.clientX, event.clientY)) {
      return;
    }

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

  brainImage.addEventListener("load", () => {
    brainImageReady = true;
    if (brainStageImage) {
      brainStageImage.classList.add("is-ready");
    }
    buildBrainMask();
    rebuild();

    if (reducedMotion) {
      frame(performance.now());
    }
  });

  const version = "20260424-brain-hero-lower-1";
  const brainAssetPath = `./assets/brain-hero-25d.png?v=${version}`;

  brainImage.addEventListener("error", () => {
    console.error("Failed to load hero brain image.");
  });

  if (brainStageImage) {
    brainStageImage.src = brainAssetPath;
  }
  brainImage.src = brainAssetPath;
};

if (neuralCanvas) {
  initializeNeuralField(neuralCanvas);
}

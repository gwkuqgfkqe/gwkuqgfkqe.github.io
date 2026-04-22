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
  let brainImageReady = false;
  let brainMaskData = null;
  let brainMaskWidth = 0;
  let brainMaskHeight = 0;
  let brainObjectUrl = "";
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
    if (!brainMaskData || !brainMaskWidth || !brainMaskHeight) {
      return {
        alpha: brainContainsRelative(u, v) ? 1 : 0,
        luminance: 0.62,
        signal: 0.42,
      };
    }

    const maskX = clamp(Math.round(u * (brainMaskWidth - 1)), 0, brainMaskWidth - 1);
    const maskY = clamp(Math.round(v * (brainMaskHeight - 1)), 0, brainMaskHeight - 1);
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
      const maskX = clamp(Math.round(u * (brainMaskWidth - 1)), 0, brainMaskWidth - 1);
      const maskY = clamp(Math.round(v * (brainMaskHeight - 1)), 0, brainMaskHeight - 1);
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

    const targetCount = width < 900 ? 180 : 300;
    const signalTarget = Math.round(targetCount * 0.74);
    const minSpacing = width < 900 ? 14 : 12;
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
        .filter(({ dist }) => dist < Math.min(brainGeometry.width * 0.14, 118))
        .sort((left, right) => (left.dist - left.signal * 18) - (right.dist - right.signal * 18))
        .slice(0, width < 900 ? 4 : 5);

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
      const weight = edge.length * (1.82 - edge.signal * 0.32);
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

    const imageRatio =
      brainImageReady && brainImage.naturalWidth
        ? brainImage.naturalHeight / brainImage.naturalWidth
        : 1024 / 1536;
    const imageWidth = Math.min(width * (width < 900 ? 0.92 : 0.66), 1100);
    const imageHeight = imageWidth * imageRatio;
    const imageLeft = width < 900 ? width * 0.04 : width * 0.12;
    const imageTop = width < 900 ? Math.max(48, height * 0.09) : Math.max(8, height * 0.01);

    brainGeometry = {
      left: imageLeft,
      top: imageTop,
      width: imageWidth,
      height: imageHeight,
      right: imageLeft + imageWidth,
      bottom: imageTop + imageHeight,
      cx: imageLeft + imageWidth * 0.5,
      cy: imageTop + imageHeight * 0.46,
    };

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

    const sparkCount = width < 900 ? 24 : 38;
    const sparks = Array.from({ length: sparkCount }, (_, index) => ({
      angle: (Math.PI * 2 * index) / sparkCount + (Math.random() - 0.5) * 0.34,
      speed: 140 + Math.random() * 240,
      drift: (Math.random() - 0.5) * 0.8,
      radius: 1.4 + Math.random() * 2.8,
      life: 820 + Math.random() * 620,
    }));

    const maxTime = nodeTimes.reduce((maximum, value) => Math.max(maximum, value), 0);
    bursts.push({
      start: performance.now(),
      sourceIndex,
      sourcePoint,
      nodeTimes,
      sparks,
      segmentLength: 0.16 + Math.random() * 0.1,
      duration: maxTime + 1700,
    });

    bursts = bursts.slice(-4);
  };

  const getNodeBurstIntensity = (burst, nodeIndex, elapsed) => {
    const fireAt = burst.nodeTimes[nodeIndex];
    const waveFront = Math.exp(-((elapsed - fireAt) ** 2) / 14000);
    const tail = elapsed > fireAt ? Math.exp(-(elapsed - fireAt) / 340) * 0.78 : 0;
    const sourceBoost = nodeIndex === burst.sourceIndex ? Math.exp(-(elapsed - fireAt) / 240) * 0.46 : 0;
    return Math.max(waveFront * 1.16, tail + sourceBoost);
  };

  const drawBackdrop = () => {
    if (!brainGeometry) {
      return;
    }

    const underGlow = context.createRadialGradient(
      brainGeometry.cx,
      brainGeometry.cy,
      0,
      brainGeometry.cx,
      brainGeometry.cy,
      brainGeometry.width * 0.72
    );
    underGlow.addColorStop(0, "rgba(85, 221, 255, 0.22)");
    underGlow.addColorStop(0.45, "rgba(85, 221, 255, 0.12)");
    underGlow.addColorStop(1, "rgba(85, 221, 255, 0)");
    context.fillStyle = underGlow;
    context.beginPath();
    context.arc(brainGeometry.cx, brainGeometry.cy, brainGeometry.width * 0.72, 0, Math.PI * 2);
    context.fill();
  };

  const drawBrainAsset = (time) => {
    if (!brainImageReady || !brainGeometry) {
      return;
    }

    const hover = getHoverFocus();
    const depthX = pointer.active
      ? clamp((pointer.x - brainGeometry.cx) / brainGeometry.width, -0.65, 0.65)
      : Math.sin(time * 0.00045) * 0.08;
    const depthY = pointer.active
      ? clamp((pointer.y - brainGeometry.cy) / brainGeometry.height, -0.65, 0.65)
      : Math.cos(time * 0.00035) * 0.06;

    const backX = brainGeometry.left - depthX * 22;
    const backY = brainGeometry.top - depthY * 18;
    const frontX = brainGeometry.left + depthX * 12;
    const frontY = brainGeometry.top + depthY * 10;

    context.save();
    context.globalAlpha = 0.24;
    context.shadowColor = "rgba(65, 220, 255, 0.45)";
    context.shadowBlur = 56;
    context.drawImage(brainImage, backX, backY, brainGeometry.width, brainGeometry.height);
    context.restore();

    context.save();
    context.globalAlpha = 0.99;
    context.shadowColor = "rgba(90, 236, 255, 0.38)";
    context.shadowBlur = 46;
    context.drawImage(brainImage, frontX, frontY, brainGeometry.width, brainGeometry.height);
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

  const drawEdgePulse = (edge, burst, elapsed) => {
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
    gradient.addColorStop(0.25, `rgba(142, 248, 255, ${0.24 + edge.signal * 0.14})`);
    gradient.addColorStop(0.75, `rgba(248, 255, 255, ${0.72 + segmentStrength * 0.18})`);
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    context.strokeStyle = gradient;
    context.lineWidth = 1.2 + edge.signal * 1.6 + segmentStrength * 1.9;
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();

    const nodeFlash = context.createRadialGradient(endX, endY, 0, endX, endY, 16 + edge.signal * 10);
    nodeFlash.addColorStop(0, `rgba(240, 255, 255, ${0.54 + segmentStrength * 0.24})`);
    nodeFlash.addColorStop(1, "rgba(138, 246, 255, 0)");
    context.fillStyle = nodeFlash;
    context.beginPath();
    context.arc(endX, endY, 16 + edge.signal * 10, 0, Math.PI * 2);
    context.fill();

    return segmentStrength;
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
        burstGain = Math.max(burstGain, Math.exp(-((elapsed - edgeTime) ** 2) / 12000));
      });

      context.strokeStyle = `rgba(132, 244, 255, ${0.018 + edge.signal * 0.08 + hoverGain * 0.05 + burstGain * 0.16})`;
      context.lineWidth = 0.7 + edge.signal * 0.95 + burstGain * 0.8;
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();

      bursts.forEach((burst) => {
        drawEdgePulse(edge, burst, time - burst.start);
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

      const glowRadius = 7 + node.signal * 13 + hoverGain * 9 + burstGain * 28;
      const glow = context.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowRadius);
      glow.addColorStop(0, `rgba(142, 248, 255, ${0.1 + node.signal * 0.18 + hoverGain * 0.1 + burstGain * 0.34})`);
      glow.addColorStop(1, "rgba(142, 248, 255, 0)");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = `rgba(235, 252, 255, ${0.34 + ambient * 0.34 + burstGain * 0.26})`;
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

      for (let ringIndex = 0; ringIndex < 4; ringIndex += 1) {
        const ringElapsed = elapsed - ringIndex * 90;
        if (ringElapsed < 0 || ringElapsed > 900) {
          continue;
        }

        const ringRadius = 16 + ringElapsed * 0.26;
        const ringAlpha = clamp(0.38 - ringElapsed / 1700, 0, 0.38);
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
    buildBrainMask();
    rebuild();

    if (reducedMotion) {
      frame(performance.now());
    }
  });

  brainImage.addEventListener("error", () => {
    if (!brainImage.src.endsWith("brain-hero-3d.svg")) {
      brainImage.src = "./assets/brain-hero-3d.svg";
    }
  });

  const base64ToObjectUrl = (base64, mimeType) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    if (brainObjectUrl) {
      URL.revokeObjectURL(brainObjectUrl);
    }

    brainObjectUrl = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
    return brainObjectUrl;
  };

  const loadBrainImage = async () => {
    try {
      const chunkPaths = [
        "./assets/brain-hero-25d.b64.00",
        "./assets/brain-hero-25d.b64.01",
        "./assets/brain-hero-25d.b64.02",
        "./assets/brain-hero-25d.b64.03",
        "./assets/brain-hero-25d.b64.04",
        "./assets/brain-hero-25d.b64.05",
      ];
      const parts = await Promise.all(
        chunkPaths.map(async (chunkPath) => {
          const response = await fetch(chunkPath, { cache: "no-cache" });
          if (!response.ok) {
            throw new Error(`Missing brain image payload chunk: ${chunkPath}`);
          }

          return (await response.text()).trim();
        })
      );

      brainImage.src = base64ToObjectUrl(parts.join(""), "image/webp");
    } catch (error) {
      brainImage.src = "./assets/brain-hero-3d.svg";
    }
  };

  loadBrainImage();
};

if (neuralCanvas) {
  initializeNeuralField(neuralCanvas);
}

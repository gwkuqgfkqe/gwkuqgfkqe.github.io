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
  let nodes = [];

  const setPointerHome = () => {
    pointer.x = width * 0.72;
    pointer.y = height * 0.28;
    pointer.targetX = pointer.x;
    pointer.targetY = pointer.y;
  };

  const buildCluster = (group, centerX, centerY, radiusX, radiusY, count, offset) => {
    const cluster = [];

    for (let index = 0; index < count; index += 1) {
      const angle = offset + (index / count) * Math.PI * 2;
      const radialMix = 0.42 + Math.random() * 0.48;
      const squeeze = 0.78 + Math.random() * 0.26;
      const x = centerX + Math.cos(angle) * radiusX * radialMix;
      const y = centerY + Math.sin(angle) * radiusY * radialMix * squeeze;

      cluster.push({
        group,
        baseX: x,
        baseY: y,
        radius: 1.6 + Math.random() * 1.8,
        drift: 4 + Math.random() * 12,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.9,
      });
    }

    return cluster;
  };

  const buildArray = () => {
    const strip = [];
    const total = Math.max(10, Math.round(width / 118));
    const startX = width * 0.12;
    const usableWidth = width * 0.54;

    for (let index = 0; index < total; index += 1) {
      const progress = total === 1 ? 0 : index / (total - 1);
      strip.push({
        group: "array",
        baseX: startX + usableWidth * progress,
        baseY: height * 0.74 + Math.sin(progress * Math.PI * 3) * 10,
        radius: 1.8 + (index % 3) * 0.35,
        drift: 3 + (index % 4),
        phase: progress * Math.PI * 3,
        speed: 0.8 + progress * 0.4,
      });
    }

    return strip;
  };

  const rebuild = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(dpr, dpr);

    nodes = [
      ...buildCluster("brain", width * 0.58, height * 0.24, width * 0.11, height * 0.13, 28, 0.28),
      ...buildCluster("brain", width * 0.74, height * 0.28, width * 0.1, height * 0.12, 26, 0.92),
      ...buildArray(),
    ];

    setPointerHome();
  };

  const drawTraces = (time) => {
    const traces = [
      { baseY: height * 0.17, amplitude: 14, width: 1.6, color: "rgba(58, 166, 188, 0.28)" },
      { baseY: height * 0.24, amplitude: 11, width: 1.2, color: "rgba(103, 212, 224, 0.22)" },
      { baseY: height * 0.33, amplitude: 10, width: 1.15, color: "rgba(58, 166, 188, 0.2)" },
      { baseY: height * 0.68, amplitude: 8, width: 1.0, color: "rgba(150, 100, 63, 0.14)" },
    ];

    traces.forEach((trace, index) => {
      context.beginPath();

      for (let x = -32; x <= width + 32; x += 18) {
        const drift = Math.sin(x * 0.012 + time * 0.0012 + index * 1.4) * trace.amplitude;
        const distanceX = x - pointer.x;
        const pointerEnvelope = Math.exp(-(distanceX * distanceX) / 42000);
        const pointerLift = (pointer.y - trace.baseY) * pointerEnvelope * 0.22;
        const y = trace.baseY + drift + pointerLift;

        if (x === -32) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }

      context.strokeStyle = trace.color;
      context.lineWidth = trace.width;
      context.stroke();
    });
  };

  const drawReticle = () => {
    const alpha = pointer.active ? 0.82 : 0.32;
    const radius = pointer.active ? 26 : 18;

    context.save();
    context.translate(pointer.x, pointer.y);
    context.strokeStyle = `rgba(16, 61, 68, ${alpha})`;
    context.lineWidth = 1.1;
    context.setLineDash([6, 7]);
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);

    context.strokeStyle = `rgba(58, 166, 188, ${alpha})`;
    context.beginPath();
    context.moveTo(-radius - 12, 0);
    context.lineTo(radius + 12, 0);
    context.moveTo(0, -radius - 12);
    context.lineTo(0, radius + 12);
    context.stroke();

    const glow = context.createRadialGradient(0, 0, 0, 0, 0, 80);
    glow.addColorStop(0, "rgba(58, 166, 188, 0.18)");
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

    drawTraces(time);

    pointer.x += (pointer.targetX - pointer.x) * 0.08;
    pointer.y += (pointer.targetY - pointer.y) * 0.08;

    const positions = nodes.map((node) => {
      const driftX = Math.cos(time * 0.00028 * node.speed + node.phase) * node.drift;
      const driftY = Math.sin(time * 0.00022 * node.speed + node.phase) * node.drift * 0.75;
      const distance = Math.hypot(pointer.x - node.baseX, pointer.y - node.baseY);
      const attraction = Math.max(0, 1 - distance / 210);

      return {
        ...node,
        x: node.baseX + driftX + (pointer.x - node.baseX) * attraction * 0.065,
        y: node.baseY + driftY + (pointer.y - node.baseY) * attraction * 0.065,
        glow: attraction,
      };
    });

    for (let index = 0; index < positions.length; index += 1) {
      const source = positions[index];

      for (let next = index + 1; next < positions.length; next += 1) {
        const target = positions[next];
        const dx = source.x - target.x;
        const dy = source.y - target.y;
        const distance = Math.hypot(dx, dy);
        const maxDistance = source.group === "array" && target.group === "array" ? 110 : 86;

        if (distance > maxDistance || source.group !== target.group) {
          continue;
        }

        const alpha = (1 - distance / maxDistance) * (0.08 + (source.glow + target.glow) * 0.08);
        context.strokeStyle =
          source.group === "array"
            ? `rgba(150, 100, 63, ${alpha})`
            : `rgba(58, 166, 188, ${alpha})`;
        context.lineWidth = source.group === "array" ? 0.85 : 1.05;
        context.beginPath();
        context.moveTo(source.x, source.y);
        context.lineTo(target.x, target.y);
        context.stroke();
      }
    }

    positions.forEach((node) => {
      const coreColor =
        node.group === "array"
          ? `rgba(150, 100, 63, ${0.32 + node.glow * 0.4})`
          : `rgba(16, 61, 68, ${0.46 + node.glow * 0.36})`;
      const halo = context.createRadialGradient(node.x, node.y, 0, node.x, node.y, 18 + node.glow * 18);
      halo.addColorStop(
        0,
        node.group === "array"
          ? `rgba(150, 100, 63, ${0.18 + node.glow * 0.18})`
          : `rgba(58, 166, 188, ${0.18 + node.glow * 0.24})`
      );
      halo.addColorStop(1, "rgba(58, 166, 188, 0)");

      context.fillStyle = halo;
      context.beginPath();
      context.arc(node.x, node.y, 18 + node.glow * 18, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = coreColor;
      context.beginPath();
      context.arc(node.x, node.y, node.radius + node.glow * 1.2, 0, Math.PI * 2);
      context.fill();
    });

    drawReticle();

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

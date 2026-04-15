document.documentElement.classList.add("js");

const revealItems = document.querySelectorAll("[data-reveal]");
const countItems = document.querySelectorAll("[data-count]");
const navLinks = Array.from(document.querySelectorAll(".site-nav a"));
const sections = Array.from(document.querySelectorAll("section[id]"));
const header = document.querySelector(".site-header");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  const target = Number(element.dataset.count || "0");

  if (!Number.isFinite(target)) {
    return;
  }

  if (reducedMotion) {
    element.textContent = String(target);
    return;
  }

  element.textContent = "0";
  const duration = 900;
  const start = performance.now();

  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    element.textContent = String(Math.round(progress * target));

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
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
    const isActive = link.getAttribute("href") === `#${id}`;
    link.setAttribute("aria-current", isActive ? "true" : "false");
  });
};

const sectionObserver = new IntersectionObserver(
  (entries) => {
    const visibleEntries = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

    if (!visibleEntries.length) {
      return;
    }

    setActiveLink(visibleEntries[0].target.id);
  },
  {
    threshold: [0.2, 0.35, 0.5, 0.75],
    rootMargin: "-30% 0px -45% 0px",
  }
);

sections.forEach((section) => sectionObserver.observe(section));

const syncHeader = () => {
  if (!header) {
    return;
  }

  header.classList.toggle("scrolled", window.scrollY > 20);
};

syncHeader();
window.addEventListener("scroll", syncHeader, { passive: true });

const currentYear = document.getElementById("current-year");
if (currentYear) {
  currentYear.textContent = String(new Date().getFullYear());
}

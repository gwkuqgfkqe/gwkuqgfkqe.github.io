const DEFAULT_CLUSTRMAPS_ID = "vyR4Uw2nfI2Gl457IlTrnBma94O_hDvBMLZtNoG4yCw";

const visitorMapMarkup = `
  <div class="section-heading" data-reveal>
    <p class="eyebrow">Visitors</p>
    <h2>Visitor map and site reach.</h2>
    <p>
      A live ClustrMaps widget shows the geographic reach of this academic
      homepage. The total below preserves the existing site counter.
    </p>
  </div>

  <article class="visitor-map-card" data-reveal>
    <div class="visitor-map-topline">
      <div>
        <p class="card-kicker">ClustrMaps</p>
        <h3>Visitor locations</h3>
      </div>
      <div class="visitor-map-total">
        <span>Total visits</span>
        <strong id="visitor-map-count">--</strong>
      </div>
    </div>

    <div class="clustrmaps-frame" id="clustrmaps-frame" aria-label="Visitor map">
      <div class="visitor-map-placeholder" id="visitor-map-placeholder">
        <div class="visitor-map-art" aria-hidden="true">
          <span class="visitor-dot dot-one"></span>
          <span class="visitor-dot dot-two"></span>
          <span class="visitor-dot dot-three"></span>
          <span class="visitor-dot dot-four"></span>
          <span class="visitor-dot dot-five"></span>
          <span class="visitor-dot dot-six"></span>
          <span class="visitor-pulse pulse-one"></span>
          <span class="visitor-pulse pulse-two"></span>
        </div>
        <p>
          Live geographic dots will start from the first visit after the
          ClustrMaps ID is added.
        </p>
      </div>
    </div>

    <p class="visitor-map-note">
      Historical visits from the previous counter are preserved as a total
      count; historical city-level locations were not stored.
    </p>
  </article>
`;

const visitorMapStyles = `
  [hidden] {
    display: none !important;
  }

  .visitor-map-card {
    padding: 1.4rem;
    border: 1px solid rgba(23, 34, 45, 0.1);
    border-radius: var(--radius-xl);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.74), rgba(255, 255, 255, 0.28)),
      rgba(255, 255, 255, 0.54);
    box-shadow: var(--shadow);
  }

  .visitor-map-topline {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .visitor-map-topline h3 {
    margin: 0.45rem 0 0;
    font-family: var(--font-display);
    font-size: 2rem;
    line-height: 1.05;
  }

  .visitor-map-total {
    min-width: 8rem;
    padding: 0.75rem 0.9rem;
    border: 1px solid rgba(16, 61, 68, 0.12);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.56);
    text-align: right;
  }

  .visitor-map-total span {
    display: block;
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.14em;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .visitor-map-total strong {
    display: block;
    margin-top: 0.32rem;
    color: var(--accent-strong);
    font-family: var(--font-display);
    font-size: 2.3rem;
    line-height: 0.95;
    font-variant-numeric: tabular-nums;
  }

  .clustrmaps-frame {
    position: relative;
    min-height: 17rem;
    overflow: hidden;
    border: 1px solid rgba(16, 61, 68, 0.1);
    border-radius: 24px;
    background:
      radial-gradient(circle at 28% 22%, rgba(95, 220, 231, 0.2), transparent 24%),
      linear-gradient(135deg, rgba(16, 61, 68, 0.95), rgba(29, 88, 97, 0.84));
  }

  .clustrmaps-frame.is-live {
    min-height: auto;
    padding: 1rem;
    background: rgba(29, 88, 97, 0.14);
  }

  .clustrmaps-frame.is-live .visitor-map-placeholder {
    display: none;
  }

  .clustrmaps-frame #clustrmaps-widget-v2 {
    max-width: 100%;
    margin-inline: auto !important;
    overflow: hidden;
    border-radius: 18px;
  }

  .visitor-map-placeholder {
    display: grid;
    min-height: 17rem;
    place-items: center;
    gap: 0.9rem;
    padding: 1rem;
  }

  .visitor-map-placeholder p {
    max-width: 28rem;
    margin: 0;
    color: rgba(255, 255, 255, 0.8);
    text-align: center;
  }

  .visitor-map-art {
    position: relative;
    width: min(100%, 42rem);
    aspect-ratio: 2.04 / 1;
    overflow: hidden;
    border-radius: 18px;
    background:
      linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
      radial-gradient(ellipse at 27% 38%, rgba(245, 252, 238, 0.96) 0 9%, transparent 9.4%),
      radial-gradient(ellipse at 49% 36%, rgba(245, 252, 238, 0.96) 0 8.5%, transparent 9%),
      radial-gradient(ellipse at 68% 39%, rgba(245, 252, 238, 0.96) 0 15%, transparent 15.5%),
      radial-gradient(ellipse at 79% 74%, rgba(245, 252, 238, 0.96) 0 6%, transparent 6.5%),
      linear-gradient(135deg, #2b7ca5, #2e8899);
    background-size: 42px 42px, 42px 42px, auto, auto, auto, auto, auto;
  }

  .visitor-map-art::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 22% 48%, rgba(245, 252, 238, 0.96) 0 7%, transparent 7.5%),
      radial-gradient(ellipse at 35% 66%, rgba(245, 252, 238, 0.96) 0 9%, transparent 9.5%),
      radial-gradient(ellipse at 52% 58%, rgba(245, 252, 238, 0.96) 0 7%, transparent 7.5%),
      radial-gradient(ellipse at 72% 59%, rgba(245, 252, 238, 0.96) 0 10%, transparent 10.5%),
      radial-gradient(ellipse at 84% 63%, rgba(245, 252, 238, 0.96) 0 4%, transparent 4.5%);
    filter: blur(0.2px);
    opacity: 0.9;
  }

  .visitor-dot,
  .visitor-pulse {
    position: absolute;
    z-index: 1;
    border-radius: 999px;
  }

  .visitor-dot {
    width: 0.72rem;
    height: 0.72rem;
    background: #ff4d4d;
    box-shadow: 0 0 0 4px rgba(255, 77, 77, 0.16);
  }

  .visitor-pulse {
    width: 2.5rem;
    height: 2.5rem;
    border: 2px solid rgba(255, 77, 77, 0.36);
    animation: visitor-pulse 2.4s ease-out infinite;
  }

  .dot-one { left: 24%; top: 41%; }
  .dot-two { left: 31%; top: 52%; }
  .dot-three { left: 52%; top: 37%; }
  .dot-four { left: 62%; top: 43%; }
  .dot-five { left: 74%; top: 55%; }
  .dot-six { left: 81%; top: 71%; }
  .pulse-one { left: calc(52% - 0.9rem); top: calc(37% - 0.9rem); }
  .pulse-two { left: calc(81% - 0.9rem); top: calc(71% - 0.9rem); animation-delay: 0.8s; }

  .visitor-map-note {
    margin: 0.9rem 0 0;
    color: var(--muted);
    font-size: 0.95rem;
  }

  .visitor-counter.has-map {
    cursor: pointer;
  }

  @keyframes visitor-pulse {
    0% {
      opacity: 0.8;
      transform: scale(0.5);
    }

    100% {
      opacity: 0;
      transform: scale(1.75);
    }
  }

  @media (max-width: 620px) {
    .visitor-map-topline {
      display: grid;
    }

    .visitor-map-total {
      text-align: left;
    }

    .clustrmaps-frame,
    .visitor-map-placeholder {
      min-height: 13rem;
    }
  }
`;

const ensureVisitorMapStyles = () => {
  if (document.getElementById("visitor-map-runtime-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "visitor-map-runtime-styles";
  style.textContent = visitorMapStyles;
  document.head.append(style);
};

const ensureVisitorMapDom = () => {
  let visitorsSection = document.getElementById("visitors");

  if (!visitorsSection) {
    const contactSection = document.getElementById("contact");
    if (!contactSection || !contactSection.parentNode) {
      return null;
    }

    visitorsSection = document.createElement("section");
    visitorsSection.id = "visitors";
    visitorsSection.className = "section visitors-section";
    visitorsSection.hidden = true;
    visitorsSection.innerHTML = visitorMapMarkup;
    contactSection.parentNode.insertBefore(visitorsSection, contactSection);
  }

  let navLink = document.querySelector(".visitors-nav-link");
  if (!navLink) {
    const contactNavLink = document.querySelector('.site-nav a[href="#contact"]');
    if (contactNavLink && contactNavLink.parentNode) {
      navLink = document.createElement("a");
      navLink.className = "visitors-nav-link";
      navLink.href = "#visitors";
      navLink.hidden = true;
      navLink.textContent = "Visitors";
      contactNavLink.parentNode.insertBefore(navLink, contactNavLink);
    }
  }

  return {
    visitorsSection,
    visitorsNavLinks: document.querySelectorAll(".visitors-nav-link"),
    mapValue: document.getElementById("visitor-map-count"),
    clustrMapsFrame: document.getElementById("clustrmaps-frame"),
  };
};

const initializeVisitorCounter = () => {
  const counter = document.getElementById("visitor-counter");
  const value = document.getElementById("visitor-count-value");

  if (!counter || !value) {
    return;
  }

  const ownerStorageKey = "zonghan-du-owner-visit";
  const namespace = "gwkuqgfkqe-github-io";
  const key = "visits";
  const params = new URLSearchParams(window.location.search);
  const markOwner = params.get("owner") === "1";
  const clearOwner = params.get("countme") === "1";
  const previewVisitors = params.get("preview-visitors") === "1";
  const visitorMap = (DEFAULT_CLUSTRMAPS_ID || previewVisitors) ? ensureVisitorMapDom() : null;
  const countTargets = [value, visitorMap?.mapValue].filter(Boolean);
  const readOwnerMode = () => {
    try {
      return window.localStorage.getItem(ownerStorageKey) === "true";
    } catch {
      return false;
    }
  };

  if (markOwner) {
    try {
      window.localStorage.setItem(ownerStorageKey, "true");
    } catch {
      // Private browsing modes can disable storage; fall back to normal counting.
    }
  }

  if (clearOwner) {
    try {
      window.localStorage.removeItem(ownerStorageKey);
    } catch {
      // Storage is optional; failing to clear should not break the page.
    }
  }

  const initializeVisitorMap = () => {
    if (!visitorMap?.visitorsSection || !visitorMap.clustrMapsFrame) {
      return;
    }

    ensureVisitorMapStyles();
    visitorMap.visitorsSection.hidden = false;
    visitorMap.visitorsNavLinks.forEach((link) => {
      link.hidden = false;
    });

    counter.classList.add("has-map");
    counter.setAttribute("role", "link");
    counter.setAttribute("tabindex", "0");
    counter.setAttribute("title", "Open visitor map");
    counter.addEventListener("click", () => {
      visitorMap.visitorsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    counter.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        visitorMap.visitorsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    if (!DEFAULT_CLUSTRMAPS_ID) {
      visitorMap.clustrMapsFrame.classList.add("is-preview");
      return;
    }

    visitorMap.clustrMapsFrame.classList.add("is-live");
    const script = document.createElement("script");
    script.id = "clustrmaps";
    script.type = "text/javascript";
    script.src = `https://clustrmaps.com/map_v2.js?d=${encodeURIComponent(DEFAULT_CLUSTRMAPS_ID)}&cl=ffffff&w=a`;
    visitorMap.clustrMapsFrame.append(script);
  };

  initializeVisitorMap();

  if (markOwner || clearOwner) {
    params.delete("owner");
    params.delete("countme");
    const cleanQuery = params.toString();
    const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", cleanUrl);
  }

  const ownerMode = readOwnerMode();
  const endpoint = ownerMode
    ? `https://api.counterapi.dev/v1/${namespace}/${key}/`
    : `https://api.counterapi.dev/v1/${namespace}/${key}/up`;

  if (ownerMode) {
    counter.classList.add("is-owner");
  }

  fetch(endpoint, { method: "GET", mode: "cors" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Counter request failed: ${response.status}`);
      }
      return response.json();
    })
    .then((payload) => {
      const formattedCount = Number.isFinite(payload.count)
        ? new Intl.NumberFormat("en-US").format(payload.count)
        : "--";
      countTargets.forEach((target) => {
        target.textContent = formattedCount;
      });
      counter.classList.add("is-ready");
    })
    .catch(() => {
      countTargets.forEach((target) => {
        target.textContent = "--";
      });
      counter.classList.add("is-ready");
    });
};

initializeVisitorCounter();

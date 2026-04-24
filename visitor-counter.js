const initializeVisitorCounter = () => {
  const counter = document.getElementById("visitor-counter");
  const badge = document.getElementById("visitor-badge");

  if (!counter || !badge) {
    return;
  }

  const ownerStorageKey = "zonghan-du-owner-visit";
  const params = new URLSearchParams(window.location.search);
  const markOwner = params.get("owner") === "1";
  const clearOwner = params.get("countme") === "1";

  if (markOwner) {
    window.localStorage.setItem(ownerStorageKey, "true");
  }

  if (clearOwner) {
    window.localStorage.removeItem(ownerStorageKey);
  }

  if (markOwner || clearOwner) {
    params.delete("owner");
    params.delete("countme");
    const cleanQuery = params.toString();
    const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", cleanUrl);
  }

  const ownerMode = window.localStorage.getItem(ownerStorageKey) === "true";
  const badgeParams = new URLSearchParams({
    page_id: "gwkuqgfkqe.github.io",
    left_text: "Visitors",
    left_color: "#0f4f59",
    right_color: "#5fe8f4",
    unique: "true",
    timeframe: "86400",
  });

  if (ownerMode) {
    badgeParams.set("read", "true");
    counter.classList.add("is-owner");
  }

  badge.addEventListener("load", () => {
    counter.classList.add("is-ready");
  });

  badge.addEventListener("error", () => {
    counter.remove();
  });

  badge.src = `https://visitor-badge.one9x.com/badge?${badgeParams.toString()}`;
};

initializeVisitorCounter();

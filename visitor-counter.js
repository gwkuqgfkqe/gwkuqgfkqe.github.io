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
      value.textContent = Number.isFinite(payload.count)
        ? new Intl.NumberFormat("en-US").format(payload.count)
        : "--";
      counter.classList.add("is-ready");
    })
    .catch(() => {
      value.textContent = "--";
      counter.classList.add("is-ready");
    });
};

initializeVisitorCounter();

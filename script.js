// === Confetti Setup ===
const canvas = document.createElement("canvas");
canvas.id = "confetti-canvas";
document.body.appendChild(canvas);
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
canvas.style.position = "fixed";
canvas.style.top = 0;
canvas.style.left = 0;
canvas.style.pointerEvents = "none";
canvas.style.zIndex = 999;

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

const particles = [];
function createParticle() {
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - 100,
    r: Math.random() * 6 + 4,
    d: Math.random() * 30 + 10,
    color: `hsl(${Math.random() * 360}, 70%, 60%)`,
    tilt: Math.random() * 10 - 10,
    tiltAngleIncrement: Math.random() * 0.07 + 0.05,
    tiltAngle: 0,
  };
}
function startConfetti(count = 150) {
  for (let i = 0; i < count; i++) particles.push(createParticle());
}
function drawConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach((p, i) => {
    p.tiltAngle += p.tiltAngleIncrement;
    p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
    p.x += Math.sin(p.tiltAngle);
    p.tilt = Math.sin(p.tiltAngle) * 15;

    ctx.beginPath();
    ctx.lineWidth = p.r;
    ctx.strokeStyle = p.color;
    ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
    ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
    ctx.stroke();

    if (p.y > canvas.height) particles.splice(i, 1);
  });
  requestAnimationFrame(drawConfetti);
}
drawConfetti();

// === DOM refs ===
const checkBtn = document.getElementById("check-btn");
const usernameInput = document.getElementById("username");
const formError = document.getElementById("form-error");
const resultBox = document.getElementById("result-box");
const twitterUsername = document.getElementById("twitter-username");
const twitterPfp = document.getElementById("twitter-pfp");
const startBox = document.getElementById("start-box");

// Mindshare display elements
const s0MindshareEl = document.getElementById("season0-mindshare");
const s1MindshareEl = document.getElementById("season1-mindshare");

// === Allocation Constants ===
const season0Pool = 0.006 * 1e10; // 0.6% of 10B
const season1Pool = 0.004 * 1e10; // 0.4% of 10B

const multipliers = {
  ideal: [0.05, 0.075],
  bull: [0.075, 0.1],
  superbull: [0.12, 0.17],
  gigabull: [0.17, 0.2],
};

let mindshare0 = 0;
let mindshare1 = 0;
let allocation0 = 0;
let allocation1 = 0;

checkBtn.onclick = async () => {
  const raw = usernameInput.value.trim();
  if (!raw) {
    formError.innerText = "Please enter a username";
    return;
  }
  const username = raw.startsWith("@") ? raw.slice(1).toLowerCase() : raw.toLowerCase();
  formError.innerText = "";

  let s0Data = [], s1Data = [];
  try {
    const s0Res = await fetch("top_2000_all_network.json");
    s0Data = await s0Res.json();
  } catch {
    formError.innerText = "Couldn't load Season 0 data.";
    return;
  }
  try {
    const s1Res = await fetch("season1.json");
    s1Data = await s1Res.json();
  } catch {
    formError.innerText = "Couldn't load Season 1 data.";
    return;
  }

  // Find user (case-insensitive)
  const s0User = s0Data.find(u => (u.username || "").toLowerCase() === username);
  const s1User = s1Data.find(u => (u.username || "").toLowerCase() === username);

  // Read mindshare (strip %, handle missing)
  mindshare0 = s0User && s0User.mindshare
    ? parseFloat(s0User.mindshare.replace("%", "").trim())
    : 0;
  mindshare1 = s1User && s1User.mindshare
    ? parseFloat(s1User.mindshare.replace("%", "").trim())
    : 0;
  if (isNaN(mindshare0)) mindshare0 = 0;
  if (isNaN(mindshare1)) mindshare1 = 0;

  allocation0 = Math.round((mindshare0 / 100) * season0Pool);
  allocation1 = Math.round((mindshare1 / 100) * season1Pool);

  // Show UI
  startConfetti();
  document.getElementById("season0-amount").innerText = formatNum(allocation0) + " $U";
  document.getElementById("season1-amount").innerText = formatNum(allocation1) + " $U";

  // Mindshare display (just below allocation)
  s0MindshareEl.innerText =
    `Your mindshare in Season 0: ${mindshare0 ? mindshare0.toFixed(2) + "%" : "0%"}`;
  s1MindshareEl.innerText =
    `Your mindshare in Season 1: ${mindshare1 ? mindshare1.toFixed(2) + "%" : "0%"}`;

  updateRow("s0", allocation0);
  updateRow("s1", allocation1);

  // Hide the search/start box
  startBox.classList.add("hidden");
  // Show the results box
  resultBox.classList.remove("hidden");
  twitterUsername.innerText = "@" + username;

  // --- Robust Twitter PFP loading ---
  let pfpUrl = s1User && s1User.pfp ? s1User.pfp.replace("_normal.", "_400x400.") : "";
  if (pfpUrl) {
    twitterPfp.onerror = () => {
      // fallback to unavatar
      twitterPfp.onerror = () => {
        twitterPfp.src = "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png";
      };
      twitterPfp.src = `https://unavatar.io/twitter/${username}`;
    };
    twitterPfp.src = pfpUrl;
  } else {
    twitterPfp.onerror = () => {
      twitterPfp.src = "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png";
    };
    twitterPfp.src = `https://unavatar.io/twitter/${username}`;
  }
};

function updateRow(prefix, amount) {
  if (!amount) {
    document.getElementById(`${prefix}-ideal`).innerText = "—";
    document.getElementById(`${prefix}-bull`).innerText = "—";
    document.getElementById(`${prefix}-superbull`).innerText = "—";
    document.getElementById(`${prefix}-gigabull`).innerText = "—";
    return;
  }
  document.getElementById(`${prefix}-ideal`).innerText = usdRange(amount, multipliers.ideal);
  document.getElementById(`${prefix}-bull`).innerText = usdRange(amount, multipliers.bull);
  document.getElementById(`${prefix}-superbull`).innerText = usdRange(amount, multipliers.superbull);
  document.getElementById(`${prefix}-gigabull`).innerText = usdRange(amount, multipliers.gigabull);
}

function usdRange(tokenAmount, [min, max]) {
  return `~$${formatNum(tokenAmount * min)}–$${formatNum(tokenAmount * max)}`;
}

function formatNum(n) {
  n = Math.round(n);
  if (n >= 1e6) return (n / 1e6).toFixed(2).replace(/\.00$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString();
}

// === Share on X ===
document.getElementById("share-btn").onclick = function () {
  const username = document.getElementById('twitter-username').innerText.replace('@', '');
  const allocation0 = document.getElementById('season0-amount').innerText;
  const allocation1 = document.getElementById('season1-amount').innerText;
  const mindshare0txt = s0MindshareEl.innerText.replace('Your mindshare in Season 0: ', '');
  const mindshare1txt = s1MindshareEl.innerText.replace('Your mindshare in Season 1: ', '');

  const tweet =
`Just checked my Yapper allocation for SZN 0 & 1!

SZN 0: ${allocation0} (${mindshare0txt})
SZN 1: ${allocation1} (${mindshare1txt})

Depending on FDV, this could be a wild ride. Mindshare matters!

Check yours: https://your-yapper-calc-url`;

  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;
  window.open(url, '_blank');
};

// === View Math Behind This ===
document.getElementById("math-btn").onclick = function () {
  window.open('https://twitter.com/Shinosuka_eth/status/yourmaththreadid', '_blank');
};

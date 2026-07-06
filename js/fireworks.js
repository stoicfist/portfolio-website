const card = document.getElementById("competition-card");
const canvas = document.getElementById("competition-fireworks");

if (card && canvas) {
    const ctx = canvas.getContext("2d");

    let rockets = [];
    let particles = [];
    let flashes = [];
    let smoke = [];

    let hoverActive = false;
    let hoverTimeout = null;
    let fireworkInterval = null;
    let animating = false;

    let activeRocketCycles = 0;

    let lastFrameTime = performance.now();
    let deltaMultiplier = 1;

    const celebrationEndDate = new Date("2026-12-31");

    const IS_MOBILE =
        window.innerWidth < 768 ||
        /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    const MAX_ROCKETS = IS_MOBILE ? 1 : 2;

    // Physics Constants
    const GRAVITY_ROCKET = 0.038;
    const GRAVITY_PARTICLE = 0.035;
    const DRAG = 0.986;

    // Quality Settings
    const TRAIL_LENGTH = IS_MOBILE ? 8 : 20;
    const SMOKE_DECAY = IS_MOBILE ? 0.01 : 0.0018;
    const MAX_SMOKE = IS_MOBILE ? 0 : 70;

    const ROCKET_INTERVAL_MIN = IS_MOBILE ? 1600 : 1000;
    const ROCKET_INTERVAL_MAX = IS_MOBILE ? 2300 : 1600;

    const PARTICLE_COUNT_MIN = IS_MOBILE ? 28 : 65;
    const PARTICLE_COUNT_MAX = IS_MOBILE ? 45 : 105;

    function resizeCanvas() {
        const width = card.offsetWidth;
        const height = card.offsetHeight;

        const dpr = IS_MOBILE ? 1 : Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = width * dpr;
        canvas.height = height * dpr;

        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function random(min, max) {
        return Math.random() * (max - min) + min;
    }

    function randomColor() {
        const colors =
        [
            "#ffd700","#ffcc33",
            "#fff4c2", "#ffffff",
            "#d9e2ec", "#bfc7d5"
        ];
        return colors[Math.floor(random(0, colors.length))];
    }

    function ensureAnimating() {
        if (!animating) {
            animating = true;
            lastFrameTime = performance.now();
            requestAnimationFrame(animate);
        }
    }

    function tryCreateRocket() {
        if (!hoverActive) return;
        if (new Date() > celebrationEndDate) return;
        if (activeRocketCycles >= MAX_ROCKETS) return;

        createRocket();
    }

    function createRocket() {
        activeRocketCycles++;

        const startX = random(50, card.offsetWidth - 50);
        const startY = card.offsetHeight + 12;

        const type = Math.floor(random(0, 4));
        let targetX = startX;
        const targetY = random(card.offsetHeight * 0.15, card.offsetHeight * 0.5);

        switch (type) {
            case 0:
                targetX = startX + random(-15, 15);
                break;

            case 1:
                targetX = random(card.offsetWidth * 0.2, card.offsetWidth * 0.85);
                break;

            case 2:
                targetX = startX;
                break;

            case 3:
                targetX = startX + random(-card.offsetWidth * 0.25, card.offsetWidth * 0.25);
                break;

            default:
                targetX = startX + random(-card.offsetWidth * 0.3, card.offsetWidth * 0.3);
                break;
        }

        targetX = Math.max(30, Math.min(card.offsetWidth - 30, targetX));

        const dy = startY - targetY;
        const vy0 = -Math.sqrt(2 * GRAVITY_ROCKET * dy);
        const timeToApex = -vy0 / GRAVITY_ROCKET;
        const vx0 = (targetX - startX) / timeToApex;

        rockets.push({
            x: startX,
            y: startY,
            startX,
            startY,
            vx0,
            vy0,
            t: 0,
            timeToApex,
            type,
            color: randomColor(),
            spiralAmp: random(10, 18),
            spiralFreq: random(0.16, 0.23),
            trail: [],
            slotReleased: false,

            // Tail jitter, rocket with small unstable flame movement
            trailJitter: random(IS_MOBILE ? 0.35 : 0.65, IS_MOBILE ? 0.75 : 1.25),
            trailNoisePhase: random(0, Math.PI * 2)
        });

        // Launch smoke, small ignition puff at the start (desktop only)
        if (!IS_MOBILE) {
            spawnSmoke(startX, startY - 8, random(5, 8), 0.35);
        }

        // Ignition sparks, small start sparks
        spawnIgnitionSparks(startX, startY - 4, randomColor());

        ensureAnimating();
    }

    function releaseRocketSlot() {
        activeRocketCycles = Math.max(0, activeRocketCycles - 1);
    }

    function spawnSmoke(x, y, size, life = 1) {
        if (IS_MOBILE) return;
        if (smoke.length > MAX_SMOKE) smoke.shift();

        const blobs = [];

        for (let i = 0; i < Math.floor(random(2, 5)); i++) {
            blobs.push({
                dx: random(-size * 0.45, size * 0.45),
                dy: random(-size * 0.45, size * 0.45),
                sizeMult: random(0.55, 1.1),
                shade: Math.floor(random(115, 155))
            });
        }

        smoke.push({
            x,
            y,
            vx: random(-0.12, 0.12),
            vy: random(-0.25, -0.05),
            size,
            life,
            growth: random(0.08, 0.22),
            blobs
        });
    }

    function spawnIgnitionSparks(x, y, color) {
        const ignitionCount = IS_MOBILE ? 4 : 8;

        for (let i = 0; i < ignitionCount; i++) {
            const angle = random(Math.PI * 0.15, Math.PI * 0.85);
            const speed = random(0.7, IS_MOBILE ? 1.25 : 1.65);

            particles.push({
                x,
                y,
                prevX: x,
                prevY: y,
                vx: Math.cos(angle) * speed * random(0.7, 1.2),
                vy: Math.sin(angle) * speed * random(0.6, 1.05),
                life: random(0.35, 0.55),
                delay: 0,
                decay: random(IS_MOBILE ? 0.035 : 0.026, IS_MOBILE ? 0.055 : 0.042),
                gravity: random(0.045, 0.075),
                wind: random(-0.006, 0.006),
                color,
                size: random(0.8, IS_MOBILE ? 1.15 : 1.35),
                flickerPhase: random(0, Math.PI * 2),
                sparkLength: random(0.7, IS_MOBILE ? 1.1 : 1.35),
                heavy: false,
                ignition: true
            });
        }
    }

    function explode(x, y, color) {
        flashes.push({
            x,
            y,
            life: 1,
            radius: IS_MOBILE ? random(55, 85) : random(90, 150),
            color
        });

        const count = Math.floor(random(PARTICLE_COUNT_MIN, PARTICLE_COUNT_MAX));

        // Burst types: 0 = normal, 1 = bouquet, 2 = chrysanthemum.
        const burstType = Math.floor(random(0, 3));

        // Wind: very small horizontal drift for natural movement.
        const burstWind = random(-0.012, 0.012);

        for (let i = 0; i < count; i++) {
            const angle = random(0, Math.PI * 2);

            // Less spherical shape, more natural firework :)
            let speed = random(1.35, IS_MOBILE ? 2.45 : 3.25);

            // More natural explosion
            let stretchX = random(0.75, 1.25);
            let stretchY = random(0.85, 1.15);

            // Burst type variations
            if (burstType === 1) {
                // Bouquet, slightly slower and falls more beautifully
                speed *= random(0.82, 1.02);
                stretchY *= random(0.95, 1.25);
            } else if (burstType === 2) {
                // Chrysanthemum, cleaner outward burst
                speed *= random(1.0, 1.18);
                stretchX *= random(0.9, 1.1);
                stretchY *= random(0.9, 1.1);
            }

            // Bouquet effect
            const isFallingSpark = Math.sin(angle) > 0;
            const downwardLifeFactor = isFallingSpark ? random(0.82, 0.94) : random(1.0, 1.08);

            // Heavy sparks
            const isHeavySpark = Math.random() < (IS_MOBILE ? 0.1 : 0.15);

            // Particle delay
            const delay = random(0, IS_MOBILE ? 2.5 : 5.5);

            const baseDecay =
                random(IS_MOBILE ? 0.01 : 0.0035, IS_MOBILE ? 0.016 : 0.0068) *
                downwardLifeFactor *
                (isHeavySpark ? 0.76 : 1);

            particles.push({
                x,
                y,
                prevX: x,
                prevY: y,
                vx: Math.cos(angle) * speed * stretchX,
                vy: Math.sin(angle) * speed * stretchY,
                life: 1,
                delay,
                decay: baseDecay,
                gravity: random(
                    IS_MOBILE ? 0.038 : burstType === 1 ? 0.046 : 0.038,
                    IS_MOBILE ? 0.058 : burstType === 1 ? 0.078 : 0.068
                ),
                wind: burstWind * random(0.6, 1.4),
                color,
                size: isHeavySpark
                    ? random(IS_MOBILE ? 1.35 : 1.6, IS_MOBILE ? 1.9 : 2.6)
                    : random(1, IS_MOBILE ? 1.55 : 2.2),
                flickerPhase: random(0, Math.PI * 2),
                sparkLength: isHeavySpark
                    ? random(IS_MOBILE ? 1.1 : 1.4, IS_MOBILE ? 1.7 : 2.3)
                    : random(IS_MOBILE ? 0.7 : 0.9, IS_MOBILE ? 1.4 : 1.8),
                heavy: isHeavySpark,
                ignition: false
            });
        }

        if (!IS_MOBILE) {
            for (let i = 0; i < Math.floor(random(7, 12)); i++) {
                spawnSmoke(
                    x + random(-12, 12),
                    y + random(-12, 12),
                    random(10, 22),
                    random(0.65, 1)
                );
            }
        }
    }

    function drawRocketTrail(rocket) {
        // Trail jitter
        const noiseX =
            Math.sin(rocket.t * 0.55 + rocket.trailNoisePhase) *
            rocket.trailJitter *
            random(0.65, 1.2);

        const noiseY =
            Math.cos(rocket.t * 0.48 + rocket.trailNoisePhase) *
            rocket.trailJitter *
            random(0.25, 0.75);

        rocket.trail.push({
            x: rocket.x + noiseX + random(-rocket.trailJitter * 0.4, rocket.trailJitter * 0.4),
            y: rocket.y + noiseY + random(-rocket.trailJitter * 0.25, rocket.trailJitter * 0.25)
        });

        if (rocket.trail.length > TRAIL_LENGTH) {
            rocket.trail.shift();
        }

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";

        for (let i = 1; i < rocket.trail.length; i++) {
            const p0 = rocket.trail[i - 1];
            const p1 = rocket.trail[i];
            const t = i / rocket.trail.length;

            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);

            ctx.globalAlpha = t * 0.55;
            ctx.strokeStyle = rocket.color;
            ctx.lineWidth = 0.4 + t * 1.4;

            if (!IS_MOBILE) {
                ctx.shadowBlur = 7 * t;
                ctx.shadowColor = rocket.color;
            }

            ctx.stroke();
        }

        // Small flickering rocket flame behind the head.
        ctx.beginPath();
        ctx.arc(
            rocket.x + random(-1.1, 1.1),
            rocket.y + random(1.5, 3.5),
            IS_MOBILE ? random(1.1, 1.7) : random(1.4, 2.3),
            0,
            Math.PI * 2
        );
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = rocket.color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(rocket.x, rocket.y, IS_MOBILE ? 1.7 : 2.2, 0, Math.PI * 2);
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = "#ffffff";

        if (!IS_MOBILE) {
            ctx.shadowBlur = 16;
            ctx.shadowColor = rocket.color;
        }

        ctx.fill();
        ctx.restore();

        if (!IS_MOBILE && Math.random() < 0.08) {
            spawnSmoke(rocket.x, rocket.y, random(4, 7), random(0.35, 0.55));
        }
    }

    function updateRockets() {
        rockets = rockets.filter((rocket) => {
            rocket.t += 1.02 * deltaMultiplier;

            const tau = rocket.t;
            let x = rocket.startX + rocket.vx0 * tau;

            if (rocket.type === 2) {
                x += Math.sin(tau * rocket.spiralFreq) * rocket.spiralAmp;
            }

            const y =
                rocket.startY +
                rocket.vy0 * tau +
                0.5 * GRAVITY_ROCKET * tau * tau;

            rocket.x = x;
            rocket.y = y;

            drawRocketTrail(rocket);

            if (rocket.t >= rocket.timeToApex) {
                explode(rocket.x, rocket.y, rocket.color);

                if (!rocket.slotReleased) {
                    rocket.slotReleased = true;

                    setTimeout(() => {
                        releaseRocketSlot();
                    }, IS_MOBILE ? 750 : 950);
                }

                return false;
            }

            return true;
        });
    }

    function updateFlashes() {
        flashes = flashes.filter((flash) => {
            flash.life -= (IS_MOBILE ? 0.08 : 0.045) * deltaMultiplier;
            return flash.life > 0;
        });
    }

    function getSmokeLight(x, y) {
        let light = 0;

        flashes.forEach((flash) => {
            const dx = x - flash.x;
            const dy = y - flash.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < flash.radius) {
                light += (1 - dist / flash.radius) * flash.life;
            }
        });

        return Math.min(light, 1);
    }

    function updateSmoke() {
        if (IS_MOBILE) {
            smoke = [];
            return;
        }

        smoke = smoke.filter((s) => {
            s.vx += random(-0.01, 0.01) * deltaMultiplier;
            s.vy += random(-0.008, 0.008) * deltaMultiplier;

            s.vx *= Math.pow(0.985, deltaMultiplier);
            s.vy *= Math.pow(0.985, deltaMultiplier);

            s.x += s.vx * deltaMultiplier;
            s.y += s.vy * deltaMultiplier;
            s.size += s.growth * s.life * deltaMultiplier;
            s.life -= SMOKE_DECAY * deltaMultiplier;

            if (s.life <= 0) return false;

            const light = getSmokeLight(s.x, s.y);

            ctx.save();
            ctx.globalCompositeOperation = "screen";

            s.blobs.forEach((b) => {
                const bx = s.x + b.dx;
                const by = s.y + b.dy;
                const bsize = s.size * b.sizeMult;

                const shade = b.shade + light * 90;
                const alpha = s.life * (0.045 + light * 0.18);

                const grad = ctx.createRadialGradient(bx, by, 0, bx, by, bsize);
                grad.addColorStop(0, `rgba(${shade}, ${shade}, ${shade + 10}, ${alpha})`);
                grad.addColorStop(1, `rgba(${shade}, ${shade}, ${shade + 10}, 0)`);

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(bx, by, bsize, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.restore();
            return true;
        });
    }

    function drawFlashes() {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        flashes.forEach((flash) => {
            const radius = flash.radius * (1 - flash.life * 0.2);

            const grad = ctx.createRadialGradient(
                flash.x,
                flash.y,
                0,
                flash.x,
                flash.y,
                radius
            );

            grad.addColorStop(0, `rgba(255,255,255,${flash.life * 0.8})`);
            grad.addColorStop(0.25, `rgba(255,215,120,${flash.life * 0.25})`);
            grad.addColorStop(1, "rgba(255,255,255,0)");

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(flash.x, flash.y, radius, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    function updateParticles() {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";

        particles = particles.filter((p) => {
            if (p.delay > 0) {
                p.delay -= deltaMultiplier;
                return true;
            }

            const dragFactor = Math.pow(DRAG, deltaMultiplier);

            p.prevX = p.x;
            p.prevY = p.y;

            p.vx += p.wind * deltaMultiplier;
            p.vx *= dragFactor;
            p.vy = p.vy * dragFactor + p.gravity * deltaMultiplier;

            p.x += p.vx * deltaMultiplier;
            p.y += p.vy * deltaMultiplier;
            p.life -= p.decay * deltaMultiplier;

            const twinkle = 0.65 + 0.35 * Math.sin(p.flickerPhase + p.life * 24);
            const alpha = Math.max(p.life, 0) * twinkle;

            // Spark line
            ctx.globalAlpha = alpha * (p.heavy ? 0.9 : 0.75);
            ctx.shadowBlur = 0;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = Math.max(0.6, p.size * (p.heavy ? 0.65 : 0.55));

            ctx.beginPath();
            ctx.moveTo(p.prevX, p.prevY);
            ctx.lineTo(
                p.prevX + (p.x - p.prevX) * p.sparkLength,
                p.prevY + (p.y - p.prevY) * p.sparkLength
            );
            ctx.stroke();

            // small core point at the end
            ctx.globalAlpha = alpha;

            if (!IS_MOBILE) {
                ctx.shadowBlur = p.heavy ? 13 : 10;
                ctx.shadowColor = p.color;
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (p.ignition ? 0.65 : 0.85), 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();

            return p.life > 0;
        });

        ctx.globalAlpha = 1;
        ctx.restore();
    }

    function animate(now = performance.now()) {
        const deltaTime = now - lastFrameTime;
        lastFrameTime = now;

        // 16.67ms = 60 FPS baseline.
        // Cap at 2 so big lag spikes do not teleport the animation too hard.
        deltaMultiplier = Math.min(deltaTime / 16.67, 2);

        ctx.clearRect(0, 0, card.offsetWidth, card.offsetHeight);

        updateRockets();
        updateFlashes();
        updateSmoke();
        drawFlashes();
        updateParticles();

        if (rockets.length || particles.length || flashes.length || smoke.length || hoverActive) {
            requestAnimationFrame(animate);
        } else {
            animating = false;
            lastFrameTime = performance.now();
        }
    }

    function startCelebration() {
        if (new Date() > celebrationEndDate) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        if (hoverActive) return;

        hoverActive = true;
        ensureAnimating();

        hoverTimeout = setTimeout(() => {
            if (!hoverActive) return;

            tryCreateRocket();

            fireworkInterval = setInterval(() => {
                tryCreateRocket();
            }, random(ROCKET_INTERVAL_MIN, ROCKET_INTERVAL_MAX));
        }, IS_MOBILE ? 500 : 1200);
    }

    function stopCelebration() {
        hoverActive = false;

        clearTimeout(hoverTimeout);
        clearInterval(fireworkInterval);

        hoverTimeout = null;
        fireworkInterval = null;

        activeRocketCycles = Math.min(activeRocketCycles, MAX_ROCKETS);
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Desktop: hover only
    if (!IS_MOBILE) {
        card.addEventListener("mouseenter", startCelebration);
        card.addEventListener("mouseleave", stopCelebration);
    }

    // Mobile: only real click/tap on the card,
    if (IS_MOBILE) {
        card.addEventListener("click", () => {
            if (hoverActive) {
                stopCelebration();
            } else {
                startCelebration();
            }
        });
    }
}
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

    const celebrationEndDate = new Date("2026-12-31");

    // Physic Constants
    const GRAVITY_ROCKET = 0.038;
    const GRAVITY_PARTICLE = 0.035;
    const DRAG = 0.986;

    const TRAIL_LENGTH = 20;

    const SMOKE_DECAY = 0.0018;
    const MAX_SMOKE = 70;

    function resizeCanvas() {
        canvas.width = card.offsetWidth;
        canvas.height = card.offsetHeight;
    }

    function random(min, max) {
        return Math.random() * (max - min) + min;
    }

    function randomColor() {
        const colors = ["#ffd700", "#ff9f1c", "#ffffff", "#4dabf7", "#b197fc", "#ff6b6b"];
        return colors[Math.floor(random(0, colors.length))];
    }

    function ensureAnimating() {
        if (!animating) {
            animating = true;
            animate();
        }
    }

    function createRocket() {
        const startX = random(50, canvas.width - 50);
        const startY = canvas.height + 12;

        const type = Math.floor(random(0, 4)); // 0 straight, 1 arc, 2 spiral, 3 random angle
        let targetX = startX;
        let targetY = random(canvas.height * 0.15, canvas.height * 0.5);

        switch (type) {
            case 0: // Straight up
            targetX = startX + random(-15, 15);
            break;

        case 1: // Side arc / parabola
            targetX = random(canvas.width * 0.2, canvas.width * 0.85);
            break;

        case 2: // Spiral
            targetX = startX;
            break;

        case 3: // Random angle
            targetX = startX + random(-canvas.width * 0.25, canvas.width * 0.25);
            break;

        default: // Random Angle
            targetX = startX + random(-canvas.width * 0.3, canvas.width * 0.3);
            break;
        }
        targetX = Math.max(30, Math.min(canvas.width - 30, targetX));

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
            trail: []
        });

        ensureAnimating();
    }

    function spawnSmoke(x, y, size, life = 1) {
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

    function explode(x, y, color) {
        flashes.push({
            x,
            y,
            life: 1,
            radius: random(90, 150),
            color
        });

        const count = Math.floor(random(65, 105));

        for (let i = 0; i < count; i++) {
            const angle = random(0, Math.PI * 2);
            const speed = Math.sqrt(Math.random()) * random(1.0, 3.0);

            particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: random(0.003, 0.007),
                color,
                size: random(1, 2.3),
                flickerPhase: random(0, Math.PI * 2)
            });
        }

        for (let i = 0; i < Math.floor(random(7, 12)); i++) {
            spawnSmoke(
                x + random(-12, 12),
                y + random(-12, 12),
                random(10, 22),
                random(0.65, 1)
            );
        }
    }

    function drawRocketTrail(rocket) {
        rocket.trail.push({ x: rocket.x, y: rocket.y });

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
            ctx.shadowBlur = 7 * t;
            ctx.shadowColor = rocket.color;
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(rocket.x, rocket.y, 2.2, 0, Math.PI * 2);
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = "#ffffff";
        ctx.shadowBlur = 16;
        ctx.shadowColor = rocket.color;
        ctx.fill();

        ctx.restore();

        if (Math.random() < 0.08) {
            spawnSmoke(rocket.x, rocket.y, random(4, 7), random(0.35, 0.55));
        }
    }

    function updateRockets() {
        rockets = rockets.filter((rocket) => {
            rocket.t += 0.9;

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
                return false;
            }

            return true;
        });
    }

    function updateFlashes() {
        flashes = flashes.filter((flash) => {
            flash.life -= 0.045;
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
        smoke = smoke.filter((s) => {
            s.vx += random(-0.01, 0.01);
            s.vy += random(-0.008, 0.008);

            s.vx *= 0.985;
            s.vy *= 0.985;

            s.x += s.vx;
            s.y += s.vy;
            s.size += s.growth * s.life;
            s.life -= SMOKE_DECAY;

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

            const grad = ctx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, radius);
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

        particles = particles.filter((p) => {
            p.vx *= DRAG;
            p.vy = p.vy * DRAG + GRAVITY_PARTICLE;

            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;

            const twinkle = 0.65 + 0.35 * Math.sin(p.flickerPhase + p.life * 24);
            const alpha = Math.max(p.life, 0) * twinkle;

            ctx.globalAlpha = alpha * 0.25;
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 3.2, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();

            ctx.globalAlpha = alpha;
            ctx.shadowBlur = 12;
            ctx.shadowColor = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();

            return p.life > 0;
        });

        ctx.globalAlpha = 1;
        ctx.restore();
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        updateRockets();
        updateFlashes();

        updateSmoke();
        drawFlashes();
        updateParticles();

        if (rockets.length || particles.length || flashes.length || smoke.length || hoverActive) {
            requestAnimationFrame(animate);
        } else {
            animating = false;
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

            createRocket();

            fireworkInterval = setInterval(() => {
                if (hoverActive) {
                    createRocket();
                }
            }, random(1500, 2300));
        }, 1200);
    }

    function stopCelebration() {
        hoverActive = false;

        clearTimeout(hoverTimeout);
        clearInterval(fireworkInterval);

        hoverTimeout = null;
        fireworkInterval = null;
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    card.addEventListener("mouseenter", startCelebration);
    card.addEventListener("mouseleave", stopCelebration);
}
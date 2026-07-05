const card = document.getElementById("competition-card");
const canvas = document.getElementById("competition-fireworks");

if (card && canvas) {
    const ctx = canvas.getContext("2d");

    let rockets = [];
    let particles = [];

    let hoverActive = false;
    let hoverTimeout = null;
    let fireworkInterval = null;

    const celebrationEndDate = new Date("2026-12-31");

    function resizeCanvas() {
        canvas.width = card.offsetWidth;
        canvas.height = card.offsetHeight;
    }

    function random(min, max) {
        return Math.random() * (max - min) + min;
    }

    function randomColor() {
        const colors = ["#ffd700", "#ff9f1c", "#ffffff", "#4dabf7", "#b197fc"];
        return colors[Math.floor(random(0, colors.length))];
    }

    function createRocket() {
        const startX = random(40, canvas.width - 40);
        const startY = canvas.height + 10;

        const targetX = random(canvas.width * 0.2, canvas.width * 0.85);
        const targetY = random(canvas.height * 0.12, canvas.height * 0.55);

        rockets.push({
            x: startX,
            y: startY,
            prevX: startX,
            prevY: startY,
            startX,
            startY,
            targetX,
            targetY,
            progress: 0,
            speed: random(0.008, 0.014),
            type: Math.floor(random(0, 4)),
            color: randomColor()
        });
    }

    function explode(x, y, color) {
        const count = Math.floor(random(28, 45));

        for (let i = 0; i < count; i++) {
            const angle = random(0, Math.PI * 2);
            const speed = random(1.5, 4);

            particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                color,
                size: random(1, 2.5)
            });
        }
    }

    function drawRocketTrail(rocket) {
        const trailLength = 28;

        const dx = rocket.x - rocket.prevX;
        const dy = rocket.y - rocket.prevY;

        const angle = Math.atan2(dy, dx);

        const tailX = rocket.x - Math.cos(angle) * trailLength;
        const tailY = rocket.y - Math.sin(angle) * trailLength;

        const gradient = ctx.createLinearGradient(tailX, tailY, rocket.x, rocket.y);
        gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
        gradient.addColorStop(1, rocket.color);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(rocket.x, rocket.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    function updateRockets() {
        rockets = rockets.filter((rocket) => {
            rocket.prevX = rocket.x;
            rocket.prevY = rocket.y;

            rocket.progress += rocket.speed;
            const t = rocket.progress;

            if (rocket.type === 0) {
                rocket.x = rocket.startX + (rocket.targetX - rocket.startX) * t;
                rocket.y = rocket.startY + (rocket.targetY - rocket.startY) * t;
            } else if (rocket.type === 1) {
                rocket.x = rocket.startX + (rocket.targetX - rocket.startX) * t;
                rocket.y =
                    rocket.startY +
                    (rocket.targetY - rocket.startY) * t -
                    Math.sin(t * Math.PI) * 80;
            } else if (rocket.type === 2) {
                rocket.x = rocket.startX + Math.sin(t * 18) * 18;
                rocket.y = rocket.startY + (rocket.targetY - rocket.startY) * t;
            } else {
                rocket.x =
                    rocket.startX +
                    (rocket.targetX - rocket.startX) * t +
                    Math.sin(t * 10) * 40;
                rocket.y = rocket.startY + (rocket.targetY - rocket.startY) * t;
            }

            drawRocketTrail(rocket);

            ctx.beginPath();
            ctx.arc(rocket.x, rocket.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = rocket.color;
            ctx.fill();

            if (rocket.progress >= 1) {
                explode(rocket.x, rocket.y, rocket.color);
                return false;
            }

            return true;
        });
    }

    function updateParticles() {
        particles = particles.filter((particle) => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.03;
            particle.life -= 0.018;

            ctx.globalAlpha = Math.max(particle.life, 0);
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = particle.color;
            ctx.fill();
            ctx.globalAlpha = 1;

            return particle.life > 0;
        });
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        updateRockets();
        updateParticles();

        requestAnimationFrame(animate);
    }

    function startCelebration() {
        if (new Date() > celebrationEndDate) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        if (hoverActive) return;

        hoverActive = true;

        hoverTimeout = setTimeout(() => {
            if (!hoverActive) return;

            createRocket();

            fireworkInterval = setInterval(() => {
                if (hoverActive) {
                    createRocket();
                }
            }, random(1200, 1800));
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

    animate();
}
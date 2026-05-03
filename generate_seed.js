const fs = require('fs');

const variantId = 'hero_a_001';
const contentJson = JSON.stringify({
  html: `<div class="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 font-sans relative overflow-hidden"><div id="bg-canvas" class="absolute inset-0 z-0"></div><div class="z-10 text-center max-w-3xl flex flex-col gap-6 items-center"><div class="px-3 py-1 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-mono tracking-widest uppercase mb-4 shadow-[0_0_15px_rgba(16,185,129,0.2)]">Autonomous Entity Online</div><h1 class="text-5xl md:text-7xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white to-neutral-500">This Interface Improves Itself.</h1><p class="text-xl text-neutral-400 font-light leading-relaxed">A self-optimizing digital environment. It mutates its own code, measures your reaction, and evolves into forms you never expected.</p><div class="flex gap-4 mt-8"><button class="px-8 py-4 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.2)]">Interact to Mutate</button><a href="/insights" class="px-8 py-4 bg-neutral-900 border border-neutral-800 text-white font-bold rounded-full hover:bg-neutral-800 transition-colors">View Telemetry</a></div><div class="mt-16 w-full text-left"><p class="text-sm text-neutral-500 mb-2">Speak to the machine (your input drives the next mutation):</p><textarea id="human-whisper" rows="3" class="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-mono text-sm placeholder:text-neutral-700" placeholder="e.g. Make it look like a 90s terminal..."></textarea></div></div></div>`,
  css: "body { background: black; margin: 0; overflow-x: hidden; }",
  js: `const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); renderer.setSize(window.innerWidth, window.innerHeight); document.getElementById('bg-canvas').appendChild(renderer.domElement); const geometry = new THREE.BufferGeometry(); const vertices = []; for (let i = 0; i < 5000; i++) { vertices.push( THREE.MathUtils.randFloatSpread(2000), THREE.MathUtils.randFloatSpread(2000), THREE.MathUtils.randFloatSpread(2000) ); } geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); const material = new THREE.PointsMaterial({ color: 0x888888, size: 2, transparent: true, opacity: 0.5 }); const points = new THREE.Points(geometry, material); scene.add(points); camera.position.z = 500; function animate() { requestAnimationFrame(animate); points.rotation.x += 0.0005; points.rotation.y += 0.0005; renderer.render(scene, camera); } animate(); window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });`
});

const configJson = JSON.stringify({
  cta_click_rate: 0.45,
  scroll_depth_rate: 0.25,
  normalized_time_on_page: 0.20,
  bounce_rate: -0.10
});

const sql = `
INSERT INTO optimization_configs (id, active_metric_name, score_weights_json, min_visitors_per_variant, min_experiment_days, min_score_improvement, auto_promote_enabled, llm_system_prompt, optimization_goal)
VALUES ('config_001', 'default_score', '${configJson}', 3, 3, 0.10, 0, 'You are an autonomous UX Researcher. Optimize for maximum user engagement, interactivity, and time spent on page.', 'Maximize the time users spend interacting with the application (Verweildauer). Build engaging, sticky content or interactive tools that keep them hooked.');

INSERT INTO variants (id, generation, status, hypothesis, mutation_reason, content_json, created_at)
VALUES ('${variantId}', 1, 'active', 'Initial base variant for the project.', 'Genesis', '${contentJson.replace(/'/g, "''")}', strftime('%s', 'now'));

INSERT INTO research_logs (id, generation, action, observation, hypothesis, mutation, result, decision, metrics_json, timestamp)
VALUES ('log_001', 1, 'seed_database', 'No existing data.', 'Creating an initial variant will start the feedback loop.', 'None', 'Variant hero_a_001 activated.', 'Start data collection.', '{}', strftime('%s', 'now'));
`;

fs.writeFileSync('seed.sql', sql);

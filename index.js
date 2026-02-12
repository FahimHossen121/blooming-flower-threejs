// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Detect mobile device
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

// Optimize renderer for mobile
const renderer = new THREE.WebGLRenderer({ 
    antialias: !isMobile, // Disable antialiasing on mobile for better performance
    alpha: true,
    powerPreference: isMobile ? "default" : "high-performance",
    stencil: false,
    depth: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
// Lower pixel ratio on mobile to improve performance
renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;

// Reduce shadow quality on mobile
if (isMobile) {
    renderer.shadowMap.enabled = false;
}
document.getElementById('container').appendChild(renderer.domElement);

// Simplified lighting for mobile
if (isMobile) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);
    
    const frontLight = new THREE.DirectionalLight(0xffffff, 0.5);
    frontLight.position.set(0, 5, 5);
    scene.add(frontLight);
} else {
    // Add lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
}

// Position camera - adjusted for better flower view
camera.position.set(1.8, 1.2, 1.5);
camera.lookAt(0, 1, 0);

// Variables for animation control
let mixer = null;
let flowerAnimation = null;
let flower = null;

// Load GLB model with progress tracking
const loader = new THREE.GLTFLoader();

// Set up Draco loader for compressed models (skip on very slow connections)
if (!isMobile || navigator.connection?.effectiveType !== '2g') {
    const dracoLoader = new THREE.DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    dracoLoader.setDecoderConfig({ type: 'js' });
    loader.setDRACOLoader(dracoLoader);
}

const loadingScreen = document.getElementById('loading-screen');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');

// Start loading immediately
const loadStartTime = performance.now();

loader.load(
    'assets/flower.glb',
    function (gltf) {
        const loadTime = ((performance.now() - loadStartTime) / 1000).toFixed(2);
        console.log(`Model loaded in ${loadTime}s`);
        flower = gltf.scene;
        
        // Center the model
        const box = new THREE.Box3().setFromObject(flower);
        const center = box.getCenter(new THREE.Vector3());
        flower.position.x = -center.x;
        flower.position.y = -center.y;
        flower.position.z = -center.z;
        
        scene.add(flower);
        
        // Set up animation mixer
        if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(flower);
            flowerAnimation = mixer.clipAction(gltf.animations[0]);
            
            // Set animation to not loop and pause at start
            flowerAnimation.setLoop(THREE.LoopOnce);
            flowerAnimation.clampWhenFinished = true;
            flowerAnimation.play();
            flowerAnimation.paused = true;
            
            console.log('Flower loaded with animation!');
        }
        
        // Optimize materials
        flower.traverse((child) => {
            if (child.isMesh) {
                child.frustumCulled = true;
                if (child.material) {
                    child.material.envMapIntensity = 1;
                    // Further mobile optimizations
                    if (isMobile) {
                        child.material.flatShading = true;
                        child.castShadow = false;
                        child.receiveShadow = false;
                    }
                }
            }
        });
        
        // Hide loading screen
        setTimeout(() => {
            loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }, 300);
    },
    function (xhr) {
        if (xhr.lengthComputable) {
            const percentComplete = Math.min((xhr.loaded / xhr.total * 100), 99).toFixed(0);
            progressFill.style.width = percentComplete + '%';
            progressText.textContent = percentComplete + '%';
        } else {
            // If length not computable, show indeterminate progress
            const loaded = (xhr.loaded / 1024 / 1024).toFixed(2);
            progressText.textContent = `${loaded} MB`;
        }
    },
    function (error) {
        console.error('Error loading model:', error);
        progressText.textContent = 'Error loading model';
        progressFill.style.background = '#ff4444';
    }
);

// Preconnect to CDN for faster loading
const preconnectLink = document.createElement('link');
preconnectLink.rel = 'preconnect';
preconnectLink.href = 'https://www.gstatic.com';
document.head.appendChild(preconnectLink);

// Scroll control
let scrollPercent = 0;

window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    scrollPercent = Math.max(0, Math.min(1, scrollTop / scrollHeight));
    
    // Update animation based on scroll
    if (mixer && flowerAnimation) {
        const duration = flowerAnimation.getClip().duration;
        flowerAnimation.time = scrollPercent * duration;
    }
});

// Animation loop
let lastTime = 0;
const targetFPS = isMobile ? 30 : 60; // Lower FPS on mobile
const frameInterval = 1000 / targetFPS;

function animate(currentTime) {
    requestAnimationFrame(animate);
    
    const deltaTime = currentTime - lastTime;
    
    // Throttle frame rate on mobile
    if (deltaTime < frameInterval && isMobile) {
        return;
    }
    
    lastTime = currentTime;
    
    // Update mixer to apply animation changes
    if (mixer) {
        mixer.update(0);
    }
    
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start animation
animate();
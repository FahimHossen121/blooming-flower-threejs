// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: true,
    powerPreference: "high-performance"
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('container').appendChild(renderer.domElement);

// Add lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 5, 5);
scene.add(light);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

// Position camera - adjusted for better flower view
camera.position.set(1.8, 1.2, 1.5);
camera.lookAt(0, 1, 0);

// Variables for animation control
let mixer = null;
let flowerAnimation = null;
let flower = null;

// Load GLB model with progress tracking
const loader = new THREE.GLTFLoader();
const loadingScreen = document.getElementById('loading-screen');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');

loader.load(
    'assets/flower.glb',
    function (gltf) {
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
        
        // Hide loading screen
        setTimeout(() => {
            loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }, 300);
    },
    function (xhr) {
        const percentComplete = (xhr.loaded / xhr.total * 100).toFixed(0);
        progressFill.style.width = percentComplete + '%';
        progressText.textContent = percentComplete + '%';
        console.log(percentComplete + '% loaded');
    },
    function (error) {
        console.error('Error loading model:', error);
    }
);

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
function animate() {
    requestAnimationFrame(animate);
    
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
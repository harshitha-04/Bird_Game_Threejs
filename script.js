import * as THREE from "https://cdn.jsdelivr.net/npm/three@latest/build/three.module.js";

class BirdGame {
    constructor() {
        this.initializeGame();
        this.setupScene();
        this.createBackground();
        this.createUI();
        this.createBird();
        this.setupLighting();
        this.setupEventListeners();
        this.animate();
    }

    initializeGame() {
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.paused = false;
        this.treats = [];
        this.treatSpeed = 0.05;
        this.lastTreatTime = 0;
        this.treatInterval = 2000;
        this.targetX = 0;
        this.level = 1;
        this.treatsToNextLevel = 10;
        this.treatsCollected = 0;
        this.clouds = [];
    }

    setupScene() {
        this.scene = new THREE.Scene();
        
        // Create sky gradient background
        const topColor = new THREE.Color(0x3284FF);
        const bottomColor = new THREE.Color(0xAFDFFF);
        this.scene.background = new THREE.Color(0x87CEEB);
        
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.z = 5;

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
    }

    createBackground() {
        // Create sky gradient
        const vertexShader = `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize(vWorldPosition).y;
                gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
            }
        `;

        const uniforms = {
            topColor: { value: new THREE.Color(0x0077ff) },
            bottomColor: { value: new THREE.Color(0xafffff) }
        };

        const skyMaterial = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms,
            side: THREE.BackSide
        });

        const sky = new THREE.Mesh(
            new THREE.SphereGeometry(100, 32, 32),
            skyMaterial
        );
        this.scene.add(sky);

        // Create clouds
        this.createClouds();
        
        // Create sun
        const sunGeometry = new THREE.CircleGeometry(5, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff80,
            transparent: true,
            opacity: 0.8
        });
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        sun.position.set(20, 15, -50);
        this.scene.add(sun);
        
        // Add sun glow
        const sunGlowGeometry = new THREE.CircleGeometry(8, 32);
        const sunGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffaa,
            transparent: true,
            opacity: 0.3
        });
        const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
        sunGlow.position.set(20, 15, -51);
        this.scene.add(sunGlow);
    }

    createClouds() {
        const createCloud = () => {
            const cloud = new THREE.Group();
            
            const cloudMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.9,
                roughness: 1,
                metalness: 0
            });
            
            // Create cloud puffs
            const puffCount = 3 + Math.floor(Math.random() * 5);
            for (let i = 0; i < puffCount; i++) {
                const puffSize = 0.5 + Math.random() * 1.5;
                const puff = new THREE.Mesh(
                    new THREE.SphereGeometry(puffSize, 16, 16),
                    cloudMaterial
                );
                
                puff.position.set(
                    (Math.random() - 0.5) * 3,
                    (Math.random() - 0.5) * 1,
                    (Math.random() - 0.5) * 2
                );
                
                cloud.add(puff);
            }
            
            // Position the cloud
            cloud.position.set(
                (Math.random() - 0.5) * 30,
                5 + Math.random() * 10,
                -10 - Math.random() * 20
            );
            
            cloud.scale.set(
                1 + Math.random() * 2,
                0.8 + Math.random() * 0.5,
                1 + Math.random() * 0.5
            );
            
            // Set cloud properties
            cloud.userData = {
                speed: 0.10 + Math.random() * 0.01,
                rotationSpeed: (Math.random() - 0.5) * 0.001
            };
            
            this.scene.add(cloud);
            this.clouds.push(cloud);
        };
        
        // Create initial set of clouds
        for (let i = 0; i < 10; i++) {
            createCloud();
        }
    }

    createUI() {
        // Game status display
        this.gameStatusElement = document.createElement('div');
        Object.assign(this.gameStatusElement.style, {
            position: 'absolute',
            top: '20px',
            left: '20px',
            color: 'white',
            fontSize: '24px',
            fontFamily: 'Arial',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
        });
        document.body.appendChild(this.gameStatusElement);

        // Create pause button
        this.pauseButton = document.createElement('button');
        Object.assign(this.pauseButton.style, {
            position: 'absolute',
            top: '20px',
            right: '20px',
            padding: '10px 20px',
            fontSize: '18px',
            cursor: 'pointer',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
        });
        this.pauseButton.textContent = 'Pause';
        this.pauseButton.onclick = () => this.togglePause();
        document.body.appendChild(this.pauseButton);
        
        // Create game over UI (hidden initially)
        this.gameOverUI = document.createElement('div');
        Object.assign(this.gameOverUI.style, {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.8)',
            padding: '30px',
            borderRadius: '15px',
            color: 'white',
            fontFamily: 'Arial',
            textAlign: 'center',
            display: 'none',
            zIndex: '1000',
            boxShadow: '0 0 20px rgba(255,255,255,0.3)'
        });
        document.body.appendChild(this.gameOverUI);
    }

    createBird() {
        this.bird = new THREE.Group();
        
        // Materials
        this.bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xffdd00,
            metalness: 0.3,
            roughness: 0.9
        });

        // Body
        const body = new THREE.Mesh(
            new THREE.SphereGeometry(1, 32, 32),
            this.bodyMaterial
        );
        this.bird.add(body);

        // Wings
        const wingGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        this.wings = {
            left: new THREE.Mesh(wingGeometry, this.bodyMaterial),
            right: new THREE.Mesh(wingGeometry, this.bodyMaterial)
        };

        this.wings.left.position.set(-1, 0.2, 0);
        this.wings.left.scale.set(1.2, 0.6, 1);
        this.wings.right.position.set(1, 0.2, 0);
        this.wings.right.scale.set(1.2, 0.6, 1);

        this.bird.add(this.wings.left, this.wings.right);

        // Eyes
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0.3,
            roughness: 0.5
        });
        const pupilMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            metalness: 0.3,
            roughness: 0.5
        });

        const createEye = (x) => {
            const eye = new THREE.Mesh(
                new THREE.SphereGeometry(0.2, 32, 32),
                eyeMaterial
            );
            const pupil = new THREE.Mesh(
                new THREE.SphereGeometry(0.15, 32, 32),
                pupilMaterial
            );
            eye.position.set(x, 0.4, 0.8);
            pupil.position.set(x, 0.4, 0.9);
            this.bird.add(eye, pupil);
        };

        createEye(-0.3);
        createEye(0.3);

        // Beak
        const beak = new THREE.Mesh(
            new THREE.ConeGeometry(0.2, 0.5, 32),
            new THREE.MeshStandardMaterial({
                color: 0xff6600,
                metalness: 0.3,
                roughness: 0.9
            })
        );
        beak.position.set(0, 0.1, 1);
        beak.rotation.x = Math.PI / 2;
        this.bird.add(beak);

        // Tail
        const tail = new THREE.Mesh(
            new THREE.ConeGeometry(0.4, 0.8, 32),
            this.bodyMaterial
        );
        tail.position.set(0, -0.5, -1);
        tail.rotation.x = -Math.PI / 4;
        this.bird.add(tail);

        this.scene.add(this.bird);
    }

    setupLighting() {
        const pointLight = new THREE.PointLight(0xffffff, 5, 100);
        pointLight.position.set(5, 5, 5);
        this.scene.add(pointLight);

        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        this.scene.add(ambientLight);
        
        // Add directional sunlight
        const sunLight = new THREE.DirectionalLight(0xffffcc, 0.8);
        sunLight.position.set(20, 15, -5);
        this.scene.add(sunLight);
    }

    createTreat() {
        const treatGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const color = this.level > 2 ? 
            new THREE.Color().setHSL(Math.random(), 1, 0.5) :
            new THREE.Color(Math.random() > 0.5 ? 0xff0000 : 0x00ff00);

        const treatMaterial = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.3,
            roughness: 0.8,
            emissive: color,
            emissiveIntensity: 0.5
        });

        const treat = new THREE.Mesh(treatGeometry, treatMaterial);
        treat.position.set(
            (Math.random() - 0.5) * 10,
            8,
            0
        );
        
        // Add sparkle effect
        const sparkle = new THREE.PointLight(color, 1, 1);
        treat.add(sparkle);
        
        this.scene.add(treat);
        this.treats.push(treat);
    }

    setupEventListeners() {
        document.addEventListener('mousemove', (event) => {
            this.targetX = (event.clientX / window.innerWidth) * 10 - 5;
        });

        window.addEventListener('resize', () => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        });

        // Touch support for mobile
        document.addEventListener('touchmove', (event) => {
            event.preventDefault();
            this.targetX = (event.touches[0].clientX / window.innerWidth) * 10 - 5;
        }, { passive: false });
    }

    updateGameStatus() {
        this.gameStatusElement.innerHTML = `
            Score: ${this.score}<br>
            Lives: ${'❤'.repeat(this.lives)}<br>
            Level: ${this.level}
        `;
    }

    togglePause() {
        this.paused = !this.paused;
        this.pauseButton.textContent = this.paused ? 'Resume' : 'Pause';
        this.pauseButton.style.backgroundColor = this.paused ? '#f44336' : '#4CAF50';
        
        if (!this.paused) {
            this.animate();
        }
    }

    checkLevelProgress() {
        if (this.treatsCollected >= this.treatsToNextLevel) {
            this.level++;
            this.treatsCollected = 0;
            this.treatSpeed += 0.02;
            this.treatInterval = Math.max(500, this.treatInterval - 200);
            
            // Visual feedback for level up
            this.bodyMaterial.color.setHSL(Math.random(), 1, 0.5);
            
            // Level up animation/notification
            this.showLevelUpMessage();
        }
    }
    
    showLevelUpMessage() {
        const levelUpMsg = document.createElement('div');
        Object.assign(levelUpMsg.style, {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'gold',
            fontSize: '32px',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
            textShadow: '0 0 10px rgba(255,215,0,0.7)',
            zIndex: '100',
            opacity: '0',
            transition: 'opacity 0.5s ease-in-out'
        });
        levelUpMsg.textContent = `LEVEL UP! Level ${this.level}`;
        document.body.appendChild(levelUpMsg);
        
        // Animation
        setTimeout(() => {
            levelUpMsg.style.opacity = '1';
        }, 10);
        
        setTimeout(() => {
            levelUpMsg.style.opacity = '0';
        }, 2000);
        
        setTimeout(() => {
            document.body.removeChild(levelUpMsg);
        }, 2500);
    }

    gameOverSequence() {
        this.gameOver = true;
        
        // Dramatic slow-motion effect
        this.treatSpeed = 0.01;
        
        // Show game over UI
        this.gameOverUI.style.display = 'block';
        this.gameOverUI.innerHTML = `
            <h1 style="color: #ff5555; font-size: 42px; margin-bottom: 20px; text-shadow: 0 0 10px rgba(255,0,0,0.5)">GAME OVER</h1>
            <div style="margin: 20px 0;">
                <p style="font-size: 24px; margin: 10px 0;">Final Score: <span style="color: gold; font-weight: bold;">${this.score}</span></p>
                <p style="font-size: 24px; margin: 10px 0;">Level Reached: <span style="color: #5dffbb; font-weight: bold;">${this.level}</span></p>
            </div>
            <div style="margin-top: 30px;">
                <button id="playAgainBtn" style="padding: 15px 30px; font-size: 20px; cursor: pointer; background: linear-gradient(to bottom, #4CAF50, #2E8B57); color: white; border: none; border-radius: 8px; margin-right: 10px; box-shadow: 0 0 10px rgba(76,175,80,0.5);">
                    Play Again
                </button>
                <button id="viewScoreBtn" style="padding: 15px 30px; font-size: 20px; cursor: pointer; background: linear-gradient(to bottom, #3498db, #2980b9); color: white; border: none; border-radius: 8px; box-shadow: 0 0 10px rgba(52,152,219,0.5);">
                    Share Score
                </button>
            </div>
            <p style="margin-top: 20px; font-size: 16px; color: #aaa;">
                Thanks for playing!
            </p>
        `;

        // Add button functionality
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            location.reload();
        });
        
        document.getElementById('viewScoreBtn').addEventListener('click', () => {
            // Could implement sharing functionality here
            alert(`Score: ${this.score} - Level: ${this.level}\nShare your score with friends!`);
        });
        
        // Slow death animation for the bird
        this.bird.userData = {
            deathAnimation: true,
            rotationSpeed: 0.03,
            fallSpeed: 0.05
        };
    }

    updateClouds() {
        for (let i = 0; i < this.clouds.length; i++) {
            const cloud = this.clouds[i];
            
            // Move clouds horizontally
            cloud.position.x += cloud.userData.speed;
            
            // Slight rotation
            cloud.rotation.y += cloud.userData.rotationSpeed;
            
            // Reset cloud position when it goes off screen
            if (cloud.position.x > 30) {
                cloud.position.x = -30;
                cloud.position.y = 5 + Math.random() * 10;
                cloud.position.z = -10 - Math.random() * 20;
            }
        }
    }

    animate() {
        if (this.paused) return;
        requestAnimationFrame(() => this.animate());

        // Update clouds regardless of game state
        this.updateClouds();

        if (this.gameOver) {
            // Game over animation
            if (this.bird.userData.deathAnimation) {
                this.bird.rotation.z += this.bird.userData.rotationSpeed;
                this.bird.position.y -= this.bird.userData.fallSpeed;
                
                // Slow down fall as bird goes down
                this.bird.userData.fallSpeed *= 0.99;
                
                if (this.bird.position.y < -5) {
                    this.bird.userData.deathAnimation = false;
                }
            }
        } else {
            // Bird movement and animation
            this.bird.position.x += (this.targetX - this.bird.position.x) * 0.05;
            this.bird.rotation.y = Math.sin(Date.now() * 0.002) * 0.1;
            this.wings.left.rotation.z = Math.sin(Date.now() * 0.01) * 0.2 - 0.1;
            this.wings.right.rotation.z = -Math.sin(Date.now() * 0.01) * 0.2 + 0.1;

            // Add slight bobbing motion
            this.bird.position.y = Math.sin(Date.now() * 0.003) * 0.1;

            // Create new treats
            if (Date.now() - this.lastTreatTime > this.treatInterval) {
                this.createTreat();
                this.lastTreatTime = Date.now();
            }

            // Update treats
            for (let i = this.treats.length - 1; i >= 0; i--) {
                const treat = this.treats[i];
                treat.position.y -= this.treatSpeed;
                treat.rotation.y += 0.02; // Rotate treats

                // Collision detection
                if (treat.position.distanceTo(this.bird.position) < 1.5) {
                    // Collect treat animation
                    this.collectTreatEffect(treat.position.clone());
                    
                    this.scene.remove(treat);
                    this.treats.splice(i, 1);
                    this.score += 10;
                    this.treatsCollected++;
                    this.checkLevelProgress();
                } else if (treat.position.y < -5) {
                    this.scene.remove(treat);
                    this.treats.splice(i, 1);
                    this.lives--;
                    
                    if (this.lives <= 0) {
                        this.gameOverSequence();
                    } else {
                        // Visual feedback for losing a life
                        this.showLifeLostEffect();
                    }
                }
            }

            this.updateGameStatus();
        }

        this.renderer.render(this.scene, this.camera);
    }
    
    collectTreatEffect(position) {
        // Create +10 floating text
        const scoreText = document.createElement('div');
        Object.assign(scoreText.style, {
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#4cff4c',
            fontSize: '24px',
            fontWeight: 'bold',
            textShadow: '0 0 5px rgba(0,255,0,0.5)',
            pointerEvents: 'none',
            zIndex: '1000',
            fontFamily: 'Arial, sans-serif',
            transition: 'transform 1s ease-out, opacity 1s ease-out'
        });
        scoreText.textContent = '+10';
        document.body.appendChild(scoreText);
        
        // Convert 3D position to screen position
        const vector = position.project(this.camera);
        const x = (vector.x + 1) / 2 * window.innerWidth;
        const y = -(vector.y - 1) / 2 * window.innerHeight;
        
        scoreText.style.left = `${x}px`;
        scoreText.style.top = `${y}px`;
        
        // Animate and remove
        setTimeout(() => {
            scoreText.style.transform = 'translate(-50%, -100px)';
            scoreText.style.opacity = '0';
        }, 10);
        
        setTimeout(() => {
            document.body.removeChild(scoreText);
        }, 1000);
    }
    
    showLifeLostEffect() {
        // Flash screen red
        const flash = document.createElement('div');
        Object.assign(flash.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(255,0,0,0.3)',
            pointerEvents: 'none',
            zIndex: '100',
            transition: 'opacity 0.5s ease-out'
        });
        document.body.appendChild(flash);
        
        setTimeout(() => {
            flash.style.opacity = '0';
        }, 100);
        
        setTimeout(() => {
            document.body.removeChild(flash);
        }, 600);
    }
}

// Start the game
new BirdGame();

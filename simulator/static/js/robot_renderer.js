/**
 * Kuka Robot 3D Renderer using Three.js
 * Visualizes the robot arm, game board, and motion sequences
 */

class RobotRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        // Robot parts
        this.robotBase = null;
        this.robotArm = null;
        this.robotForearm = null;
        this.robotWrist = null;
        this.gripper = null;
        this.gripperOpen = true;

        // Game elements
        this.boardGroup = null;
        this.pieces = [];
        this.storageRed = [];
        this.storageBlue = [];

        // Animation
        this.animationId = null;
        this.motionQueue = [];
        this.currentMotion = null;
        this.motionProgress = 0;
        this.playbackSpeed = 1;
        this.isPaused = false;
        this.progressCallback = null;

        // Grid
        this.gridHelper = null;
        this.showGrid = true;

        // Scale factor (mm to scene units)
        this.scale = 0.01;
    }

    async init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0d0d12);

        // Add fog for depth
        this.scene.fog = new THREE.Fog(0x0d0d12, 5, 20);

        // Camera
        const container = this.canvas.parentElement;
        const aspect = container.clientWidth / container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
        this.camera.position.set(4, 4, 6);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Lighting
        this.setupLighting();

        // Grid
        this.createGrid();

        // Ground
        this.createGround();

        // Robot
        this.createRobot();

        // Game board
        this.createGameBoard();

        // Storage areas
        this.createStorageAreas();

        // Start animation loop
        this.animate();

        // Handle resize
        window.addEventListener('resize', () => this.onResize());

        // Simple orbit controls (manual implementation)
        this.setupControls();

        return this;
    }

    setupLighting() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0x404060, 0.5);
        this.scene.add(ambient);

        // Main directional light
        const mainLight = new THREE.DirectionalLight(0xffffff, 1);
        mainLight.position.set(5, 10, 5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 50;
        mainLight.shadow.camera.left = -10;
        mainLight.shadow.camera.right = 10;
        mainLight.shadow.camera.top = 10;
        mainLight.shadow.camera.bottom = -10;
        this.scene.add(mainLight);

        // Accent lights
        const accentLight1 = new THREE.PointLight(0x00d4ff, 0.5, 10);
        accentLight1.position.set(-3, 2, 3);
        this.scene.add(accentLight1);

        const accentLight2 = new THREE.PointLight(0x7c3aed, 0.3, 10);
        accentLight2.position.set(3, 2, -3);
        this.scene.add(accentLight2);
    }

    createGrid() {
        this.gridHelper = new THREE.GridHelper(10, 20, 0x303040, 0x202030);
        this.gridHelper.position.y = -0.01;
        this.scene.add(this.gridHelper);
    }

    createGround() {
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x15151f,
            metalness: 0.3,
            roughness: 0.8
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    createRobot() {
        // Robot group
        const robotGroup = new THREE.Group();
        robotGroup.position.set(0, 0, 0);

        // Materials
        const orangeMaterial = new THREE.MeshStandardMaterial({
            color: 0xff6b00,
            metalness: 0.3,
            roughness: 0.4
        });

        const darkMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            metalness: 0.5,
            roughness: 0.3
        });

        const accentMaterial = new THREE.MeshStandardMaterial({
            color: 0x00d4ff,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0x00d4ff,
            emissiveIntensity: 0.2
        });

        // Base
        const baseGeometry = new THREE.CylinderGeometry(0.3, 0.35, 0.2, 32);
        this.robotBase = new THREE.Mesh(baseGeometry, darkMaterial);
        this.robotBase.position.y = 0.1;
        this.robotBase.castShadow = true;
        robotGroup.add(this.robotBase);

        // Tower
        const towerGeometry = new THREE.BoxGeometry(0.25, 0.8, 0.25);
        const tower = new THREE.Mesh(towerGeometry, orangeMaterial);
        tower.position.y = 0.6;
        tower.castShadow = true;
        robotGroup.add(tower);

        // Shoulder joint
        const shoulderGeometry = new THREE.SphereGeometry(0.15, 16, 16);
        const shoulder = new THREE.Mesh(shoulderGeometry, accentMaterial);
        shoulder.position.y = 1.0;
        robotGroup.add(shoulder);

        // Upper arm
        this.robotArm = new THREE.Group();
        this.robotArm.position.set(0, 1.0, 0);

        const upperArmGeometry = new THREE.BoxGeometry(0.12, 0.6, 0.12);
        const upperArm = new THREE.Mesh(upperArmGeometry, orangeMaterial);
        upperArm.position.set(0, 0.3, 0);
        upperArm.castShadow = true;
        this.robotArm.add(upperArm);

        // Elbow
        const elbowGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const elbow = new THREE.Mesh(elbowGeometry, accentMaterial);
        elbow.position.set(0, 0.6, 0);
        this.robotArm.add(elbow);

        robotGroup.add(this.robotArm);

        // Forearm
        this.robotForearm = new THREE.Group();
        this.robotForearm.position.set(0, 0.6, 0);

        const forearmGeometry = new THREE.BoxGeometry(0.1, 0.5, 0.1);
        const forearm = new THREE.Mesh(forearmGeometry, orangeMaterial);
        forearm.position.set(0, 0.25, 0);
        forearm.castShadow = true;
        this.robotForearm.add(forearm);

        this.robotArm.add(this.robotForearm);

        // Wrist
        this.robotWrist = new THREE.Group();
        this.robotWrist.position.set(0, 0.5, 0);

        const wristGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.1, 16);
        const wrist = new THREE.Mesh(wristGeometry, darkMaterial);
        this.robotWrist.add(wrist);

        this.robotForearm.add(this.robotWrist);

        // Gripper
        this.gripper = new THREE.Group();
        this.gripper.position.set(0, -0.1, 0);

        const gripperBaseGeometry = new THREE.BoxGeometry(0.08, 0.06, 0.08);
        const gripperBase = new THREE.Mesh(gripperBaseGeometry, darkMaterial);
        this.gripper.add(gripperBase);

        // Gripper fingers
        const fingerGeometry = new THREE.BoxGeometry(0.02, 0.1, 0.02);
        this.leftFinger = new THREE.Mesh(fingerGeometry, accentMaterial);
        this.leftFinger.position.set(-0.03, -0.05, 0);
        this.gripper.add(this.leftFinger);

        this.rightFinger = new THREE.Mesh(fingerGeometry, accentMaterial);
        this.rightFinger.position.set(0.03, -0.05, 0);
        this.gripper.add(this.rightFinger);

        this.robotWrist.add(this.gripper);

        this.scene.add(robotGroup);
        this.robotGroup = robotGroup;

        // Set initial position
        this.moveRobotTo({ x: 200, y: 0, z: 300 });
    }

    createGameBoard() {
        this.boardGroup = new THREE.Group();
        // Center the board between storage trays, in front of robot
        this.boardGroup.position.set(1.2, 0, 1.0);

        // Board base - scaled appropriately for game
        const boardWidth = 6 * 0.28; // 6 columns
        const boardDepth = 4 * 0.2;  // 4 rows
        const boardGeometry = new THREE.BoxGeometry(boardWidth, 0.05, boardDepth);
        const boardMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a35,
            metalness: 0.2,
            roughness: 0.7
        });
        const board = new THREE.Mesh(boardGeometry, boardMaterial);
        board.position.y = 0.025;
        board.receiveShadow = true;
        board.castShadow = true;
        this.boardGroup.add(board);

        // Create cell markers (holes for pieces)
        const cellMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a25,
            metalness: 0.1,
            roughness: 0.9
        });

        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 6; c++) {
                const cellGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.03, 16);
                const cell = new THREE.Mesh(cellGeometry, cellMaterial);
                cell.position.set(
                    (c - 2.5) * 0.28,
                    0.055,
                    -(r - 1.5) * 0.2  // Negative for proper orientation
                );
                cell.receiveShadow = true;
                this.boardGroup.add(cell);
            }
        }

        // Add column indicators
        for (let c = 0; c < 6; c++) {
            const indicatorGeometry = new THREE.BoxGeometry(0.05, 0.02, 0.05);
            const indicatorMaterial = new THREE.MeshStandardMaterial({
                color: 0x00d4ff,
                emissive: 0x00d4ff,
                emissiveIntensity: 0.3
            });
            const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
            indicator.position.set(
                (c - 2.5) * 0.28,
                0.08,
                -(1.5 * 0.2) - 0.15  // In front of board
            );
            this.boardGroup.add(indicator);
        }

        this.scene.add(this.boardGroup);

        // Initialize pieces array
        this.pieces = [];
        for (let r = 0; r < 4; r++) {
            this.pieces[r] = [];
            for (let c = 0; c < 6; c++) {
                this.pieces[r][c] = null;
            }
        }
    }

    createStorageAreas() {
        // Magazine positions match the original KRL positions
        // XP_MAG_RED and XP_MAG_BLUE are at different Y positions

        // Red Magazine (left back)
        const redMagGroup = new THREE.Group();
        // Position based on actual coordinates from KRL
        redMagGroup.position.set(-2.3, 0, -3.6);

        // Magazine structure - vertical stack
        const magBoxGeometry = new THREE.BoxGeometry(0.3, 0.4, 0.3);
        const magMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a3a45,
            metalness: 0.4,
            roughness: 0.6
        });

        const redMagBox = new THREE.Mesh(magBoxGeometry, magMaterial);
        redMagBox.position.y = 0.2;
        redMagBox.castShadow = true;
        redMagBox.receiveShadow = true;
        redMagGroup.add(redMagBox);

        // Red indicator strip
        const stripGeometry = new THREE.BoxGeometry(0.32, 0.05, 0.32);
        const redStripMaterial = new THREE.MeshStandardMaterial({
            color: 0xff4757,
            emissive: 0xff4757,
            emissiveIntensity: 0.4,
            metalness: 0.3,
            roughness: 0.4
        });
        const redStrip = new THREE.Mesh(stripGeometry, redStripMaterial);
        redStrip.position.y = 0.42;
        redMagGroup.add(redStrip);

        // Label
        this.createLabel('RED', redMagGroup, 0xff4757, 0, 0.5, 0);

        this.scene.add(redMagGroup);

        // Blue Magazine (right back)
        const blueMagGroup = new THREE.Group();
        blueMagGroup.position.set(5.7, 0, -3.6);

        const blueMagBox = new THREE.Mesh(magBoxGeometry, magMaterial);
        blueMagBox.position.y = 0.2;
        blueMagBox.castShadow = true;
        blueMagBox.receiveShadow = true;
        blueMagGroup.add(blueMagBox);

        // Blue indicator strip
        const blueStripMaterial = new THREE.MeshStandardMaterial({
            color: 0x3498ff,
            emissive: 0x3498ff,
            emissiveIntensity: 0.4,
            metalness: 0.3,
            roughness: 0.4
        });
        const blueStrip = new THREE.Mesh(stripGeometry, blueStripMaterial);
        blueStrip.position.y = 0.42;
        blueMagGroup.add(blueStrip);

        // Label
        this.createLabel('BLUE', blueMagGroup, 0x3498ff, 0, 0.5, 0);

        this.scene.add(blueMagGroup);

        // Temporary storage areas (where pieces wait before being placed)
        // Red storage tray (left side)
        const redStorageGroup = new THREE.Group();
        redStorageGroup.position.set(0.2, 0, 0.4);

        const trayGeometry = new THREE.BoxGeometry(0.6, 0.03, 0.5);
        const trayMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a35,
            metalness: 0.2,
            roughness: 0.8
        });

        const redTray = new THREE.Mesh(trayGeometry, trayMaterial);
        redTray.position.y = 0.015;
        redTray.receiveShadow = true;
        redStorageGroup.add(redTray);

        // Red border
        const borderMaterial = new THREE.MeshStandardMaterial({
            color: 0xff4757,
            emissive: 0xff4757,
            emissiveIntensity: 0.2
        });
        const borderGeometry = new THREE.BoxGeometry(0.62, 0.02, 0.52);
        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        border.position.y = 0.04;
        redStorageGroup.add(border);

        this.scene.add(redStorageGroup);

        // Blue storage tray (right side)
        const blueStorageGroup = new THREE.Group();
        blueStorageGroup.position.set(2.2, 0, 0.4);

        const blueTray = new THREE.Mesh(trayGeometry, trayMaterial);
        blueTray.position.y = 0.015;
        blueTray.receiveShadow = true;
        blueStorageGroup.add(blueTray);

        // Blue border
        const blueBorderMaterial = new THREE.MeshStandardMaterial({
            color: 0x3498ff,
            emissive: 0x3498ff,
            emissiveIntensity: 0.2
        });
        const blueBorder = new THREE.Mesh(borderGeometry, blueBorderMaterial);
        blueBorder.position.y = 0.04;
        blueStorageGroup.add(blueBorder);

        this.scene.add(blueStorageGroup);

        // Create initial storage pieces in trays
        this.createStoragePieces();
    }

    createLabel(text, parent, color, x, y, z) {
        // Create a simple 3D text placeholder using boxes
        const labelGeometry = new THREE.BoxGeometry(0.15, 0.03, 0.03);
        const labelMaterial = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.5
        });
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        label.position.set(x, y, z);
        parent.add(label);
    }

    createStoragePieces() {
        // Red pieces in storage tray
        const redMaterial = new THREE.MeshStandardMaterial({
            color: 0xff4757,
            metalness: 0.4,
            roughness: 0.3,
            emissive: 0xff4757,
            emissiveIntensity: 0.1
        });

        // Create pieces in a 2x6 grid in the storage tray
        for (let i = 0; i < 12; i++) {
            const r = Math.floor(i / 6);
            const c = i % 6;
            const piece = this.createPiece(redMaterial);

            // Position in red storage tray
            piece.position.set(
                0.2 + (c - 2.5) * 0.09,
                0.06,
                0.4 + (r - 0.5) * 0.18
            );
            this.scene.add(piece);
            this.storageRed.push(piece);
        }

        // Blue pieces in storage tray
        const blueMaterial = new THREE.MeshStandardMaterial({
            color: 0x3498ff,
            metalness: 0.4,
            roughness: 0.3,
            emissive: 0x3498ff,
            emissiveIntensity: 0.1
        });

        for (let i = 0; i < 12; i++) {
            const r = Math.floor(i / 6);
            const c = i % 6;
            const piece = this.createPiece(blueMaterial);

            // Position in blue storage tray
            piece.position.set(
                2.2 + (c - 2.5) * 0.09,
                0.06,
                0.4 + (r - 0.5) * 0.18
            );
            this.scene.add(piece);
            this.storageBlue.push(piece);
        }
    }

    createPiece(material) {
        const pieceGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.03, 16);
        const piece = new THREE.Mesh(pieceGeometry, material);
        piece.castShadow = true;
        return piece;
    }

    setupControls() {
        // Simple orbit controls
        let isMouseDown = false;
        let lastMouseX = 0;
        let lastMouseY = 0;
        let theta = Math.PI / 4;
        let phi = Math.PI / 4;
        let radius = 8;

        const updateCamera = () => {
            this.camera.position.x = radius * Math.sin(phi) * Math.cos(theta);
            this.camera.position.y = radius * Math.cos(phi);
            this.camera.position.z = radius * Math.sin(phi) * Math.sin(theta);
            this.camera.lookAt(0, 0.5, 0);
        };

        this.canvas.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        });

        this.canvas.addEventListener('mouseup', () => {
            isMouseDown = false;
        });

        this.canvas.addEventListener('mouseleave', () => {
            isMouseDown = false;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (!isMouseDown) return;

            const deltaX = e.clientX - lastMouseX;
            const deltaY = e.clientY - lastMouseY;

            theta += deltaX * 0.01;
            phi = Math.max(0.1, Math.min(Math.PI / 2, phi + deltaY * 0.01));

            updateCamera();

            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            radius = Math.max(4, Math.min(15, radius + e.deltaY * 0.01));
            updateCamera();
        });

        this._resetCameraFn = () => {
            theta = Math.PI / 4;
            phi = Math.PI / 4;
            radius = 8;
            updateCamera();
        };

        updateCamera();
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        // Process motion queue
        if (this.currentMotion && !this.isPaused) {
            this.processMotion();
        }

        // Render
        this.renderer.render(this.scene, this.camera);
    }

    processMotion() {
        if (!this.currentMotion) return;

        const motion = this.currentMotion;
        const duration = (motion.duration || 0.5) / this.playbackSpeed * 1000;
        const elapsed = Date.now() - this.motionStartTime;
        const progress = Math.min(1, elapsed / duration);

        if (motion.type === 'GRIPPER') {
            // Gripper animation
            const openPos = 0.03;
            const closePos = 0.01;
            const targetPos = motion.action === 'open' ? openPos : closePos;
            const currentPos = motion.action === 'open' ? closePos : openPos;
            const pos = currentPos + (targetPos - currentPos) * progress;

            this.leftFinger.position.x = -pos;
            this.rightFinger.position.x = pos;
            this.gripperOpen = motion.action === 'open';
        } else {
            // Movement animation
            const target = motion.target;
            const start = motion.startPos;

            // Interpolate position
            const x = start.x + (target.x - start.x) * this.easeInOut(progress);
            const y = start.y + (target.y - start.y) * this.easeInOut(progress);
            const z = start.z + (target.z - start.z) * this.easeInOut(progress);

            this.moveRobotTo({ x, y, z });
        }

        // Update progress callback
        if (this.progressCallback) {
            const totalMotions = this.totalMotions || 1;
            const currentIndex = this.currentMotionIndex || 0;
            const overallProgress = (currentIndex + progress) / totalMotions;
            this.progressCallback(overallProgress, motion.description);
        }

        // Motion complete
        if (progress >= 1) {
            this.currentMotion = null;
            this.processNextMotion();
        }
    }

    easeInOut(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    processNextMotion() {
        if (this.motionQueue.length === 0) {
            if (this.motionResolve) {
                this.motionResolve();
                this.motionResolve = null;
            }
            return;
        }

        this.currentMotionIndex = (this.currentMotionIndex || 0) + 1;
        const motion = this.motionQueue.shift();

        // Store start position for interpolation
        if (motion.type !== 'GRIPPER') {
            motion.startPos = { ...this.robotEndEffectorPos };
        }

        this.currentMotion = motion;
        this.motionStartTime = Date.now();
    }

    moveRobotTo(pos) {
        // The pos object contains {x, y, z} in mm from the KRL code
        // We need to convert to 3D scene coordinates

        // Scale from mm to scene units (1 unit ≈ 100mm in our scene)
        const sceneX = pos.x * 0.01;
        const sceneY = pos.z * 0.01; // KRL Z becomes scene Y (height)
        const sceneZ = pos.y * 0.01; // KRL Y becomes scene Z

        // Store for interpolation
        this.robotEndEffectorPos = { x: pos.x, y: pos.y, z: pos.z };

        // Calculate target position relative to robot base
        const targetX = sceneX;
        const targetZ = sceneZ;
        const targetY = Math.max(0.1, sceneY + 0.3); // Offset from ground

        // Horizontal distance from robot base
        const horizontalDist = Math.sqrt(targetX * targetX + targetZ * targetZ);
        const verticalHeight = targetY - 1.0; // Height above shoulder joint

        // Rotate robot base towards target
        const baseAngle = Math.atan2(targetZ, targetX);
        if (this.robotGroup) {
            this.robotGroup.rotation.y = baseAngle;
        }

        // Simple 2-link IK for arm
        const upperArmLength = 0.6;
        const forearmLength = 0.5;

        // Distance to target in reach plane
        const reachDist = Math.sqrt(horizontalDist * horizontalDist + verticalHeight * verticalHeight);

        // Check if target is reachable
        const maxReach = upperArmLength + forearmLength;
        const minReach = Math.abs(upperArmLength - forearmLength);

        let shoulderAngle = 0;
        let elbowAngle = 0;

        if (reachDist <= maxReach && reachDist >= minReach) {
            // Use cosine law to find elbow angle
            const cosElbow = (upperArmLength * upperArmLength + forearmLength * forearmLength - reachDist * reachDist) /
                (2 * upperArmLength * forearmLength);
            elbowAngle = Math.PI - Math.acos(Math.max(-1, Math.min(1, cosElbow)));

            // Find shoulder angle
            const alpha = Math.atan2(verticalHeight, horizontalDist);
            const cosBeta = (upperArmLength * upperArmLength + reachDist * reachDist - forearmLength * forearmLength) /
                (2 * upperArmLength * reachDist);
            const beta = Math.acos(Math.max(-1, Math.min(1, cosBeta)));
            shoulderAngle = alpha + beta;
        } else {
            // Target out of reach, extend towards it
            shoulderAngle = Math.atan2(verticalHeight, horizontalDist);
            elbowAngle = 0;
        }

        // Apply angles
        if (this.robotArm) {
            this.robotArm.rotation.z = shoulderAngle;
        }

        if (this.robotForearm) {
            // Elbow angle is relative to upper arm
            this.robotForearm.rotation.z = -elbowAngle;
        }
    }

    async playMotionSequence(motions, progressCallback) {
        return new Promise((resolve) => {
            this.motionQueue = [...motions];
            this.totalMotions = motions.length;
            this.currentMotionIndex = 0;
            this.progressCallback = progressCallback;
            this.motionResolve = resolve;
            this.processNextMotion();
        });
    }

    updateBoard(boardState) {
        // Clear existing pieces on board
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 6; c++) {
                if (this.pieces[r][c]) {
                    this.scene.remove(this.pieces[r][c]);
                    this.pieces[r][c] = null;
                }
            }
        }

        // Add new pieces at correct positions
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 6; c++) {
                const value = boardState[r]?.[c] || 0;
                if (value !== 0) {
                    const material = new THREE.MeshStandardMaterial({
                        color: value === 1 ? 0xff4757 : 0x3498ff,
                        metalness: 0.4,
                        roughness: 0.3,
                        emissive: value === 1 ? 0xff4757 : 0x3498ff,
                        emissiveIntensity: 0.2
                    });

                    const piece = this.createPiece(material);

                    // Position relative to board group
                    // Board is at (1.2, 0, 1.0) in world coordinates
                    piece.position.set(
                        1.2 + (c - 2.5) * 0.28,
                        0.08,
                        1.0 - (r - 1.5) * 0.2
                    );
                    this.scene.add(piece);
                    this.pieces[r][c] = piece;
                }
            }
        }
    }

    reset() {
        // Clear all pieces
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 6; c++) {
                if (this.pieces[r][c]) {
                    this.scene.remove(this.pieces[r][c]);
                    this.pieces[r][c] = null;
                }
            }
        }

        // Reset motion
        this.motionQueue = [];
        this.currentMotion = null;

        // Move robot home
        this.moveRobotTo({ x: 200, y: 0, z: 300 });
    }

    setPlaybackSpeed(speed) {
        this.playbackSpeed = speed;
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        if (this.isPaused) {
            this.isPaused = false;
            if (this.currentMotion) {
                this.motionStartTime = Date.now();
            }
        }
    }

    stop() {
        this.motionQueue = [];
        this.currentMotion = null;
        this.isPaused = false;
    }

    resetCamera() {
        if (this._resetCameraFn) {
            this._resetCameraFn();
        }
    }

    toggleGrid() {
        this.showGrid = !this.showGrid;
        if (this.gridHelper) {
            this.gridHelper.visible = this.showGrid;
        }
    }

    onResize() {
        const container = this.canvas.parentElement;
        if (!container) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
}

// Export for use
window.RobotRenderer = RobotRenderer;

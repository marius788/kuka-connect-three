/* ============================================
   KUKA Robot Arm Simulation
   6-axis articulated robot with gripper
   ============================================ */

const KukaRobot = {
    // Robot parts
    base: null,
    shoulder: null,
    upperArm: null,
    elbow: null,
    forearm: null,
    wrist: null,
    hand: null,
    gripperLeft: null,
    gripperRight: null,

    // Current joint angles (radians)
    joints: {
        base: 0,
        shoulder: -Math.PI / 4,
        elbow: Math.PI / 3,
        wristPitch: 0,
        wristRoll: 0,
        gripper: 0.3  // open
    },

    // Target joint angles for animation
    targetJoints: null,

    // Animation state
    isAnimating: false,
    animationQueue: [],
    animationSpeed: 0.03,

    // Gripper state
    isGripperOpen: true,
    heldPiece: null,

    // Dimensions (scaled for Three.js)
    dimensions: {
        baseHeight: 0.8,
        baseRadius: 0.6,
        shoulderHeight: 0.4,
        upperArmLength: 2.0,
        forearmLength: 1.8,
        wristLength: 0.3,
        handLength: 0.4,
        gripperLength: 0.3
    },

    // Colors
    colors: {
        kukaOrange: 0xff6600,
        darkGray: 0x2a2a2a,
        lightGray: 0x4a4a4a,
        metallic: 0x888888
    },

    /**
     * Create the robot arm geometry
     */
    create(scene) {
        const d = this.dimensions;
        const c = this.colors;

        // Materials
        const orangeMat = new THREE.MeshPhongMaterial({
            color: c.kukaOrange,
            shininess: 80
        });
        const darkMat = new THREE.MeshPhongMaterial({
            color: c.darkGray,
            shininess: 30
        });
        const metalMat = new THREE.MeshPhongMaterial({
            color: c.metallic,
            shininess: 100
        });

        // Create robot group
        const robot = new THREE.Group();
        robot.name = 'kukaRobot';

        // BASE (fixed)
        const baseGeo = new THREE.CylinderGeometry(d.baseRadius, d.baseRadius * 1.2, d.baseHeight, 32);
        this.base = new THREE.Mesh(baseGeo, darkMat);
        this.base.position.y = d.baseHeight / 2;
        robot.add(this.base);

        // SHOULDER ROTATION (joint 1)
        this.shoulder = new THREE.Group();
        this.shoulder.position.y = d.baseHeight;
        this.base.add(this.shoulder);

        // Shoulder housing
        const shoulderGeo = new THREE.BoxGeometry(0.5, d.shoulderHeight, 0.5);
        const shoulderMesh = new THREE.Mesh(shoulderGeo, orangeMat);
        shoulderMesh.position.y = d.shoulderHeight / 2;
        this.shoulder.add(shoulderMesh);

        // UPPER ARM (joint 2)
        this.upperArm = new THREE.Group();
        this.upperArm.position.y = d.shoulderHeight;
        this.shoulder.add(this.upperArm);

        // Upper arm geometry
        const upperArmGeo = new THREE.BoxGeometry(0.35, d.upperArmLength, 0.35);
        const upperArmMesh = new THREE.Mesh(upperArmGeo, orangeMat);
        upperArmMesh.position.y = d.upperArmLength / 2;
        this.upperArm.add(upperArmMesh);

        // Joint sphere
        const jointGeo = new THREE.SphereGeometry(0.2, 16, 16);
        const joint1 = new THREE.Mesh(jointGeo, darkMat);
        this.upperArm.add(joint1);

        // ELBOW (joint 3)
        this.elbow = new THREE.Group();
        this.elbow.position.y = d.upperArmLength;
        this.upperArm.add(this.elbow);

        // Elbow joint
        const joint2 = new THREE.Mesh(jointGeo, darkMat);
        this.elbow.add(joint2);

        // FOREARM
        this.forearm = new THREE.Group();
        this.elbow.add(this.forearm);

        // Forearm geometry
        const forearmGeo = new THREE.BoxGeometry(0.28, d.forearmLength, 0.28);
        const forearmMesh = new THREE.Mesh(forearmGeo, orangeMat);
        forearmMesh.position.y = d.forearmLength / 2;
        this.forearm.add(forearmMesh);

        // WRIST (joint 4, 5)
        this.wrist = new THREE.Group();
        this.wrist.position.y = d.forearmLength;
        this.forearm.add(this.wrist);

        // Wrist geometry
        const wristGeo = new THREE.CylinderGeometry(0.15, 0.15, d.wristLength, 16);
        const wristMesh = new THREE.Mesh(wristGeo, darkMat);
        wristMesh.position.y = d.wristLength / 2;
        this.wrist.add(wristMesh);

        // HAND/TOOL FLANGE (joint 6)
        this.hand = new THREE.Group();
        this.hand.position.y = d.wristLength;
        this.wrist.add(this.hand);

        // Hand geometry
        const handGeo = new THREE.BoxGeometry(0.25, d.handLength, 0.25);
        const handMesh = new THREE.Mesh(handGeo, metalMat);
        handMesh.position.y = d.handLength / 2;
        this.hand.add(handMesh);

        // GRIPPER
        const gripperGroup = new THREE.Group();
        gripperGroup.position.y = d.handLength;
        this.hand.add(gripperGroup);

        // Gripper fingers
        const fingerGeo = new THREE.BoxGeometry(0.05, d.gripperLength, 0.15);

        this.gripperLeft = new THREE.Mesh(fingerGeo, metalMat);
        this.gripperLeft.position.set(-0.1, d.gripperLength / 2, 0);
        gripperGroup.add(this.gripperLeft);

        this.gripperRight = new THREE.Mesh(fingerGeo, metalMat);
        this.gripperRight.position.set(0.1, d.gripperLength / 2, 0);
        gripperGroup.add(this.gripperRight);

        // Store gripper group reference
        this.gripperGroup = gripperGroup;

        // Set initial pose
        this.applyJoints();

        // Add to scene
        scene.add(robot);
        this.robotGroup = robot;

        return robot;
    },

    /**
     * Apply current joint angles to the robot
     */
    applyJoints() {
        if (this.shoulder) {
            this.shoulder.rotation.y = this.joints.base;
        }
        if (this.upperArm) {
            this.upperArm.rotation.z = this.joints.shoulder;
        }
        if (this.elbow) {
            this.elbow.rotation.z = this.joints.elbow;
        }
        if (this.wrist) {
            this.wrist.rotation.z = this.joints.wristPitch;
            this.wrist.rotation.y = this.joints.wristRoll;
        }

        // Gripper opening
        if (this.gripperLeft && this.gripperRight) {
            const openAmount = this.joints.gripper * 0.15;
            this.gripperLeft.position.x = -0.05 - openAmount;
            this.gripperRight.position.x = 0.05 + openAmount;
        }
    },

    /**
     * Get the world position of the gripper
     */
    getGripperPosition() {
        if (!this.gripperGroup) return new THREE.Vector3();

        const worldPos = new THREE.Vector3();
        this.gripperGroup.getWorldPosition(worldPos);
        return worldPos;
    },

    /**
     * Simple inverse kinematics to reach a target position
     * Uses geometric approach for 2-link arm
     */
    calculateIK(targetPos) {
        const d = this.dimensions;

        // Base rotation (yaw)
        const baseAngle = Math.atan2(targetPos.x, targetPos.z);

        // Distance in horizontal plane
        const distXZ = Math.sqrt(targetPos.x * targetPos.x + targetPos.z * targetPos.z);

        // Height adjustment
        const heightFromShoulder = targetPos.y - d.baseHeight - d.shoulderHeight;

        // Distance to target from shoulder
        const L1 = d.upperArmLength;
        const L2 = d.forearmLength + d.wristLength + d.handLength + d.gripperLength;
        const dist = Math.sqrt(distXZ * distXZ + heightFromShoulder * heightFromShoulder);

        // Clamp to reachable range
        const maxReach = L1 + L2 - 0.1;
        const minReach = Math.abs(L1 - L2) + 0.1;
        const clampedDist = Math.max(minReach, Math.min(maxReach, dist));

        // Law of cosines for elbow angle
        const cosElbow = (L1 * L1 + L2 * L2 - clampedDist * clampedDist) / (2 * L1 * L2);
        const elbowAngle = Math.PI - Math.acos(Math.max(-1, Math.min(1, cosElbow)));

        // Shoulder angle
        const alpha = Math.atan2(heightFromShoulder, distXZ);
        const cosBeta = (L1 * L1 + clampedDist * clampedDist - L2 * L2) / (2 * L1 * clampedDist);
        const beta = Math.acos(Math.max(-1, Math.min(1, cosBeta)));
        const shoulderAngle = alpha + beta - Math.PI / 2;

        // Wrist to keep gripper pointing down
        const wristAngle = -(shoulderAngle + elbowAngle);

        return {
            base: baseAngle,
            shoulder: shoulderAngle,
            elbow: elbowAngle,
            wristPitch: wristAngle,
            wristRoll: 0,
            gripper: this.joints.gripper
        };
    },

    /**
     * Move to a target position (animated)
     */
    moveTo(targetPos, onComplete) {
        this.targetJoints = this.calculateIK(targetPos);
        this.isAnimating = true;
        this.onAnimationComplete = onComplete;
    },

    /**
     * Open the gripper
     */
    openGripper(onComplete) {
        this.targetJoints = { ...this.joints, gripper: 0.5 };
        this.isAnimating = true;
        this.isGripperOpen = true;
        this.onAnimationComplete = () => {
            if (this.heldPiece) {
                // Drop the piece
                this.heldPiece = null;
            }
            if (onComplete) onComplete();
        };
    },

    /**
     * Close the gripper
     */
    closeGripper(onComplete) {
        this.targetJoints = { ...this.joints, gripper: 0.05 };
        this.isAnimating = true;
        this.isGripperOpen = false;
        this.onAnimationComplete = onComplete;
    },

    /**
     * Attach a piece to the gripper
     */
    grabPiece(pieceMesh) {
        this.heldPiece = pieceMesh;
    },

    /**
     * Update animation (call every frame)
     */
    update() {
        if (!this.isAnimating || !this.targetJoints) return;

        let allDone = true;

        // Interpolate each joint
        for (const joint in this.targetJoints) {
            const diff = this.targetJoints[joint] - this.joints[joint];
            if (Math.abs(diff) > 0.01) {
                this.joints[joint] += diff * this.animationSpeed * 2;
                allDone = false;
            } else {
                this.joints[joint] = this.targetJoints[joint];
            }
        }

        // Apply joint angles
        this.applyJoints();

        // Update held piece position
        if (this.heldPiece && !this.isGripperOpen) {
            const gripperPos = this.getGripperPosition();
            this.heldPiece.position.copy(gripperPos);
            this.heldPiece.position.y -= 0.15;  // Offset for piece center
        }

        // Check if animation complete
        if (allDone) {
            this.isAnimating = false;
            if (this.onAnimationComplete) {
                const callback = this.onAnimationComplete;
                this.onAnimationComplete = null;
                callback();
            }
        }
    },

    /**
     * Move to home position
     */
    goHome(onComplete) {
        this.targetJoints = {
            base: 0,
            shoulder: -Math.PI / 4,
            elbow: Math.PI / 3,
            wristPitch: 0,
            wristRoll: 0,
            gripper: 0.3
        };
        this.isAnimating = true;
        this.onAnimationComplete = onComplete;
    },

    /**
     * Execute a pick and place operation
     */
    pickAndPlace(pickPos, placePos, pieceMesh, onComplete) {
        const safeHeight = 2.5;

        // Animation sequence
        const sequence = [
            // 1. Move above pick position
            () => {
                const abovePick = pickPos.clone();
                abovePick.y = safeHeight;
                this.moveTo(abovePick, nextStep);
            },
            // 2. Open gripper
            () => this.openGripper(nextStep),
            // 3. Move down to pick
            () => this.moveTo(pickPos, nextStep),
            // 4. Close gripper
            () => {
                this.grabPiece(pieceMesh);
                this.closeGripper(nextStep);
            },
            // 5. Lift up
            () => {
                const abovePick = pickPos.clone();
                abovePick.y = safeHeight;
                this.moveTo(abovePick, nextStep);
            },
            // 6. Move above place position
            () => {
                const abovePlace = placePos.clone();
                abovePlace.y = safeHeight;
                this.moveTo(abovePlace, nextStep);
            },
            // 7. Move down to place
            () => this.moveTo(placePos, nextStep),
            // 8. Open gripper
            () => this.openGripper(nextStep),
            // 9. Lift up
            () => {
                const abovePlace = placePos.clone();
                abovePlace.y = safeHeight;
                this.moveTo(abovePlace, nextStep);
            },
            // 10. Go home
            () => this.goHome(onComplete)
        ];

        let stepIndex = 0;
        const nextStep = () => {
            stepIndex++;
            if (stepIndex < sequence.length) {
                sequence[stepIndex]();
            }
        };

        // Start sequence
        sequence[0]();
    }
};

// Export for use in other modules
window.KukaRobot = KukaRobot;

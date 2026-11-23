/* ============================================
   Game Board Visualization
   Creates 3D board and piece storage areas
   ============================================ */

const GameBoard = {
    // Board dimensions (from GAME_DATA.dat, scaled)
    ROWS: 4,
    COLS: 6,
    CELL_SIZE: 0.5,
    PIECE_RADIUS: 0.18,
    PIECE_HEIGHT: 0.3,

    // Board geometry
    boardMesh: null,
    pieces: [],
    storagePiecesRed: [],
    storagePiecesBlue: [],

    // Position offsets (scaled for Three.js)
    boardOffset: { x: 0, y: 0.05, z: 3 },
    redStorageOffset: { x: -2.5, y: 0.05, z: 1.5 },
    blueStorageOffset: { x: 2.5, y: 0.05, z: 1.5 },

    // Materials
    materials: {
        board: null,
        cell: null,
        redPiece: null,
        bluePiece: null
    },

    /**
     * Create all board elements
     */
    create(scene) {
        this.scene = scene;
        this.createMaterials();
        this.createBoard();
        this.createStorageAreas();
        this.initStoragePieces();
    },

    /**
     * Create materials for board and pieces
     */
    createMaterials() {
        // Board material (dark wood-like)
        this.materials.board = new THREE.MeshPhongMaterial({
            color: 0x3a2820,
            shininess: 30
        });

        // Cell material (lighter)
        this.materials.cell = new THREE.MeshPhongMaterial({
            color: 0x5a4a40,
            shininess: 20
        });

        // Red pieces
        this.materials.redPiece = new THREE.MeshPhongMaterial({
            color: 0xff4444,
            shininess: 80,
            emissive: 0x220000
        });

        // Blue pieces
        this.materials.bluePiece = new THREE.MeshPhongMaterial({
            color: 0x4444ff,
            shininess: 80,
            emissive: 0x000022
        });
    },

    /**
     * Create the main game board
     */
    createBoard() {
        const boardWidth = this.COLS * this.CELL_SIZE + 0.2;
        const boardDepth = this.ROWS * this.CELL_SIZE + 0.2;
        const boardHeight = 0.1;

        // Base board
        const boardGeo = new THREE.BoxGeometry(boardWidth, boardHeight, boardDepth);
        this.boardMesh = new THREE.Mesh(boardGeo, this.materials.board);
        this.boardMesh.position.set(
            this.boardOffset.x,
            this.boardOffset.y,
            this.boardOffset.z
        );
        this.boardMesh.receiveShadow = true;
        this.scene.add(this.boardMesh);

        // Cell markers
        const cellGeo = new THREE.BoxGeometry(this.CELL_SIZE - 0.05, 0.02, this.CELL_SIZE - 0.05);

        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                const pos = this.getCellPosition(r, c);
                const cell = new THREE.Mesh(cellGeo, this.materials.cell);
                cell.position.set(pos.x, pos.y + 0.06, pos.z);
                cell.receiveShadow = true;
                this.scene.add(cell);
            }
        }

        // Column labels
        this.createLabels();
    },

    /**
     * Create column number labels
     */
    createLabels() {
        // We'll create simple placeholder markers for columns
        const markerGeo = new THREE.ConeGeometry(0.08, 0.15, 4);
        const markerMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });

        for (let c = 0; c < this.COLS; c++) {
            const pos = this.getCellPosition(0, c);
            const marker = new THREE.Mesh(markerGeo, markerMat);
            marker.position.set(pos.x, 0.3, pos.z - this.CELL_SIZE - 0.1);
            marker.rotation.x = Math.PI;
            this.scene.add(marker);
        }
    },

    /**
     * Create storage areas for pieces
     */
    createStorageAreas() {
        const storageWidth = 6 * 0.4 + 0.2;
        const storageDepth = 2 * 0.4 + 0.2;
        const storageHeight = 0.05;

        // Red storage (left)
        const redStorageGeo = new THREE.BoxGeometry(storageWidth, storageHeight, storageDepth);
        const redStorageMat = new THREE.MeshPhongMaterial({
            color: 0x441111,
            shininess: 20
        });
        const redStorage = new THREE.Mesh(redStorageGeo, redStorageMat);
        redStorage.position.set(
            this.redStorageOffset.x,
            this.redStorageOffset.y,
            this.redStorageOffset.z
        );
        redStorage.receiveShadow = true;
        this.scene.add(redStorage);

        // Blue storage (right)
        const blueStorageGeo = new THREE.BoxGeometry(storageWidth, storageHeight, storageDepth);
        const blueStorageMat = new THREE.MeshPhongMaterial({
            color: 0x111144,
            shininess: 20
        });
        const blueStorage = new THREE.Mesh(blueStorageGeo, blueStorageMat);
        blueStorage.position.set(
            this.blueStorageOffset.x,
            this.blueStorageOffset.y,
            this.blueStorageOffset.z
        );
        blueStorage.receiveShadow = true;
        this.scene.add(blueStorage);
    },

    /**
     * Create initial storage pieces (12 of each color)
     */
    initStoragePieces() {
        const pieceGeo = new THREE.CylinderGeometry(
            this.PIECE_RADIUS,
            this.PIECE_RADIUS,
            this.PIECE_HEIGHT,
            24
        );

        // Create 12 red pieces
        for (let i = 0; i < 12; i++) {
            const piece = new THREE.Mesh(pieceGeo, this.materials.redPiece);
            const pos = this.getStoragePosition(1, i);  // 1 = RED
            piece.position.copy(pos);
            piece.castShadow = true;
            this.scene.add(piece);
            this.storagePiecesRed.push(piece);
        }

        // Create 12 blue pieces
        for (let i = 0; i < 12; i++) {
            const piece = new THREE.Mesh(pieceGeo, this.materials.bluePiece);
            const pos = this.getStoragePosition(2, i);  // 2 = BLUE
            piece.position.copy(pos);
            piece.castShadow = true;
            this.scene.add(piece);
            this.storagePiecesBlue.push(piece);
        }
    },

    /**
     * Get 3D position for a board cell
     */
    getCellPosition(row, col) {
        const startX = this.boardOffset.x - (this.COLS - 1) * this.CELL_SIZE / 2;
        const startZ = this.boardOffset.z - (this.ROWS - 1) * this.CELL_SIZE / 2;

        return new THREE.Vector3(
            startX + col * this.CELL_SIZE,
            this.boardOffset.y + 0.1 + this.PIECE_HEIGHT / 2,
            startZ + row * this.CELL_SIZE
        );
    },

    /**
     * Get 3D position for a storage slot
     */
    getStoragePosition(player, index) {
        const offset = (player === 1) ? this.redStorageOffset : this.blueStorageOffset;
        const slotSize = 0.4;

        const row = Math.floor(index / 6);
        const col = index % 6;

        const startX = offset.x - (6 - 1) * slotSize / 2;
        const startZ = offset.z - (2 - 1) * slotSize / 2;

        return new THREE.Vector3(
            startX + col * slotSize,
            offset.y + 0.05 + this.PIECE_HEIGHT / 2,
            startZ + row * slotSize
        );
    },

    /**
     * Get the next available piece from storage
     */
    getNextStoragePiece(player) {
        const pieces = (player === 1) ? this.storagePiecesRed : this.storagePiecesBlue;

        // Find first visible piece
        for (let i = 0; i < pieces.length; i++) {
            if (pieces[i].visible) {
                return { piece: pieces[i], index: i };
            }
        }
        return null;
    },

    /**
     * Place a piece on the board (create new piece there)
     */
    placePieceOnBoard(row, col, player, pieceMesh) {
        const pos = this.getCellPosition(row, col);

        // If we have a reference to the piece mesh, move it
        if (pieceMesh) {
            pieceMesh.position.copy(pos);
        } else {
            // Create new piece at position
            const pieceGeo = new THREE.CylinderGeometry(
                this.PIECE_RADIUS,
                this.PIECE_RADIUS,
                this.PIECE_HEIGHT,
                24
            );
            const material = (player === 1)
                ? this.materials.redPiece
                : this.materials.bluePiece;
            const piece = new THREE.Mesh(pieceGeo, material);
            piece.position.copy(pos);
            piece.castShadow = true;
            this.scene.add(piece);
            this.pieces.push({ mesh: piece, row, col, player });
        }
    },

    /**
     * Clear all pieces from the board
     */
    clearBoard() {
        // Remove board pieces
        for (const pieceData of this.pieces) {
            this.scene.remove(pieceData.mesh);
        }
        this.pieces = [];

        // Reset storage pieces visibility and position
        for (let i = 0; i < this.storagePiecesRed.length; i++) {
            this.storagePiecesRed[i].visible = true;
            this.storagePiecesRed[i].position.copy(this.getStoragePosition(1, i));
        }

        for (let i = 0; i < this.storagePiecesBlue.length; i++) {
            this.storagePiecesBlue[i].visible = true;
            this.storagePiecesBlue[i].position.copy(this.getStoragePosition(2, i));
        }
    },

    /**
     * Mark a storage piece as used (hide it)
     */
    useStoragePiece(player, index) {
        const pieces = (player === 1) ? this.storagePiecesRed : this.storagePiecesBlue;
        if (pieces[index]) {
            pieces[index].visible = false;
        }
    }
};

// Export for use in other modules
window.GameBoard = GameBoard;

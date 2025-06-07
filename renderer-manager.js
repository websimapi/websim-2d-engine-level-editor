import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class RendererManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.canvas = null;
        
        // Grid and world objects
        this.gridHelper = null;
        this.gridSize = 32;
        this.blocks = new Map(); // key: "x,y,z", value: block mesh
        this.assets = new Map(); // key: unique id, value: asset mesh
        this.previewMesh = null;
        this.selectedObject = null;
        
        // Materials for different states
        this.blockMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
        this.previewMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, 
            transparent: true, 
            opacity: 0.5,
            wireframe: true 
        });
        this.removeMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            transparent: true, 
            opacity: 0.5,
            wireframe: true 
        });
        this.selectedMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x0080ff, 
            transparent: true, 
            opacity: 0.3,
            wireframe: true 
        });
        
        // Loaders
        this.gltfLoader = new GLTFLoader();
        this.textureLoader = new THREE.TextureLoader();
        
        // 2D Shader for flattening Z-coordinates
        this.create2DShader();
    }
    
    create2DShader() {
        this.shader2D = {
            vertexShader: `
                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    mvPosition.z = 0.0; // Flatten all Z coordinates
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                void main() {
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        };
    }
    
    async initialize() {
        this.canvas = document.getElementById('canvas');
        
        // Initialize scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x222222);
        
        // Initialize camera (orthographic for 2D view)
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        const frustumSize = 50;
        this.camera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2, frustumSize * aspect / 2,
            frustumSize / 2, frustumSize / -2,
            0.1, 1000
        );
        
        // Position camera looking down from above
        this.camera.position.set(0, 50, 0);
        this.camera.lookAt(0, 0, 0);
        
        // Initialize renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas,
            antialias: true 
        });
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Initialize controls
        this.controls = new OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.enableRotate = true;
        this.controls.enablePan = true;
        
        // Constrain camera to look down at 2D plane
        this.controls.minPolarAngle = Math.PI / 2 - 0.1; // Almost top-down
        this.controls.maxPolarAngle = Math.PI / 2 + 0.1; // Almost top-down
        
        // Add lighting
        this.setupLighting();
        
        // Create grid
        this.createGrid();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Start render loop
        this.animate();
        
        console.log('RendererManager initialized');
    }
    
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
    }
    
    createGrid() {
        if (this.gridHelper) {
            this.scene.remove(this.gridHelper);
        }
        
        this.gridHelper = new THREE.GridHelper(this.gridSize, this.gridSize, 0x444444, 0x444444);
        this.gridHelper.position.y = 0;
        this.scene.add(this.gridHelper);
    }
    
    updateGridSize(size) {
        this.gridSize = size;
        this.createGrid();
    }
    
    onWindowResize() {
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        const frustumSize = 50;
        
        this.camera.left = frustumSize * aspect / -2;
        this.camera.right = frustumSize * aspect / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = frustumSize / -2;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    // Block creation methods
    createBlockGeometry(type, orientation = 'north') {
        let geometry;
        
        switch (type) {
            case 'half':
                geometry = new THREE.BoxGeometry(1, 0.5, 1);
                break;
            case 'stair':
                // Create stair geometry - simplified as two boxes
                geometry = new THREE.BoxGeometry(1, 0.25, 1);
                break;
            default: // full
                geometry = new THREE.BoxGeometry(1, 1, 1);
                break;
        }
        
        return geometry;
    }
    
    createBlock(type, position, orientation = 'north', color = 0xffffff, textureUrl = null) {
        const geometry = this.createBlockGeometry(type, orientation);
        let material;
        
        if (textureUrl) {
            const texture = this.textureLoader.load(textureUrl);
            material = new THREE.MeshLambertMaterial({ map: texture, color: color });
        } else {
            material = new THREE.MeshLambertMaterial({ color: color });
        }
        
        const block = new THREE.Mesh(geometry, material);
        block.position.copy(position);
        
        // Adjust Y position based on block type
        if (type === 'half') {
            block.position.y += 0.25;
        } else if (type === 'stair') {
            block.position.y += 0.125;
        } else {
            block.position.y += 0.5;
        }
        
        // Apply rotation based on orientation
        this.applyBlockOrientation(block, orientation);
        
        block.castShadow = true;
        block.receiveShadow = true;
        block.userData = { type, orientation, color, textureUrl };
        
        return block;
    }
    
    applyBlockOrientation(block, orientation) {
        block.rotation.y = 0;
        switch (orientation) {
            case 'south':
                block.rotation.y = Math.PI;
                break;
            case 'east':
                block.rotation.y = Math.PI / 2;
                break;
            case 'west':
                block.rotation.y = -Math.PI / 2;
                break;
            default: // north
                break;
        }
    }
    
    placeBlock(x, y, z, type, orientation, color, textureUrl) {
        const key = `${x},${y},${z}`;
        
        // Remove existing block if present
        if (this.blocks.has(key)) {
            this.removeBlock(x, y, z);
        }
        
        const position = new THREE.Vector3(x, y, z);
        const block = this.createBlock(type, position, orientation, color, textureUrl);
        
        this.scene.add(block);
        this.blocks.set(key, block);
        
        return block;
    }
    
    removeBlock(x, y, z) {
        const key = `${x},${y},${z}`;
        const block = this.blocks.get(key);
        
        if (block) {
            this.scene.remove(block);
            this.blocks.delete(key);
            
            if (this.selectedObject === block) {
                this.clearSelection();
            }
        }
    }
    
    getBlock(x, y, z) {
        const key = `${x},${y},${z}`;
        return this.blocks.get(key);
    }
    
    // Asset methods
    async loadAsset(url) {
        try {
            const gltf = await this.gltfLoader.loadAsync(url);
            return gltf.scene;
        } catch (error) {
            console.error('Error loading asset:', error);
            // Return a placeholder box
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshLambertMaterial({ color: 0xff00ff });
            return new THREE.Mesh(geometry, material);
        }
    }
    
    async placeAsset(url, position, rotation = { x: 0, y: 0, z: 0 }, scale = { x: 1, y: 1, z: 1 }) {
        const asset = await this.loadAsset(url);
        const id = Date.now().toString();
        
        asset.position.copy(position);
        asset.rotation.set(rotation.x, rotation.y, rotation.z);
        asset.scale.set(scale.x, scale.y, scale.z);
        asset.userData = { id, url, type: 'Scene Object' };
        
        this.scene.add(asset);
        this.assets.set(id, asset);
        
        return { id, asset };
    }
    
    removeAsset(id) {
        const asset = this.assets.get(id);
        if (asset) {
            this.scene.remove(asset);
            this.assets.delete(id);
            
            if (this.selectedObject === asset) {
                this.clearSelection();
            }
        }
    }
    
    getAsset(id) {
        return this.assets.get(id);
    }
    
    // Preview methods
    showPreview(position, type, orientation, isRemove = false) {
        this.hidePreview();
        
        const geometry = this.createBlockGeometry(type, orientation);
        const material = isRemove ? this.removeMaterial : this.previewMaterial;
        
        this.previewMesh = new THREE.Mesh(geometry, material);
        this.previewMesh.position.copy(position);
        
        // Adjust Y position based on block type
        if (type === 'half') {
            this.previewMesh.position.y += 0.25;
        } else if (type === 'stair') {
            this.previewMesh.position.y += 0.125;
        } else {
            this.previewMesh.position.y += 0.5;
        }
        
        this.applyBlockOrientation(this.previewMesh, orientation);
        this.scene.add(this.previewMesh);
    }
    
    hidePreview() {
        if (this.previewMesh) {
            this.scene.remove(this.previewMesh);
            this.previewMesh = null;
        }
    }
    
    // Selection methods
    selectObject(object) {
        this.clearSelection();
        this.selectedObject = object;
        
        // Add selection outline
        const box = new THREE.BoxHelper(object, 0x0080ff);
        object.add(box);
        object.userData.selectionBox = box;
    }
    
    clearSelection() {
        if (this.selectedObject && this.selectedObject.userData.selectionBox) {
            this.selectedObject.remove(this.selectedObject.userData.selectionBox);
            delete this.selectedObject.userData.selectionBox;
        }
        this.selectedObject = null;
    }
    
    // Raycasting methods
    updateMouse(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    }
    
    raycast(includeBlocks = true, includeAssets = true) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const objects = [];
        if (includeBlocks) {
            objects.push(...Array.from(this.blocks.values()));
        }
        if (includeAssets) {
            objects.push(...Array.from(this.assets.values()));
        }
        
        const intersects = this.raycaster.intersectObjects(objects, true);
        return intersects.length > 0 ? intersects[0] : null;
    }
    
    getGridPosition(clientX, clientY) {
        this.updateMouse(clientX, clientY);
        
        // Raycast against an invisible ground plane
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersection = new THREE.Vector3();
        this.raycaster.setFromCamera(this.mouse, this.camera);
        this.raycaster.ray.intersectPlane(groundPlane, intersection);
        
        // Snap to grid
        const x = Math.round(intersection.x);
        const z = Math.round(intersection.z);
        
        // Check if within grid bounds
        const halfGrid = this.gridSize / 2;
        if (x >= -halfGrid && x < halfGrid && z >= -halfGrid && z < halfGrid) {
            return { x, y: 0, z };
        }
        
        return null;
    }
    
    // Utility methods
    clear() {
        // Remove all blocks
        for (const block of this.blocks.values()) {
            this.scene.remove(block);
        }
        this.blocks.clear();
        
        // Remove all assets
        for (const asset of this.assets.values()) {
            this.scene.remove(asset);
        }
        this.assets.clear();
        
        this.clearSelection();
        this.hidePreview();
    }
    
    exportData() {
        const blocksData = {};
        for (const [key, block] of this.blocks) {
            const [x, y, z] = key.split(',').map(Number);
            blocksData[key] = {
                position: { x, y, z },
                type: block.userData.type,
                orientation: block.userData.orientation,
                color: block.userData.color,
                textureUrl: block.userData.textureUrl
            };
        }
        
        const assetsData = {};
        for (const [id, asset] of this.assets) {
            assetsData[id] = {
                url: asset.userData.url,
                position: {
                    x: asset.position.x,
                    y: asset.position.y,
                    z: asset.position.z
                },
                rotation: {
                    x: asset.rotation.x,
                    y: asset.rotation.y,
                    z: asset.rotation.z
                },
                scale: {
                    x: asset.scale.x,
                    y: asset.scale.y,
                    z: asset.scale.z
                },
                type: asset.userData.type || 'Scene Object'
            };
        }
        
        return {
            gridSize: this.gridSize,
            blocks: blocksData,
            assets: assetsData
        };
    }
    
    async importData(data) {
        this.clear();
        
        if (data.gridSize) {
            this.updateGridSize(data.gridSize);
        }
        
        // Import blocks
        if (data.blocks) {
            for (const [key, blockData] of Object.entries(data.blocks)) {
                const { position, type, orientation, color, textureUrl } = blockData;
                this.placeBlock(
                    position.x, position.y, position.z,
                    type, orientation, color, textureUrl
                );
            }
        }
        
        // Import assets
        if (data.assets) {
            for (const [id, assetData] of Object.entries(data.assets)) {
                const { url, position, rotation, scale, type } = assetData;
                const result = await this.placeAsset(url, position, rotation, scale);
                if (result && result.asset) {
                    result.asset.userData.type = type || 'Scene Object';
                }
            }
        }
    }
}

// Export singleton instance
export const rendererManager = new RendererManager();


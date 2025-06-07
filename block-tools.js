import { rendererManager } from './renderer-manager.js';
import { uiControls } from './ui-controls.js';

class BlockTools {
    constructor() {
        this.currentTool = 'placeBlock';
        this.isMouseDown = false;
        this.isDragging = false;
        this.dragStartTime = 0;
        this.lastMousePosition = { x: 0, y: 0 };
        this.rightClickMode = false;
        this.fillStartPosition = null;
        
        this.initialize();
    }
    
    initialize() {
        this.setupEventListeners();
        this.setupBlockSettings();
        
        // Listen for tool changes
        window.addEventListener('toolChanged', (e) => {
            this.currentTool = e.detail.tool;
            this.updateCursor();
        });
        
        console.log('BlockTools initialized');
    }
    
    setupEventListeners() {
        const canvas = document.getElementById('canvas');
        if (!canvas) return;
        
        // Mouse events
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Touch events for mobile
        canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    }
    
    setupBlockSettings() {
        const blockType = document.getElementById('blockType');
        const blockOrientation = document.getElementById('blockOrientation');
        const blockColor = document.getElementById('blockColor');
        const gridSize = document.getElementById('gridSize');
        
        // Listen for setting changes
        [blockType, blockOrientation, blockColor].forEach(element => {
            element.addEventListener('change', () => {
                this.updateSelectedBlock();
            });
        });
        
        gridSize.addEventListener('change', (e) => {
            this.updateGridSize(parseInt(e.target.value));
        });
    }
    
    handleMouseMove(event) {
        if (!rendererManager.canvas) return;
        
        const rect = rendererManager.canvas.getBoundingClientRect();
        const clientX = event.clientX;
        const clientY = event.clientY;
        
        // Update mouse position for raycasting
        rendererManager.updateMouse(clientX, clientY);
        
        // Check if dragging for camera controls
        const deltaX = Math.abs(clientX - this.lastMousePosition.x);
        const deltaY = Math.abs(clientY - this.lastMousePosition.y);
        
        if (this.isMouseDown && (deltaX > 5 || deltaY > 5)) {
            this.isDragging = true;
        }
        
        // Update preview based on current tool
        this.updatePreview(clientX, clientY);
        
        // Update debug info
        this.updateDebugInfo(clientX, clientY);
        
        this.lastMousePosition = { x: clientX, y: clientY };
    }
    
    handleMouseDown(event) {
        event.preventDefault();
        
        this.isMouseDown = true;
        this.isDragging = false;
        this.dragStartTime = Date.now();
        
        const isRightClick = event.button === 2;
        
        if (isRightClick && this.currentTool === 'placeBlock') {
            this.rightClickMode = true;
            this.currentTool = 'removeBlock';
            this.updatePreview(event.clientX, event.clientY);
        }
    }
    
    handleMouseUp(event) {
        const wasRightClick = event.button === 2;
        const clickDuration = Date.now() - this.dragStartTime;
        
        // Don't perform action if dragging (camera movement)
        if (this.isDragging && clickDuration > 100) {
            this.isMouseDown = false;
            this.isDragging = false;
            return;
        }
        
        // Perform tool action
        if (!this.isDragging) {
            this.performToolAction(event.clientX, event.clientY);
        }
        
        // Reset right-click mode
        if (this.rightClickMode && wasRightClick) {
            this.rightClickMode = false;
            this.currentTool = 'placeBlock';
            this.updatePreview(event.clientX, event.clientY);
        }
        
        this.isMouseDown = false;
        this.isDragging = false;
    }
    
    handleKeyDown(event) {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return; // Don't handle keyboard shortcuts when typing
        }
        
        switch (event.key) {
            case 'Delete':
                this.deleteSelected();
                break;
            case 'Escape':
                this.clearSelection();
                break;
            case '1':
                document.getElementById('placeBlockTool').click();
                break;
            case '2':
                document.getElementById('removeBlockTool').click();
                break;
            case '3':
                document.getElementById('selectTool').click();
                break;
            case '4':
                document.getElementById('fillTool').click();
                break;
            case 'f':
            case 'F':
                if (!event.repeat) {
                    document.getElementById('fillTool').click();
                }
                break;
        }
    }
    
    handleKeyUp(event) {
        // Handle key releases if needed
    }
    
    handleTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        this.handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY, button: 0 });
    }
    
    handleTouchMove(event) {
        event.preventDefault();
        const touch = event.touches[0];
        this.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    }
    
    handleTouchEnd(event) {
        event.preventDefault();
        if (event.changedTouches.length > 0) {
            const touch = event.changedTouches[0];
            this.handleMouseUp({ clientX: touch.clientX, clientY: touch.clientY, button: 0 });
        }
    }
    
    updatePreview(clientX, clientY) {
        const gridPos = rendererManager.getGridPosition(clientX, clientY);
        
        if (!gridPos) {
            rendererManager.hidePreview();
            return;
        }
        
        const settings = uiControls.getBlockSettings();
        
        switch (this.currentTool) {
            case 'placeBlock':
                // Check if there's already a block at this position
                const existingBlock = rendererManager.getBlock(gridPos.x, gridPos.y, gridPos.z);
                if (!existingBlock) {
                    rendererManager.showPreview(gridPos, settings.type, settings.orientation, false);
                } else {
                    rendererManager.hidePreview();
                }
                break;
                
            case 'removeBlock':
                // Show red preview if there's a block to remove
                const blockToRemove = rendererManager.getBlock(gridPos.x, gridPos.y, gridPos.z);
                if (blockToRemove) {
                    rendererManager.showPreview(gridPos, settings.type, settings.orientation, true);
                } else {
                    rendererManager.hidePreview();
                }
                break;
                
            case 'fill':
                if (this.fillStartPosition) {
                    // Show fill area preview
                    this.showFillPreview(this.fillStartPosition, gridPos, settings);
                } else {
                    rendererManager.showPreview(gridPos, settings.type, settings.orientation, false);
                }
                break;
                
            default:
                rendererManager.hidePreview();
                break;
        }
    }
    
    performToolAction(clientX, clientY) {
        const gridPos = rendererManager.getGridPosition(clientX, clientY);
        if (!gridPos) return;
        
        switch (this.currentTool) {
            case 'placeBlock':
                this.placeBlock(gridPos);
                break;
                
            case 'removeBlock':
                this.removeBlock(gridPos);
                break;
                
            case 'select':
                this.selectObject(clientX, clientY);
                break;
                
            case 'fill':
                this.handleFill(gridPos);
                break;
                
            case 'colorDropper':
                this.pickColor(clientX, clientY);
                break;
                
            case 'placeAsset':
                this.placeAsset(gridPos);
                break;
        }
    }
    
    placeBlock(position) {
        const settings = uiControls.getBlockSettings();
        const existingBlock = rendererManager.getBlock(position.x, position.y, position.z);
        
        if (existingBlock) {
            return; // Don't place on existing block
        }
        
        const colorHex = settings.color;
        const color = parseInt(colorHex.replace('#', ''), 16);
        
        const block = rendererManager.placeBlock(
            position.x, position.y, position.z,
            settings.type, settings.orientation, color
        );
        
        if (block) {
            // Add to action history
            this.addToHistory('place', {
                position: { ...position },
                type: settings.type,
                orientation: settings.orientation,
                color: colorHex
            });
        }
    }
    
    removeBlock(position) {
        const existingBlock = rendererManager.getBlock(position.x, position.y, position.z);
        
        if (existingBlock) {
            // Store block data for undo
            const blockData = {
                position: { ...position },
                type: existingBlock.userData.type,
                orientation: existingBlock.userData.orientation,
                color: existingBlock.userData.color,
                textureUrl: existingBlock.userData.textureUrl
            };
            
            rendererManager.removeBlock(position.x, position.y, position.z);
            
            // Add to action history
            this.addToHistory('remove', blockData);
        }
    }
    
    selectObject(clientX, clientY) {
        const intersect = rendererManager.raycast(true, true);
        
        if (intersect) {
            let object = intersect.object;
            
            // Find the root object if it's part of a group
            while (object.parent && object.parent.type !== 'Scene') {
                object = object.parent;
            }
            
            rendererManager.selectObject(object);
            
            // Update UI based on selected object
            this.updateUIForSelection(object);
        } else {
            rendererManager.clearSelection();
        }
    }
    
    handleFill(position) {
        const settings = uiControls.getBlockSettings();
        
        if (!this.fillStartPosition) {
            this.fillStartPosition = { ...position };
            return;
        }
        
        // Perform fill operation
        this.performFill(this.fillStartPosition, position, settings);
        this.fillStartPosition = null;
        rendererManager.hidePreview();
    }
    
    performFill(start, end, settings) {
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minZ = Math.min(start.z, end.z);
        const maxZ = Math.max(start.z, end.z);
        
        const placedBlocks = [];
        const color = parseInt(settings.color.replace('#', ''), 16);
        
        for (let x = minX; x <= maxX; x++) {
            for (let z = minZ; z <= maxZ; z++) {
                const pos = { x, y: 0, z };
                const existingBlock = rendererManager.getBlock(x, 0, z);
                
                if (!existingBlock) {
                    const block = rendererManager.placeBlock(
                        x, 0, z, settings.type, settings.orientation, color
                    );
                    
                    if (block) {
                        placedBlocks.push({
                            position: pos,
                            type: settings.type,
                            orientation: settings.orientation,
                            color: settings.color
                        });
                    }
                }
            }
        }
        
        if (placedBlocks.length > 0) {
            this.addToHistory('fill', { blocks: placedBlocks });
        }
    }
    
    pickColor(clientX, clientY) {
        const intersect = rendererManager.raycast(true, false);
        
        if (intersect && intersect.object.userData.color) {
            const colorHex = `#${intersect.object.userData.color.toString(16).padStart(6, '0')}`;
            document.getElementById('blockColor').value = colorHex;
            
            // Switch back to place block tool
            document.getElementById('placeBlockTool').click();
        }
    }
    
    async placeAsset(position) {
        if (!window.assetManager) return;
        
        const selectedAsset = window.assetManager.getSelectedAsset();
        if (!selectedAsset || selectedAsset.type !== 'model') return;
        
        try {
            const result = await rendererManager.placeAsset(selectedAsset.url, position);
            
            if (result) {
                this.addToHistory('placeAsset', {
                    id: result.id,
                    url: selectedAsset.url,
                    position: { ...position }
                });
                
                // Update placed assets list
                this.updatePlacedAssetsList();
            }
        } catch (error) {
            console.error('Error placing asset:', error);
        }
    }
    
    updateSelectedBlock() {
        const selected = rendererManager.selectedObject;
        if (!selected || !selected.userData.type) return;
        
        const settings = uiControls.getBlockSettings();
        const colorHex = settings.color;
        const color = parseInt(colorHex.replace('#', ''), 16);
        
        // Update block properties
        selected.userData.type = settings.type;
        selected.userData.orientation = settings.orientation;
        selected.userData.color = color;
        
        // Update geometry and material
        const newGeometry = rendererManager.createBlockGeometry(settings.type, settings.orientation);
        selected.geometry.dispose();
        selected.geometry = newGeometry;
        
        // Update material color
        selected.material.color.setHex(color);
        
        // Update position and rotation
        rendererManager.applyBlockOrientation(selected, settings.orientation);
    }
    
    updateUIForSelection(object) {
        if (object.userData.type) {
            // Block selected
            const settings = {
                type: object.userData.type,
                orientation: object.userData.orientation,
                color: `#${object.userData.color.toString(16).padStart(6, '0')}`
            };
            uiControls.setBlockSettings(settings);
        }
    }
    
    deleteSelected() {
        const selected = rendererManager.selectedObject;
        if (!selected) return;
        
        if (selected.userData.type) {
            // It's a block
            const position = {
                x: Math.round(selected.position.x),
                y: Math.round(selected.position.y),
                z: Math.round(selected.position.z)
            };
            this.removeBlock(position);
        } else if (selected.userData.id) {
            // It's an asset
            const assetData = {
                id: selected.userData.id,
                url: selected.userData.url,
                position: { ...selected.position },
                rotation: { ...selected.rotation },
                scale: { ...selected.scale }
            };
            
            rendererManager.removeAsset(selected.userData.id);
            this.addToHistory('removeAsset', assetData);
            this.updatePlacedAssetsList();
        }
    }
    
    clearSelection() {
        rendererManager.clearSelection();
    }
    
    updateGridSize(size) {
        const currentData = rendererManager.exportData();
        const hasBlocks = Object.keys(currentData.blocks || {}).length > 0;
        
        if (hasBlocks) {
            const proceed = confirm(
                'Changing grid size may remove blocks outside the new boundaries. Continue?'
            );
            if (!proceed) {
                // Reset the input value
                document.getElementById('gridSize').value = rendererManager.gridSize;
                return;
            }
        }
        
        rendererManager.updateGridSize(size);
        
        // Remove blocks outside new boundaries
        if (hasBlocks) {
            this.removeBlocksOutsideBounds(size);
        }
    }
    
    removeBlocksOutsideBounds(gridSize) {
        const halfGrid = gridSize / 2;
        const blocksToRemove = [];
        
        for (const [key, block] of rendererManager.blocks) {
            const [x, y, z] = key.split(',').map(Number);
            if (x < -halfGrid || x >= halfGrid || z < -halfGrid || z >= halfGrid) {
                blocksToRemove.push({ x, y, z });
            }
        }
        
        blocksToRemove.forEach(pos => {
            rendererManager.removeBlock(pos.x, pos.y, pos.z);
        });
        
        if (blocksToRemove.length > 0) {
            console.log(`Removed ${blocksToRemove.length} blocks outside grid boundaries`);
        }
    }
    
    showFillPreview(start, end, settings) {
        // Hide existing preview
        rendererManager.hidePreview();
        
        // Show preview for fill area
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minZ = Math.min(start.z, end.z);
        const maxZ = Math.max(start.z, end.z);
        
        // For now, just show preview at end position
        rendererManager.showPreview(end, settings.type, settings.orientation, false);
    }
    
    updatePlacedAssetsList() {
        const placedAssetsList = document.getElementById('placedAssetsList');
        if (!placedAssetsList) return;
        
        placedAssetsList.innerHTML = '';
        
        for (const [id, asset] of rendererManager.assets) {
            const assetItem = document.createElement('div');
            assetItem.className = 'placed-asset-item';
            
            assetItem.innerHTML = `
                <div class="placed-asset-info">
                    <span>${id}</span>
                    <button onclick="blockTools.removeAssetById('${id}')">Remove</button>
                </div>
                <div class="placed-asset-controls">
                    <button class="rotation-btn" onclick="blockTools.rotateAsset('${id}', 'N')">N</button>
                    <button class="rotation-btn" onclick="blockTools.rotateAsset('${id}', 'NE')">NE</button>
                    <button class="rotation-btn" onclick="blockTools.rotateAsset('${id}', 'E')">E</button>
                    <button class="rotation-btn" onclick="blockTools.rotateAsset('${id}', 'SE')">SE</button>
                    <button class="rotation-btn" onclick="blockTools.rotateAsset('${id}', 'S')">S</button>
                    <button class="rotation-btn" onclick="blockTools.rotateAsset('${id}', 'SW')">SW</button>
                    <button class="rotation-btn" onclick="blockTools.rotateAsset('${id}', 'W')">W</button>
                    <button class="rotation-btn" onclick="blockTools.rotateAsset('${id}', 'NW')">NW</button>
                </div>
            `;
            
            placedAssetsList.appendChild(assetItem);
        }
    }
    
    removeAssetById(id) {
        const asset = rendererManager.getAsset(id);
        if (asset) {
            const assetData = {
                id,
                url: asset.userData.url,
                position: { ...asset.position },
                rotation: { ...asset.rotation },
                scale: { ...asset.scale }
            };
            
            rendererManager.removeAsset(id);
            this.addToHistory('removeAsset', assetData);
            this.updatePlacedAssetsList();
        }
    }
    
    rotateAsset(id, direction) {
        const asset = rendererManager.getAsset(id);
        if (!asset) return;
        
        const rotationMap = {
            'N': 0,
            'NE': Math.PI / 4,
            'E': Math.PI / 2,
            'SE': 3 * Math.PI / 4,
            'S': Math.PI,
            'SW': 5 * Math.PI / 4,
            'W': 3 * Math.PI / 2,
            'NW': 7 * Math.PI / 4
        };
        
        asset.rotation.y = rotationMap[direction] || 0;
    }
    
    updateCursor() {
        const canvas = rendererManager.canvas;
        if (!canvas) return;
        
        const cursorMap = {
            'hand': 'grab',
            'select': 'pointer',
            'placeBlock': 'crosshair',
            'removeBlock': 'crosshair',
            'fill': 'crosshair',
            'colorDropper': 'crosshair',
            'placeAsset': 'crosshair'
        };
        
        canvas.style.cursor = cursorMap[this.currentTool] || 'default';
    }
    
    updateDebugInfo(clientX, clientY) {
        const gridPos = rendererManager.getGridPosition(clientX, clientY);
        const selected = rendererManager.selectedObject;
        
        const debugInfo = {
            mouseX: Math.round(clientX),
            mouseY: Math.round(clientY),
            gridX: gridPos ? gridPos.x : 'N/A',
            gridZ: gridPos ? gridPos.z : 'N/A',
            tool: this.currentTool,
            selected: selected ? (selected.userData.type || selected.userData.id || 'object') : 'none',
            blockCount: rendererManager.blocks.size,
            assetCount: rendererManager.assets.size
        };
        
        if (window.uiControls) {
            uiControls.updateDebugInfo(debugInfo);
        }
    }
    
    addToHistory(action, data) {
        if (window.actionHistory) {
            window.actionHistory.addAction(action, data);
        }
    }
}

// Export singleton instance
export const blockTools = new BlockTools();

// Make it globally available for onclick handlers
window.blockTools = blockTools;


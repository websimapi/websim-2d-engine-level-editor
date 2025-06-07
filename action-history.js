class ActionHistory {
    constructor() {
        this.history = [];
        this.currentIndex = -1;
        this.maxHistory = 50;
        
        this.initialize();
    }
    
    initialize() {
        this.setupButtons();
        this.setupKeyboardShortcuts();
        
        // Listen for clear level event
        window.addEventListener('clearLevel', () => {
            this.clear();
        });
        
        console.log('ActionHistory initialized');
    }
    
    setupButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        undoBtn.addEventListener('click', () => this.undo());
        redoBtn.addEventListener('click', () => this.redo());
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return; // Don't handle shortcuts when typing
            }
            
            if (e.ctrlKey || e.metaKey) {
                if (e.shiftKey && (e.key === 'Z' || e.key === 'z')) {
                    e.preventDefault();
                    this.redo();
                } else if (e.key === 'Z' || e.key === 'z') {
                    e.preventDefault();
                    this.undo();
                }
            }
        });
    }
    
    addAction(type, data) {
        // Remove any actions after current index (if we're not at the end)
        if (this.currentIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentIndex + 1);
        }
        
        // Add new action
        const action = {
            type,
            data,
            timestamp: Date.now(),
            id: Date.now().toString()
        };
        
        this.history.push(action);
        this.currentIndex++;
        
        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
            this.currentIndex--;
        }
        
        this.updateUI();
        this.updateButtons();
        
        console.log('Action added:', type, data);
    }
    
    undo() {
        if (!this.canUndo()) return false;
        
        const action = this.history[this.currentIndex];
        this.currentIndex--;
        
        this.executeUndo(action);
        this.updateUI();
        this.updateButtons();
        
        console.log('Undoing action:', action.type);
        return true;
    }
    
    redo() {
        if (!this.canRedo()) return false;
        
        this.currentIndex++;
        const action = this.history[this.currentIndex];
        
        this.executeRedo(action);
        this.updateUI();
        this.updateButtons();
        
        console.log('Redoing action:', action.type);
        return true;
    }
    
    executeUndo(action) {
        if (!window.rendererManager) return;
        
        switch (action.type) {
            case 'place':
                // Remove the placed block
                window.rendererManager.removeBlock(
                    action.data.position.x,
                    action.data.position.y,
                    action.data.position.z
                );
                break;
                
            case 'remove':
                // Restore the removed block
                const color = parseInt(action.data.color.replace('#', ''), 16);
                window.rendererManager.placeBlock(
                    action.data.position.x,
                    action.data.position.y,
                    action.data.position.z,
                    action.data.type,
                    action.data.orientation,
                    color,
                    action.data.textureUrl
                );
                break;
                
            case 'fill':
                // Remove all blocks from the fill
                action.data.blocks.forEach(blockData => {
                    window.rendererManager.removeBlock(
                        blockData.position.x,
                        blockData.position.y,
                        blockData.position.z
                    );
                });
                break;
                
            case 'placeAsset':
                // Remove the placed asset
                window.rendererManager.removeAsset(action.data.id);
                if (window.blockTools) {
                    window.blockTools.updatePlacedAssetsList();
                }
                break;
                
            case 'removeAsset':
                // Restore the removed asset
                this.restoreAsset(action.data);
                break;
        }
    }
    
    executeRedo(action) {
        if (!window.rendererManager) return;
        
        switch (action.type) {
            case 'place':
                // Place the block again
                const color = parseInt(action.data.color.replace('#', ''), 16);
                window.rendererManager.placeBlock(
                    action.data.position.x,
                    action.data.position.y,
                    action.data.position.z,
                    action.data.type,
                    action.data.orientation,
                    color,
                    action.data.textureUrl
                );
                break;
                
            case 'remove':
                // Remove the block again
                window.rendererManager.removeBlock(
                    action.data.position.x,
                    action.data.position.y,
                    action.data.position.z
                );
                break;
                
            case 'fill':
                // Place all blocks from the fill again
                action.data.blocks.forEach(blockData => {
                    const color = parseInt(blockData.color.replace('#', ''), 16);
                    window.rendererManager.placeBlock(
                        blockData.position.x,
                        blockData.position.y,
                        blockData.position.z,
                        blockData.type,
                        blockData.orientation,
                        color
                    );
                });
                break;
                
            case 'placeAsset':
                // Place the asset again
                this.restoreAsset(action.data);
                break;
                
            case 'removeAsset':
                // Remove the asset again
                window.rendererManager.removeAsset(action.data.id);
                if (window.blockTools) {
                    window.blockTools.updatePlacedAssetsList();
                }
                break;
        }
    }
    
    async restoreAsset(assetData) {
        try {
            const result = await window.rendererManager.placeAsset(
                assetData.url,
                assetData.position,
                assetData.rotation,
                assetData.scale
            );
            
            if (result && result.asset) {
                // Restore the original ID
                window.rendererManager.assets.delete(result.id);
                result.asset.userData.id = assetData.id;
                window.rendererManager.assets.set(assetData.id, result.asset);
                
                if (window.blockTools) {
                    window.blockTools.updatePlacedAssetsList();
                }
            }
        } catch (error) {
            console.error('Error restoring asset:', error);
        }
    }
    
    canUndo() {
        return this.currentIndex >= 0;
    }
    
    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }
    
    updateButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        if (undoBtn) {
            undoBtn.style.opacity = this.canUndo() ? '1' : '0.5';
            undoBtn.disabled = !this.canUndo();
        }
        
        if (redoBtn) {
            redoBtn.style.opacity = this.canRedo() ? '1' : '0.5';
            redoBtn.disabled = !this.canRedo();
        }
    }
    
    updateUI() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;
        
        historyList.innerHTML = '';
        
        this.history.forEach((action, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            if (index === this.currentIndex) {
                historyItem.classList.add('current');
            } else if (index > this.currentIndex) {
                historyItem.style.opacity = '0.5';
            }
            
            historyItem.textContent = this.getActionDescription(action);
            historyItem.title = new Date(action.timestamp).toLocaleTimeString();
            
            // Click to jump to this action
            historyItem.addEventListener('click', () => {
                this.jumpToAction(index);
            });
            
            historyList.appendChild(historyItem);
        });
        
        // Scroll to current item
        const currentItem = historyList.querySelector('.current');
        if (currentItem) {
            currentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
    getActionDescription(action) {
        switch (action.type) {
            case 'place':
                return `Place ${action.data.type} block`;
            case 'remove':
                return `Remove ${action.data.type} block`;
            case 'fill':
                return `Fill ${action.data.blocks.length} blocks`;
            case 'placeAsset':
                return `Place asset`;
            case 'removeAsset':
                return `Remove asset`;
            default:
                return action.type;
        }
    }
    
    jumpToAction(targetIndex) {
        while (this.currentIndex > targetIndex && this.canUndo()) {
            this.undo();
        }
        
        while (this.currentIndex < targetIndex && this.canRedo()) {
            this.redo();
        }
    }
    
    clear() {
        this.history = [];
        this.currentIndex = -1;
        this.updateUI();
        this.updateButtons();
        
        console.log('Action history cleared');
    }
    
    exportHistory() {
        return {
            history: this.history,
            currentIndex: this.currentIndex
        };
    }
    
    importHistory(data) {
        if (data && Array.isArray(data.history)) {
            this.history = data.history;
            this.currentIndex = data.currentIndex || -1;
            this.updateUI();
            this.updateButtons();
        }
    }
    
    getStats() {
        return {
            totalActions: this.history.length,
            currentIndex: this.currentIndex,
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        };
    }
}

// Export singleton instance
export const actionHistory = new ActionHistory();


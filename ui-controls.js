class UIControls {
    constructor() {
        this.currentTool = 'placeBlock';
        this.isDragging = false;
        this.draggedSection = null;
        this.dropZones = ['left-menu', 'right-panel', 'bottom-panel'];
        
        this.initialize();
    }
    
    initialize() {
        this.setupMenuToggle();
        this.setupToolButtons();
        this.setupDragAndDrop();
        this.setupPanelToggles();
        this.setupDebugConsole();
        this.setupFileNameEditor();
        this.setupNewLevelButton();
        this.setupTextureModal();
        
        console.log('UIControls initialized');
    }
    
    setupMenuToggle() {
        const menuToggle = document.getElementById('menuToggle');
        const leftMenu = document.getElementById('leftMenu');
        
        menuToggle.addEventListener('click', () => {
            leftMenu.classList.toggle('collapsed');
        });
    }
    
    setupToolButtons() {
        const tools = [
            'handTool', 'selectTool', 'placeBlockTool', 'removeBlockTool',
            'fillTool', 'colorDropperTool', 'placeAssetTool'
        ];
        
        tools.forEach(toolId => {
            const button = document.getElementById(toolId);
            if (button) {
                button.addEventListener('click', () => {
                    this.setActiveTool(toolId);
                });
            }
        });
        
        // Set initial active tool
        this.setActiveTool('placeBlockTool');
    }
    
    setActiveTool(toolId) {
        // Remove active class from all tools
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to selected tool
        const button = document.getElementById(toolId);
        if (button) {
            button.classList.add('active');
        }
        
        // Set current tool
        const toolMap = {
            'handTool': 'hand',
            'selectTool': 'select',
            'placeBlockTool': 'placeBlock',
            'removeBlockTool': 'removeBlock',
            'fillTool': 'fill',
            'colorDropperTool': 'colorDropper',
            'placeAssetTool': 'placeAsset'
        };
        
        this.currentTool = toolMap[toolId] || 'placeBlock';
        
        // Notify other managers about tool change
        this.dispatchToolChange();
    }
    
    dispatchToolChange() {
        window.dispatchEvent(new CustomEvent('toolChanged', {
            detail: { tool: this.currentTool }
        }));
    }
    
    setupDragAndDrop() {
        const menuSections = document.querySelectorAll('.menu-section');
        
        menuSections.forEach(section => {
            section.addEventListener('dragstart', (e) => {
                this.draggedSection = e.target;
                e.target.style.opacity = '0.5';
            });
            
            section.addEventListener('dragend', (e) => {
                e.target.style.opacity = '';
                this.draggedSection = null;
            });
        });
        
        // Setup drop zones
        this.setupDropZones();
    }
    
    setupDropZones() {
        const dropZones = [
            document.getElementById('leftMenu').querySelector('.menu-content'),
            document.getElementById('rightPanelContent'),
            document.getElementById('bottomPanelContent')
        ];
        
        dropZones.forEach(zone => {
            if (!zone) return;
            
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.style.background = 'rgba(76, 175, 80, 0.2)';
            });
            
            zone.addEventListener('dragleave', (e) => {
                zone.style.background = '';
            });
            
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.style.background = '';
                
                if (this.draggedSection && this.draggedSection !== zone) {
                    zone.appendChild(this.draggedSection);
                }
            });
        });
    }
    
    setupPanelToggles() {
        const rightToggle = document.getElementById('rightPanelToggle');
        const rightPanel = document.getElementById('rightPanel');
        const bottomToggle = document.getElementById('bottomPanelToggle');
        const bottomPanel = document.getElementById('bottomPanel');
        
        rightToggle.addEventListener('click', () => {
            rightPanel.classList.toggle('hidden');
            rightToggle.textContent = rightPanel.classList.contains('hidden') ? '→' : '←';
        });
        
        bottomToggle.addEventListener('click', () => {
            bottomPanel.classList.toggle('hidden');
            bottomToggle.textContent = bottomPanel.classList.contains('hidden') ? '↑' : '↓';
        });
    }
    
    setupDebugConsole() {
        const debugConsole = document.getElementById('debugConsole');
        
        document.addEventListener('keydown', (e) => {
            if (e.key === '`') {
                e.preventDefault();
                debugConsole.classList.toggle('hidden');
            }
        });
    }
    
    setupFileNameEditor() {
        const fileNameInput = document.getElementById('fileName');
        
        fileNameInput.addEventListener('blur', () => {
            this.saveFileName();
        });
        
        fileNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                fileNameInput.blur();
            }
        });
    }
    
    setupNewLevelButton() {
        const newLevelBtn = document.getElementById('newLevelBtn');
        
        newLevelBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to create a new level? All unsaved changes will be lost.')) {
                this.createNewLevel();
            }
        });
    }
    
    setupTextureModal() {
        const generateBtn = document.getElementById('generateTextureBtn');
        const modal = document.getElementById('textureModal');
        const confirmBtn = document.getElementById('generateTextureConfirm');
        const cancelBtn = document.getElementById('generateTextureCancel');
        
        generateBtn.addEventListener('click', () => {
            modal.classList.remove('hidden');
        });
        
        cancelBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
        
        confirmBtn.addEventListener('click', () => {
            this.generateTexture();
        });
        
        // Close modal on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    }
    
    async generateTexture() {
        const prompt = document.getElementById('texturePrompt').value.trim();
        const size = document.getElementById('textureSize').value;
        const type = document.getElementById('textureType').value;
        
        if (!prompt) {
            alert('Please enter a texture description');
            return;
        }
        
        try {
            const confirmBtn = document.getElementById('generateTextureConfirm');
            confirmBtn.textContent = 'Generating...';
            confirmBtn.disabled = true;
            
            const fullPrompt = `${prompt}, ${type} texture, ${size}x${size} resolution, seamless tileable`;
            
            const result = await websim.imageGen({
                prompt: fullPrompt,
                width: parseInt(size),
                height: parseInt(size)
            });
            
            if (result && result.url) {
                // Add to asset library
                window.dispatchEvent(new CustomEvent('textureGenerated', {
                    detail: { url: result.url, name: `Generated_${type}_${Date.now()}` }
                }));
                
                document.getElementById('textureModal').classList.add('hidden');
                document.getElementById('texturePrompt').value = '';
            }
        } catch (error) {
            console.error('Error generating texture:', error);
            alert('Failed to generate texture. Please try again.');
        } finally {
            const confirmBtn = document.getElementById('generateTextureConfirm');
            confirmBtn.textContent = 'Generate';
            confirmBtn.disabled = false;
        }
    }
    
    saveFileName() {
        const fileName = document.getElementById('fileName').value.trim();
        if (fileName) {
            localStorage.setItem('levelFileName', fileName);
            window.dispatchEvent(new CustomEvent('fileNameChanged', {
                detail: { fileName }
            }));
        }
    }
    
    createNewLevel() {
        // Clear the scene
        window.dispatchEvent(new CustomEvent('clearLevel'));
        
        // Reset file name
        document.getElementById('fileName').value = 'Untitled Level';
        this.saveFileName();
        
        // Reset UI state
        this.setActiveTool('placeBlockTool');
        document.getElementById('blockType').value = 'full';
        document.getElementById('blockOrientation').value = 'north';
        document.getElementById('blockColor').value = '#ffffff';
        document.getElementById('gridSize').value = '32';
    }
    
    updateDebugInfo(info) {
        const debugContent = document.getElementById('debugContent');
        if (!debugContent) return;
        
        debugContent.innerHTML = `
            <div>Mouse: (${info.mouseX || 0}, ${info.mouseY || 0})</div>
            <div>Grid: (${info.gridX || 0}, ${info.gridZ || 0})</div>
            <div>Tool: ${info.tool || 'none'}</div>
            <div>Selected: ${info.selected || 'none'}</div>
            <div>Blocks: ${info.blockCount || 0}</div>
            <div>Assets: ${info.assetCount || 0}</div>
        `;
    }
    
    updateUserCount(count) {
        const userCountElement = document.getElementById('userCount');
        if (userCountElement) {
            userCountElement.textContent = count;
        }
    }
    
    addUserToList(user) {
        const usersList = document.getElementById('usersList');
        if (!usersList) return;
        
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.textContent = user.username || 'Anonymous';
        userItem.dataset.userId = user.id;
        
        usersList.appendChild(userItem);
    }
    
    removeUserFromList(userId) {
        const userItem = document.querySelector(`[data-user-id="${userId}"]`);
        if (userItem) {
            userItem.remove();
        }
    }
    
    showNotification(message, type = 'info') {
        // Create a simple notification system
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ff4444' : '#4CAF50'};
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 2000;
            animation: fadeIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    getCurrentTool() {
        return this.currentTool;
    }
    
    getBlockSettings() {
        return {
            type: document.getElementById('blockType').value,
            orientation: document.getElementById('blockOrientation').value,
            color: document.getElementById('blockColor').value,
            gridSize: parseInt(document.getElementById('gridSize').value)
        };
    }
    
    setBlockSettings(settings) {
        if (settings.type) document.getElementById('blockType').value = settings.type;
        if (settings.orientation) document.getElementById('blockOrientation').value = settings.orientation;
        if (settings.color) document.getElementById('blockColor').value = settings.color;
        if (settings.gridSize) document.getElementById('gridSize').value = settings.gridSize;
    }
}

// Export singleton instance
export const uiControls = new UIControls();


class FileManager {
    constructor() {
        this.currentFileName = 'Untitled Level';
        this.initialize();
    }
    
    initialize() {
        this.setupFileButtons();
        this.loadFileName();
        
        // Listen for file name changes
        window.addEventListener('fileNameChanged', (e) => {
            this.currentFileName = e.detail.fileName;
        });
        
        console.log('FileManager initialized');
    }
    
    setupFileButtons() {
        const exportBtn = document.getElementById('exportBtn');
        const importBtn = document.getElementById('importBtn');
        const fileInput = document.getElementById('fileInput');
        
        exportBtn.addEventListener('click', () => {
            this.exportLevel();
        });
        
        importBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', (e) => {
            this.importLevel(e);
        });
    }
    
    loadFileName() {
        const stored = localStorage.getItem('levelFileName');
        if (stored) {
            this.currentFileName = stored;
            document.getElementById('fileName').value = stored;
        }
    }
    
    async exportLevel() {
        try {
            // Get data from all managers
            const levelData = {
                metadata: {
                    name: this.currentFileName,
                    version: '1.0',
                    created: new Date().toISOString(),
                    exported: new Date().toISOString()
                },
                scene: this.getSceneData(),
                assets: this.getAssetLibraryData(),
                settings: this.getSettingsData()
            };
            
            // Ask user for export format
            const exportFormat = await this.promptExportFormat();
            
            if (exportFormat === 'url') {
                await this.exportAsWebsimURL(levelData);
            } else if (exportFormat === 'json') {
                this.exportAsJSON(levelData);
            } else if (exportFormat === 'zip') {
                await this.exportAsZip(levelData);
            }
            
        } catch (error) {
            console.error('Error exporting level:', error);
            alert('Failed to export level. Please try again.');
        }
    }
    
    promptExportFormat() {
        return new Promise((resolve) => {
            const choice = prompt(
                'Choose export format:\n' +
                '1. WebSim URL (default)\n' +
                '2. JSON file\n' +
                '3. ZIP package\n\n' +
                'Enter 1, 2, or 3:',
                '1'
            );
            
            switch (choice) {
                case '2':
                    resolve('json');
                    break;
                case '3':
                    resolve('zip');
                    break;
                default:
                    resolve('url');
                    break;
            }
        });
    }
    
    async exportAsWebsimURL(levelData) {
        try {
            const jsonString = JSON.stringify(levelData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const file = new File([blob], `${this.currentFileName}.json`, { type: 'application/json' });
            
            const url = await websim.upload(file);
            
            // Copy URL to clipboard
            await navigator.clipboard.writeText(url);
            
            alert(`Level exported to WebSim!\nURL copied to clipboard: ${url}`);
        } catch (error) {
            console.error('Error uploading to WebSim:', error);
            // Fallback to JSON download
            this.exportAsJSON(levelData);
        }
    }
    
    exportAsJSON(levelData) {
        const jsonString = JSON.stringify(levelData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentFileName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('Level exported as JSON file!');
    }
    
    async exportAsZip(levelData) {
        // For now, just export as JSON
        // TODO: Implement ZIP export with assets
        this.exportAsJSON(levelData);
    }
    
    async importLevel(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const levelData = JSON.parse(text);
            
            if (confirm('Import this level? This will replace the current level.')) {
                await this.loadLevelData(levelData);
                
                // Update file name
                if (levelData.metadata && levelData.metadata.name) {
                    this.currentFileName = levelData.metadata.name;
                    document.getElementById('fileName').value = this.currentFileName;
                    localStorage.setItem('levelFileName', this.currentFileName);
                }
                
                alert('Level imported successfully!');
            }
            
            // Clear input
            event.target.value = '';
            
        } catch (error) {
            console.error('Error importing level:', error);
            alert('Failed to import level. Please check the file format.');
        }
    }
    
    getSceneData() {
        // Get data from renderer manager
        if (window.rendererManager) {
            return window.rendererManager.exportData();
        }
        return {};
    }
    
    getAssetLibraryData() {
        // Get data from asset manager
        if (window.assetManager) {
            return window.assetManager.exportData();
        }
        return {};
    }
    
    getSettingsData() {
        // Get current UI settings
        if (window.uiControls) {
            return window.uiControls.getBlockSettings();
        }
        return {};
    }
    
    async loadLevelData(levelData) {
        // Clear current level
        window.dispatchEvent(new CustomEvent('clearLevel'));
        
        // Load scene data
        if (levelData.scene && window.rendererManager) {
            await window.rendererManager.importData(levelData.scene);
        }
        
        // Load asset library
        if (levelData.assets && window.assetManager) {
            window.assetManager.importData(levelData.assets);
        }
        
        // Load settings
        if (levelData.settings && window.uiControls) {
            window.uiControls.setBlockSettings(levelData.settings);
            
            // Update grid size if needed
            if (levelData.settings.gridSize && window.rendererManager) {
                window.rendererManager.updateGridSize(levelData.settings.gridSize);
            }
        }
        
        // Clear action history
        if (window.actionHistory) {
            window.actionHistory.clear();
        }
    }
    
    saveToLocalStorage() {
        try {
            const levelData = {
                metadata: {
                    name: this.currentFileName,
                    version: '1.0',
                    saved: new Date().toISOString()
                },
                scene: this.getSceneData(),
                assets: this.getAssetLibraryData(),
                settings: this.getSettingsData()
            };
            
            localStorage.setItem('currentLevel', JSON.stringify(levelData));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }
    
    loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem('currentLevel');
            if (stored) {
                const levelData = JSON.parse(stored);
                this.loadLevelData(levelData);
                
                if (levelData.metadata && levelData.metadata.name) {
                    this.currentFileName = levelData.metadata.name;
                    document.getElementById('fileName').value = this.currentFileName;
                }
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
        }
    }
    
    autoSave() {
        // Auto-save every 30 seconds
        setInterval(() => {
            this.saveToLocalStorage();
        }, 30000);
    }
    
    getCurrentFileName() {
        return this.currentFileName;
    }
}

// Export singleton instance
export const fileManager = new FileManager();


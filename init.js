import { rendererManager } from './renderer-manager.js';
import { uiControls } from './ui-controls.js';
import { assetManager } from './assets.js';
import { fileManager } from './file-manager.js';
import { blockTools } from './block-tools.js';
import { actionHistory } from './action-history.js';
import { multiplayerManager } from './multiplayer-manager.js';

class LevelEditor {
    constructor() {
        this.initialized = false;
    }
    
    async initialize() {
        try {
            console.log('Initializing Level Editor...');
            
            // Initialize core systems
            await rendererManager.initialize();
            
            // Initialize managers (these are already initialized in their constructors)
            // Just make them globally available
            window.rendererManager = rendererManager;
            window.uiControls = uiControls;
            window.assetManager = assetManager;
            window.fileManager = fileManager;
            window.blockTools = blockTools;
            window.actionHistory = actionHistory;
            window.multiplayerManager = multiplayerManager;
            
            // Setup global event listeners
            this.setupGlobalEvents();
            
            // Auto-save setup
            fileManager.autoSave();
            
            // Try to load previous session
            fileManager.loadFromLocalStorage();
            
            this.initialized = true;
            console.log('Level Editor initialized successfully!');
            
            // Show welcome message
            uiControls.showNotification('Level Editor loaded! Use the tools on the left to start building.', 'info');
            
        } catch (error) {
            console.error('Error initializing Level Editor:', error);
            alert('Failed to initialize Level Editor. Please refresh the page.');
        }
    }
    
    setupGlobalEvents() {
        // Clear level event
        window.addEventListener('clearLevel', () => {
            rendererManager.clear();
            actionHistory.clear();
            
            if (window.blockTools) {
                blockTools.updatePlacedAssetsList();
            }
        });
        
        // Asset selection events
        window.addEventListener('assetSelected', (e) => {
            console.log('Asset selected:', e.detail.asset);
        });
        
        // Error handling
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            uiControls.showNotification('An error occurred. Check console for details.', 'error');
        });
        
        // Handle window unload
        window.addEventListener('beforeunload', (e) => {
            fileManager.saveToLocalStorage();
        });
        
        // Handle visibility change (for auto-save when tab becomes hidden)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                fileManager.saveToLocalStorage();
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const editor = new LevelEditor();
    editor.initialize();
});

// Make editor globally available for debugging
window.levelEditor = new LevelEditor();


class AssetManager {
    constructor() {
        this.assets = new Map(); // id -> { type: 'model'|'texture', url, name, preview }
        this.selectedAsset = null;
        this.assetCounter = 0;
        
        this.initialize();
    }
    
    initialize() {
        this.setupUploadButtons();
        this.setupAssetSelection();
        this.loadStoredAssets();
        
        // Listen for generated textures
        window.addEventListener('textureGenerated', (e) => {
            this.addAsset('texture', e.detail.url, e.detail.name);
        });
        
        console.log('AssetManager initialized');
    }
    
    setupUploadButtons() {
        const uploadModelBtn = document.getElementById('uploadModelBtn');
        const uploadTextureBtn = document.getElementById('uploadTextureBtn');
        const modelInput = document.getElementById('modelInput');
        const textureInput = document.getElementById('textureInput');
        
        uploadModelBtn.addEventListener('click', () => {
            modelInput.click();
        });
        
        uploadTextureBtn.addEventListener('click', () => {
            textureInput.click();
        });
        
        modelInput.addEventListener('change', (e) => {
            this.handleFileUpload(e, 'model');
        });
        
        textureInput.addEventListener('change', (e) => {
            this.handleFileUpload(e, 'texture');
        });
    }
    
    async handleFileUpload(event, type) {
        const file = event.target.file[0];
        if (!file) return;
        
        try {
            // Upload file using WebSim's upload function
            const url = await websim.upload(file);
            const name = file.name.split('.')[0];
            
            this.addAsset(type, url, name);
            
            // Clear input
            event.target.value = '';
            
            console.log(`${type} uploaded:`, url);
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Failed to upload file. Please try again.');
        }
    }
    
    addAsset(type, url, name) {
        const id = `asset_${this.assetCounter++}`;
        const asset = {
            id,
            type,
            url,
            name: name || `${type}_${id}`,
            preview: this.generatePreview(type)
        };
        
        this.assets.set(id, asset);
        this.renderAssetList();
        this.saveAssets();
        
        return id;
    }
    
    removeAsset(id) {
        if (this.assets.has(id)) {
            this.assets.delete(id);
            this.renderAssetList();
            this.saveAssets();
            
            if (this.selectedAsset === id) {
                this.selectedAsset = null;
            }
        }
    }
    
    generatePreview(type) {
        switch (type) {
            case 'model':
                return '🎲';
            case 'texture':
                return '🖼️';
            default:
                return '📄';
        }
    }
    
    renderAssetList() {
        const assetList = document.getElementById('assetList');
        if (!assetList) return;
        
        assetList.innerHTML = '';
        
        for (const asset of this.assets.values()) {
            const assetItem = document.createElement('div');
            assetItem.className = 'asset-item';
            assetItem.dataset.assetId = asset.id;
            
            if (this.selectedAsset === asset.id) {
                assetItem.classList.add('selected');
            }
            
            assetItem.innerHTML = `
                <div class="asset-preview">${asset.preview}</div>
                <div class="asset-name" title="${asset.name}">${asset.name}</div>
                <button class="asset-delete" onclick="assetManager.removeAsset('${asset.id}')">×</button>
            `;
            
            assetItem.addEventListener('click', (e) => {
                if (!e.target.classList.contains('asset-delete')) {
                    this.selectAsset(asset.id);
                }
            });
            
            assetList.appendChild(assetItem);
        }
    }
    
    selectAsset(id) {
        const asset = this.assets.get(id);
        if (!asset) return;
        
        this.selectedAsset = id;
        this.renderAssetList();
        
        // If it's a model, switch to place asset tool
        if (asset.type === 'model') {
            document.getElementById('placeAssetTool').click();
        }
        
        // Dispatch selection event
        window.dispatchEvent(new CustomEvent('assetSelected', {
            detail: { asset }
        }));
    }
    
    getSelectedAsset() {
        return this.selectedAsset ? this.assets.get(this.selectedAsset) : null;
    }
    
    getAsset(id) {
        return this.assets.get(id);
    }
    
    getAllAssets() {
        return Array.from(this.assets.values());
    }
    
    setupAssetSelection() {
        // Asset name editing
        document.addEventListener('dblclick', (e) => {
            if (e.target.classList.contains('asset-name')) {
                this.editAssetName(e.target);
            }
        });
    }
    
    editAssetName(nameElement) {
        const assetItem = nameElement.closest('.asset-item');
        const assetId = assetItem.dataset.assetId;
        const asset = this.assets.get(assetId);
        
        if (!asset) return;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = asset.name;
        input.className = 'asset-name-edit';
        input.style.cssText = `
            width: 100%;
            background: #222;
            border: 1px solid #4CAF50;
            color: #fff;
            padding: 2px;
            font-size: 10px;
            border-radius: 2px;
        `;
        
        nameElement.replaceWith(input);
        input.focus();
        input.select();
        
        const saveEdit = () => {
            const newName = input.value.trim() || asset.name;
            asset.name = newName;
            
            const newNameElement = document.createElement('div');
            newNameElement.className = 'asset-name';
            newNameElement.title = newName;
            newNameElement.textContent = newName;
            
            input.replaceWith(newNameElement);
            this.saveAssets();
        };
        
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveEdit();
            } else if (e.key === 'Escape') {
                input.replaceWith(nameElement);
            }
        });
    }
    
    saveAssets() {
        const assetData = {};
        for (const [id, asset] of this.assets) {
            assetData[id] = {
                type: asset.type,
                url: asset.url,
                name: asset.name
            };
        }
        localStorage.setItem('levelAssets', JSON.stringify(assetData));
    }
    
    loadStoredAssets() {
        try {
            const stored = localStorage.getItem('levelAssets');
            if (stored) {
                const assetData = JSON.parse(stored);
                for (const [id, data] of Object.entries(assetData)) {
                    const asset = {
                        id,
                        type: data.type,
                        url: data.url,
                        name: data.name,
                        preview: this.generatePreview(data.type)
                    };
                    this.assets.set(id, asset);
                    this.assetCounter = Math.max(this.assetCounter, parseInt(id.split('_')[1]) + 1);
                }
                this.renderAssetList();
            }
        } catch (error) {
            console.error('Error loading stored assets:', error);
        }
    }
    
    exportData() {
        const assetData = {};
        for (const [id, asset] of this.assets) {
            assetData[id] = {
                type: asset.type,
                url: asset.url,
                name: asset.name
            };
        }
        return assetData;
    }
    
    importData(assetData) {
        this.assets.clear();
        this.assetCounter = 0;
        
        if (assetData) {
            for (const [id, data] of Object.entries(assetData)) {
                const asset = {
                    id,
                    type: data.type,
                    url: data.url,
                    name: data.name,
                    preview: this.generatePreview(data.type)
                };
                this.assets.set(id, asset);
                this.assetCounter = Math.max(this.assetCounter, parseInt(id.split('_')[1]) + 1);
            }
        }
        
        this.renderAssetList();
        this.saveAssets();
    }
    
    clearAssets() {
        this.assets.clear();
        this.selectedAsset = null;
        this.assetCounter = 0;
        this.renderAssetList();
        this.saveAssets();
    }
}

// Export singleton instance
export const assetManager = new AssetManager();

// Make it globally available for onclick handlers
window.assetManager = assetManager;


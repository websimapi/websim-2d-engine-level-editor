class MultiplayerManager {
    constructor() {
        this.isEnabled = false; // Disabled by default as requested
        this.userCount = 1;
        this.users = new Map();
        
        this.initialize();
    }
    
    initialize() {
        // Keep UI but disable functionality
        this.updateUserCount();
        this.addLocalUser();
        
        console.log('MultiplayerManager initialized (disabled)');
    }
    
    addLocalUser() {
        const localUser = {
            id: 'local',
            username: 'You',
            isLocal: true
        };
        
        this.users.set('local', localUser);
        this.updateUI();
    }
    
    updateUserCount() {
        if (window.uiControls) {
            window.uiControls.updateUserCount(this.userCount);
        }
    }
    
    updateUI() {
        const usersList = document.getElementById('usersList');
        if (!usersList) return;
        
        usersList.innerHTML = '';
        
        for (const user of this.users.values()) {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            userItem.textContent = user.username;
            usersList.appendChild(userItem);
        }
    }
    
    // Stub methods for potential future multiplayer implementation
    connect() {
        console.log('Multiplayer connection disabled');
    }
    
    disconnect() {
        console.log('Multiplayer disconnection disabled');
    }
    
    sendUpdate(data) {
        console.log('Multiplayer update disabled:', data);
    }
    
    broadcastAction(action, data) {
        console.log('Multiplayer broadcast disabled:', action, data);
    }
}

// Export singleton instance
export const multiplayerManager = new MultiplayerManager();


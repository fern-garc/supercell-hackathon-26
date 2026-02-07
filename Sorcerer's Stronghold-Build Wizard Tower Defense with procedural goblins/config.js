export const CONFIG = {
    GROUND_SIZE: 100,
    TOWER_HEALTH: 100,
    INITIAL_GOLD: 100,
    WIZARD_ATTACK_RANGE: 15,
    WIZARD_ATTACK_SPEED: 1.5, // shots per second
    FIREBALL_SPEED: 20,
    FIREBALL_DAMAGE: 10,
    GOBLIN_SPAWN_INTERVAL: 3, // seconds
    WAVE_DURATION: 30, // seconds
    ASSETS: {
        GRASS: 'https://rosebud.ai/assets/grass-texture.webp?pmVO',
        STONE: 'https://rosebud.ai/assets/stone-wall-texture.webp?wfNp',
        GOBLIN_ICON: 'https://rosebud.ai/assets/goblin-icon.webp?RJ1s'
    }
};

export const BUILDINGS = {
    CRYSTAL_PYLON: {
        name: 'Crystal Pylon',
        cost: 50,
        damage: 5,
        range: 12,
        attackSpeed: 1,
        color: 0x00ffff
    }
};

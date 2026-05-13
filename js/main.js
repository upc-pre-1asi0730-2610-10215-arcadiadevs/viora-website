import { i18n } from './i18n.js';
import { initializeLiquidGlassEffect } from './effects/liquid-glass.effect.js';
import { initializeMagneticEffect } from './effects/magnetic.effect.js';
import { initializeHoverSoundEffect } from './effects/hover-sound.effect.js';
import { initializeSoundToggle } from './sound.js';
import { initializeProblemCardsSection, initializeProblemSolutionSection } from './components/problem-solution-section.js';
import { initializeAboutIntroSection } from './components/about-intro-section.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await i18n.init();
        initializeSoundToggle();

        initializeLiquidGlassEffect();
        initializeMagneticEffect();
        initializeHoverSoundEffect();

        initializeAboutIntroSection();

        initializeProblemCardsSection();

    } catch (error) {
        console.error(error);
    }
});

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/sections.css';

import { initCarousel } from './carousel';
import { initForm, initInterestLinks } from './form';
import { initHero, initMedia, initParallax, initReveal } from './motion';
import { initActiveSection, initHeader, initMobileNav } from './nav';

initMedia();
initHero();
initHeader();
initMobileNav();
initActiveSection();
initParallax();
initReveal();
initInterestLinks();
initForm();

const carousel = document.querySelector<HTMLElement>('[data-carousel]');
if (carousel) initCarousel(carousel, __SITE__.testimonials);

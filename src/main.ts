import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/sections.css';
import './styles/valuation.css';

import { initContactForm, initPropertyLinks } from './form';
import { initHero, initMedia, initParallax, initReveal } from './motion';
import { initActiveSection, initHeader, initMobileNav } from './nav';

initMedia();
initHero();
initHeader();
initMobileNav();
initActiveSection();
initParallax();
initReveal();
initPropertyLinks();
initContactForm();

document.querySelectorAll('[data-year]').forEach((el) => {
  el.textContent = String(new Date().getFullYear());
});

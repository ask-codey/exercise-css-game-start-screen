// Checks the motion in your styles.css for the Star Hopper start screen: the @keyframes rules, the animations
// on the stars, the title and the loading bar, the transition that lifts the menu buttons, and what changes for
// readers who asked for less motion. It reads index.html and styles.css the way a browser does, and works out
// which rule wins for each part of the screen. It can't watch anything move, so look at the page too: the
// README's checklist covers that.
// Run it with: npm test (run npm install once first). You don't need to change this file.
const { test } = require('node:test');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const read = (file) => (existsSync(path.join(__dirname, file)) ? readFileSync(path.join(__dirname, file), 'utf8') : '');
const html = read('index.html');
const css = read('styles.css');

// A browser loads styles.css through the link line. The checks have no web server, so they add the file to the
// page themselves, after checking that the link line is there.
const { window } = new JSDOM(html);
const { document } = window;
const styleElement = document.createElement('style');
styleElement.textContent = css;
document.head.append(styleElement);
const sheet = styleElement.sheet;

const one = (selector) => document.querySelector(selector);
const all = (selector) => [...document.querySelectorAll(selector)];

// Fails a check with a plain message, so the output shows what to fix and no stack trace to scroll past.
function check(passed, message) {
  if (!passed) {
    const problem = new Error(message);
    problem.stack = `Not yet: ${message}`;
    throw problem;
  }
}

// ---------- Reading the stylesheet ----------

// Splits "a, b(c, d)" at the commas that aren't inside brackets.
function splitTop(text, separator) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const character of text) {
    if (character === '(') depth++;
    if (character === ')') depth--;
    const splits = separator === ',' ? character === ',' : /\s/.test(character);
    if (splits && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

// Which reader a media query is for: 'reduce' (asked for less motion), 'full' (no preference), or null for
// a media query that isn't about motion.
function motionAudience(mediaText) {
  const text = mediaText.toLowerCase().replace(/\s+/g, ' ');
  if (/prefers-reduced-motion ?: ?reduce/.test(text) || /\(prefers-reduced-motion\)/.test(text)) return 'reduce';
  if (/prefers-reduced-motion ?: ?no-preference/.test(text)) return 'full';
  return null;
}

// Every style rule and @keyframes rule that applies for one kind of reader ('full' or 'reduce'), in file order.
// Media queries that aren't about motion are left out: this screen doesn't need them.
const reducedMotionQueries = [];
function collect(reader) {
  const styleRules = [];
  const keyframes = new Map();
  function walk(rules) {
    for (const rule of rules) {
      if (rule.selectorText !== undefined && rule.style) {
        styleRules.push(rule);
      } else if (rule.type === 7 || rule.constructor.name === 'CSSKeyframesRule') {
        keyframes.set(rule.name, rule);
      } else if (rule.media) {
        const audience = motionAudience(rule.media.mediaText);
        if (audience && reader === 'full' && !reducedMotionQueries.includes(rule)) reducedMotionQueries.push(rule);
        if (audience === reader) walk(rule.cssRules);
      } else if (rule.cssRules) {
        walk(rule.cssRules);
      }
    }
  }
  walk(sheet.cssRules);
  return { styleRules, keyframes };
}
const full = collect('full');
const reduced = collect('reduce');

// A selector's specificity as one number: ids, then classes, attributes and pseudo-classes, then element names.
function specificity(selector) {
  let text = selector.replace(/"[^"]*"|'[^']*'/g, '').replace(/:where\([^)]*\)/g, '');
  text = text.replace(/:(?:is|not|has)\(([^)]*)\)/g, ' $1 ');
  const ids = (text.match(/#[\w-]+/g) || []).length;
  const classes = (text.match(/\.[\w-]+|\[[^\]]*\]|(?<!:):[\w-]+(\([^)]*\))?/g) || []).length;
  const bare = text.replace(/#[\w-]+|\.[\w-]+|\[[^\]]*\]|::?[\w-]+(\([^)]*\))?/g, ' ');
  const types = (bare.match(/(^|[\s>+~])[a-zA-Z][\w-]*/g) || []).length + (text.match(/::[\w-]+/g) || []).length;
  return ids * 10000 + classes * 100 + types;
}

// True when a selector picks the element in a state: 'base' (nothing happening), 'hover' or 'focus'.
const HOVER = /:hover\b/;
const FOCUS = /:focus(-visible|-within)?\b/;
function selects(selector, element, state) {
  if (selector.includes('::')) return false;
  if (HOVER.test(selector) && state !== 'hover') return false;
  if (FOCUS.test(selector) && state !== 'focus') return false;
  const plain = selector.replace(/:hover\b|:focus-visible\b|:focus-within\b|:focus\b/g, '').trim();
  const fixed = (plain || '*').replace(/([>+~]|\s)$/, '$1*');
  try { return element.matches(fixed); } catch { return false; }
}

// The parts of the transition and animation shorthands, so a shorthand and its own properties can be compared.
const TIMING = /^(ease|ease-in|ease-out|ease-in-out|linear|step-start|step-end|steps\(.*\)|cubic-bezier\(.*\)|linear\(.*\))$/;
const TIME = /^-?(\d*\.?\d+)(ms|s)$/;
const TRANSITION_PARTS = ['transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay'];
const ANIMATION_PARTS = ['animation-name', 'animation-duration', 'animation-timing-function', 'animation-delay',
  'animation-iteration-count', 'animation-direction', 'animation-fill-mode', 'animation-play-state'];

function expandTransition(value) {
  const parts = { 'transition-property': [], 'transition-duration': [], 'transition-timing-function': [], 'transition-delay': [] };
  for (const item of splitTop(value, ',')) {
    const one = { property: 'all', duration: '0s', timing: 'ease', delay: '0s' };
    let times = 0;
    for (const token of splitTop(item, ' ')) {
      if (TIME.test(token)) { if (times++ === 0) one.duration = token; else one.delay = token; }
      else if (TIMING.test(token)) one.timing = token;
      else one.property = token;
    }
    parts['transition-property'].push(one.property);
    parts['transition-duration'].push(one.duration);
    parts['transition-timing-function'].push(one.timing);
    parts['transition-delay'].push(one.delay);
  }
  return parts;
}

function expandAnimation(value) {
  const parts = Object.fromEntries(ANIMATION_PARTS.map((part) => [part, []]));
  for (const item of splitTop(value, ',')) {
    const one = { name: 'none', duration: '0s', timing: 'ease', delay: '0s', count: '1', direction: 'normal', fill: null, play: 'running' };
    let times = 0;
    for (const token of splitTop(item, ' ')) {
      if (TIME.test(token)) { if (times++ === 0) one.duration = token; else one.delay = token; }
      else if (TIMING.test(token)) one.timing = token;
      else if (token === 'infinite' || /^\d*\.?\d+$/.test(token)) one.count = token;
      else if (/^(normal|reverse|alternate|alternate-reverse)$/.test(token)) one.direction = token;
      else if (/^(forwards|backwards|both)$/.test(token) || (token === 'none' && one.fill === null)) one.fill = token;
      else if (/^(running|paused)$/.test(token)) one.play = token;
      else one.name = token;
    }
    parts['animation-name'].push(one.name);
    parts['animation-duration'].push(one.duration);
    parts['animation-timing-function'].push(one.timing);
    parts['animation-delay'].push(one.delay);
    parts['animation-iteration-count'].push(one.count);
    parts['animation-direction'].push(one.direction);
    parts['animation-fill-mode'].push(one.fill || 'none');
    parts['animation-play-state'].push(one.play);
  }
  return parts;
}

// Every declaration in a rule, with the shorthands split into their parts.
function declarations(rule) {
  const list = [];
  for (let i = 0; i < rule.style.length; i++) {
    const property = rule.style[i];
    const value = rule.style.getPropertyValue(property).trim();
    const important = rule.style.getPropertyPriority(property) === 'important';
    if (property === 'transition') {
      for (const [part, values] of Object.entries(expandTransition(value))) list.push({ property: part, value: values, important });
    } else if (property === 'animation') {
      for (const [part, values] of Object.entries(expandAnimation(value))) list.push({ property: part, value: values, important });
    } else if (property.startsWith('transition-') || property.startsWith('animation-')) {
      list.push({ property, value: splitTop(value, ','), important });
    } else {
      list.push({ property, value, important });
    }
  }
  return list;
}

// The winning value of each property for an element, worked out the way the cascade does it: !important first,
// then the higher specificity, then the rule that comes later.
const DEFAULTS = {
  'transition-property': ['all'], 'transition-duration': ['0s'], 'transition-timing-function': ['ease'], 'transition-delay': ['0s'],
  'animation-name': ['none'], 'animation-duration': ['0s'], 'animation-timing-function': ['ease'], 'animation-delay': ['0s'],
  'animation-iteration-count': ['1'], 'animation-direction': ['normal'], 'animation-fill-mode': ['none'], 'animation-play-state': ['running'],
  translate: 'none', rotate: 'none', scale: 'none', transform: 'none', opacity: '1',
};
function cascade(element, state, reader) {
  const winners = {};
  let order = 0;
  for (const rule of reader.styleRules) {
    const matching = splitTop(rule.selectorText, ',').filter((selector) => selects(selector, element, state));
    if (!matching.length) continue;
    const weight = Math.max(...matching.map(specificity));
    for (const declaration of declarations(rule)) {
      order++;
      const rank = [declaration.important ? 1 : 0, weight, order];
      const current = winners[declaration.property];
      const wins = !current || rank[0] > current.rank[0] || (rank[0] === current.rank[0] && (rank[1] > current.rank[1] || (rank[1] === current.rank[1] && rank[2] > current.rank[2])));
      if (wins) winners[declaration.property] = { value: declaration.value, rank };
    }
  }
  const value = (property) => (winners[property] ? winners[property].value : DEFAULTS[property]);
  return { value };
}

const ms = (time) => {
  const match = String(time).trim().match(TIME);
  if (!match) return 0;
  return parseFloat(time) * (match[2] === 's' ? 1000 : 1);
};

// The animations an element plays: one entry per name, with its other parts lined up the way a browser does.
function animationsOf(element, state, reader) {
  const styles = cascade(element, state, reader);
  const names = styles.value('animation-name');
  const part = (property, index) => { const list = styles.value(property); return list[index % list.length]; };
  return names.map((name, index) => ({
    name,
    keyframes: name === 'none' ? null : reader.keyframes.get(name) || null,
    duration: ms(part('animation-duration', index)),
    delay: ms(part('animation-delay', index)),
    count: part('animation-iteration-count', index),
    direction: part('animation-direction', index),
    fill: part('animation-fill-mode', index),
    play: part('animation-play-state', index),
  })).filter((animation) => animation.name !== 'none');
}

// The transitions an element has: one entry per property.
function transitionsOf(element, reader) {
  const styles = cascade(element, 'base', reader);
  const properties = styles.value('transition-property');
  const part = (property, index) => { const list = styles.value(property); return list[index % list.length]; };
  return properties.map((property, index) => ({
    property,
    duration: ms(part('transition-duration', index)),
    delay: ms(part('transition-delay', index)),
  }));
}

// The properties a @keyframes rule changes, from all of its frames.
function animatedProperties(keyframesRule) {
  const properties = new Set();
  for (const frame of keyframesRule.cssRules) {
    for (let i = 0; i < frame.style.length; i++) properties.add(frame.style[i]);
  }
  properties.delete('animation-timing-function');
  return [...properties];
}

// How far up or down an element is moved by translate and transform, in pixels: negative is up.
function toPixels(length) {
  const match = String(length).trim().match(/^(-?\d*\.?\d+)(px|rem|em)?$/);
  if (!match) return 0;
  return parseFloat(match[1]) * (match[2] === 'rem' || match[2] === 'em' ? 16 : 1);
}
function verticalMove(element, state, reader) {
  const styles = cascade(element, state, reader);
  let move = 0;
  const translate = String(styles.value('translate')).trim();
  if (translate && translate !== 'none') {
    const parts = splitTop(translate, ' ');
    if (parts[1]) move += toPixels(parts[1]);
  }
  const transform = String(styles.value('transform'));
  for (const match of transform.matchAll(/translateY\(\s*([^)]+)\)/g)) move += toPixels(match[1]);
  for (const match of transform.matchAll(/translate(?:3d)?\(\s*[^,)]+,\s*([^,)]+)/g)) move += toPixels(match[1]);
  return { move, translate, transform: transform.trim() };
}

const MOVES = ['transform', 'translate', 'rotate', 'scale'];
const SMOOTH = [...MOVES, 'opacity'];
const describe = (animations) => animations.map((a) => `${a.name} ${a.duration}ms, plays ${a.count}`).join('; ');

// ---------- The checks ----------

const star = one('.star');
const title = one('.title');
const fill = one('.loading-fill');
const buttons = all('.menu-button');

test('1) index.html links styles.css, and has the start screen', () => {
  check(one('link[rel="stylesheet"][href="styles.css"]'), 'Keep the <link> to styles.css in the <head> of index.html.');
  check(all('.star').length >= 3 && title && fill && buttons.length === 3,
    'index.html should still have its stars (.star), its .title, its three .menu-button buttons and its .loading-fill. Put the page back the way it came.');
});

test('2) the stars twinkle: a @keyframes animation on .star that plays forever', () => {
  const animations = animationsOf(star, 'base', full);
  check(animations.length > 0, 'The stars have no animation yet. Write a @keyframes rule, then play it on .star with the animation property.');
  const twinkle = animations.find((animation) => animation.keyframes);
  check(twinkle, `.star plays "${animations[0].name}", but styles.css has no @keyframes rule with that name. The two names must match exactly, capital letters included.`);
  check(twinkle.duration > 0, `.star plays ${twinkle.name} with no duration, so it lasts 0 seconds. Add a time, such as 1.5s.`);
  check(twinkle.count === 'infinite', `.star plays ${twinkle.name} ${twinkle.count} time(s). The stars twinkle forever: use infinite.`);
  check(animatedProperties(twinkle.keyframes).includes('opacity'), `@keyframes ${twinkle.name} doesn't change opacity. A twinkle goes from dim to bright: animate opacity.`);
});

test('3) the title slides in once, after 0.3 seconds, with no jump', () => {
  const animations = animationsOf(title, 'base', full);
  check(animations.length > 0, 'The title has no animation yet. Write a @keyframes rule that starts it above its place and see-through, and play it on .title.');
  const slide = animations.find((animation) => animation.keyframes);
  check(slide, `.title plays "${animations[0].name}", but styles.css has no @keyframes rule with that name.`);
  check(slide.duration > 0, `.title plays ${slide.name} with no duration. Add one, such as 700ms.`);
  check(slide.count !== 'infinite' && Number(slide.count) <= 1, `.title plays ${slide.name} ${slide.count} time(s). The title slides in once: leave out the iteration count, or use 1.`);
  const moves = animatedProperties(slide.keyframes).filter((property) => MOVES.includes(property));
  check(moves.length > 0, `@keyframes ${slide.name} doesn't move the title. Start it 3rem above its place with translate (or transform).`);
  check(slide.delay > 0, `.title's animation starts at once. Give it a delay of 0.3s: the second time in the animation line is the delay.`);
  check(slide.fill === 'backwards' || slide.fill === 'both',
    `.title has animation-fill-mode ${slide.fill}, so during the 0.3s delay it sits in its normal place, then jumps up to start sliding. Use backwards or both, so it waits at its first frame.`);
});

test('4) the loading bar fills again and again, with scale, not width', () => {
  const animations = animationsOf(fill, 'base', full);
  check(animations.length > 0, 'The loading bar has no animation yet. Write a @keyframes rule that grows .loading-fill with scale, and play it forever.');
  const load = animations.find((animation) => animation.keyframes);
  check(load, `.loading-fill plays "${animations[0].name}", but styles.css has no @keyframes rule with that name.`);
  check(load.duration > 0, `.loading-fill plays ${load.name} with no duration. Add one, such as 2s.`);
  check(load.count === 'infinite', `.loading-fill plays ${load.name} ${load.count} time(s). A loading bar keeps going until the game is ready: use infinite.`);
  const properties = animatedProperties(load.keyframes);
  check(!properties.includes('width'), `@keyframes ${load.name} animates width, which redoes the layout every frame. Grow the fill with scale (scale: 0 1 to scale: 1 1) instead.`);
  check(properties.some((property) => MOVES.includes(property)), `@keyframes ${load.name} doesn't grow the fill. Animate scale across, from 0 to 1.`);
});

test('5) every @keyframes rule animates only transform and opacity', () => {
  const rules = [...full.keyframes.values()];
  check(rules.length > 0, 'styles.css has no @keyframes rules yet.');
  for (const rule of rules) {
    const others = animatedProperties(rule).filter((property) => !SMOOTH.includes(property));
    check(others.length === 0,
      `@keyframes ${rule.name} animates ${others.join(', ')}. Animate only transform (translate, rotate, scale) and opacity, so the motion stays smooth.`);
  }
});

test('6) every menu button lifts on hover and on keyboard focus', () => {
  for (const button of buttons) {
    const name = button.textContent.trim();
    const base = verticalMove(button, 'base', full).move;
    const hover = verticalMove(button, 'hover', full).move;
    const focus = verticalMove(button, 'focus', full).move;
    check(hover < base, `${name} doesn't move up on hover. In a rule for .menu-button:hover, move it up with translate: 0 -4px.`);
    check(focus < base, `${name} lifts on hover but not with keyboard focus. Add .menu-button:focus-visible to the hover rule, with a comma.`);
  }
});

test('7) the lift is a transition on .menu-button, so it runs up and back down', () => {
  for (const button of buttons) {
    const name = button.textContent.trim();
    const hover = verticalMove(button, 'hover', full);
    const lifted = hover.translate && hover.translate !== 'none' ? 'translate' : 'transform';
    const transitions = transitionsOf(button, full).filter((transition) => transition.duration > 0);
    check(transitions.length > 0, `${name} has no transition on its own rule, so the lift is a jump. Add one to .menu-button, not to the hover rule, so it runs both ways.`);
    check(!transitions.some((transition) => transition.property === 'all'), `${name} transitions all. Name the property that moves (${lifted}), and any others you change, such as box-shadow.`);
    const lift = transitions.find((transition) => transition.property === lifted);
    check(lift, `${name} lifts with ${lifted}, but its transition is for ${transitions.map((t) => t.property).join(', ')}. Add ${lifted} to the transition.`);
    check(lift.duration >= 100 && lift.duration <= 500, `${name}'s lift takes ${lift.duration}ms. Make it about 150ms: between 100ms and 500ms feels quick and smooth.`);
  }
});

test('8) styles.css has a prefers-reduced-motion media query', () => {
  check(reducedMotionQueries.length > 0, 'Add a @media (prefers-reduced-motion: reduce) rule after your other rules, for readers who asked for less motion.');
  check(reducedMotionQueries.some((query) => query.cssRules.length > 0), 'Your prefers-reduced-motion media query is empty. Put the rules that calm the screen inside its curly braces.');
});

test('9) with reduced motion, the stars and the loading bar stop looping', () => {
  check(reducedMotionQueries.length > 0, 'Add the @media (prefers-reduced-motion: reduce) rule first (check 8), then put the rules that calm the screen inside it.');
  for (const [element, name] of [[star, 'the stars (.star)'], [fill, 'the loading bar (.loading-fill)']]) {
    const loops = animationsOf(element, 'base', reduced).filter((animation) =>
      animation.keyframes && animation.duration > 0 && animation.count === 'infinite' && animation.play !== 'paused');
    check(loops.length === 0,
      `With reduced motion, there is still a loop on ${name}: ${describe(loops)}. Inside @media (prefers-reduced-motion: reduce), stop it with animation: none. Is the media query after the rule it changes?`);
  }
});

test('10) with reduced motion, the title and the buttons don\'t move', () => {
  check(reducedMotionQueries.length > 0, 'Add the @media (prefers-reduced-motion: reduce) rule first (check 8), then put the rules that calm the screen inside it.');
  const slides = animationsOf(title, 'base', reduced).filter((animation) =>
    animation.keyframes && animation.duration > 200 && animatedProperties(animation.keyframes).some((property) => MOVES.includes(property)));
  check(slides.length === 0,
    `With reduced motion, the title still slides (${describe(slides)}). Swap it for a short fade that changes only opacity, or animation: none.`);
  for (const button of buttons) {
    const name = button.textContent.trim();
    const base = verticalMove(button, 'base', reduced).move;
    const hover = verticalMove(button, 'hover', reduced);
    const lifted = hover.translate && hover.translate !== 'none' ? 'translate' : 'transform';
    const slow = transitionsOf(button, reduced).find((transition) =>
      (transition.property === lifted || transition.property === 'all') && transition.duration > 100);
    check(hover.move === base || !slow,
      `With reduced motion, ${name} still lifts ${Math.abs(hover.move - base)}px over ${slow ? slow.duration : 0}ms. Keep it still: set translate: none for .menu-button:hover and :focus-visible inside the media query.`);
  }
});

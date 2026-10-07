// Entry point: creates the Phaser game at 320×180 and keeps it (and the
// HTML layer on top) scaled by a whole number so pixels stay square.
import Phaser from 'phaser';
import '@fontsource/press-start-2p';
import './ui/style.css';
import { ui } from './ui/dom.js';
import { cq } from './systems/save.js';
import Boot from './scenes/Boot.js';
import Title from './scenes/Title.js';
import Overworld from './scenes/Overworld.js';
import Region from './scenes/Region.js';
import Encounter from './scenes/Encounter.js';
import Versus from './scenes/Versus.js';

const WIDTH = 320, HEIGHT = 180;
const bestZoom = () => Math.max(1, Math.floor(Math.min(innerWidth / WIDTH, innerHeight / HEIGHT)));
const setUnit = zoom => document.documentElement.style.setProperty('--u', `${zoom}px`);

setUnit(bestZoom());
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#000000',
  scale: { mode: Phaser.Scale.NONE, zoom: bestZoom() },
  scene: [Boot, Title, Overworld, Region, Encounter, Versus],
});

ui.root = document.getElementById('ui');
ui.game = game;
cq.game = game; // window.__cq.game — poke at the running game from the browser console

window.addEventListener('resize', () => {
  setUnit(bestZoom());
  game.scale.setZoom(bestZoom());
});

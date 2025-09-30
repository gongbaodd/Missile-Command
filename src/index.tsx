import "./global.css"

/* @refresh reload */
import { render } from 'solid-js/web';
import 'solid-devtools';

import p5 from 'p5'
import { mySketch } from './sketch.js'

import App from './App';

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

render(() => <App />, root!);

new p5(mySketch, document.getElementById('sketch'))
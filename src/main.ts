import '@fontsource-variable/martian-mono/wdth.css';
import '@fontsource-variable/instrument-sans';
import '@fontsource-variable/spline-sans-mono';
import './styles/tokens.css';
import './styles/base.css';

import { mount } from 'svelte';
import App from './App.svelte';

export default mount(App, { target: document.getElementById('app')! });

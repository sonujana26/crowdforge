import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles.css';
import './styles/experience.css';
import './styles/arena.css';
import './styles/landing.css';
if (location.pathname === '/overlay') {
  document.documentElement.classList.add('transparent-overlay');
  document.body.classList.add('overlay-body');
}
createRoot(document.getElementById('root')!).render(<App />);

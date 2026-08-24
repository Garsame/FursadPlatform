import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Puts every navigation at the top of the new page.
 *
 * A single-page app does not reload on navigation, so nothing resets the
 * scroll offset — click "Contact" from the footer of the home page and you
 * arrive on Contact already scrolled to where the footer was, halfway down a
 * page you have never seen. The browser does this for free on a real page
 * load; a router has to be told.
 *
 * Two scrollers exist in this app: the window on public pages, and the <main>
 * element inside the dashboard shells, which scroll internally because their
 * sidebars are pinned. Both are reset, since the router does not know which
 * layout it just rendered.
 *
 * An in-page anchor (/about#team) is honoured rather than overridden, and a
 * change of query string alone — filtering a job list, opening a thread — is
 * left alone, because that is not arriving somewhere new.
 */
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // Let the target element exist before looking for it.
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    document.querySelectorAll('main').forEach((el) => {
      if (el.scrollTop > 0) el.scrollTop = 0;
    });
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;

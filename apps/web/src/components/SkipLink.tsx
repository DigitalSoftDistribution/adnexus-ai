import { skipToContent } from '../hooks/useA11y';

/**
 * SkipLink — "Skip to main content" link
 *
 * - Visible only when focused via Tab key
 * - Jumps past navigation to the <main id="main-content"> element
 * - Styled with lime focus ring for high visibility
 * - First element in the tab order
 */

export default function SkipLink() {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    skipToContent('main-content');
  };

  return (
    <a
      href="#main-content"
      onClick={handleClick}
      className="skip-to-main"
    >
      Skip to main content
      <style>{`
        .skip-to-main {
          position: fixed;
          top: -100%;
          left: 50%;
          transform: translateX(-50%);
          z-index: 99999;
          padding: 12px 24px;
          border-radius: 0 0 12px 12px;
          background: #0a0a0a;
          border: 2px solid #c3f53b;
          border-top: none;
          color: #c3f53b;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: top 0.2s ease;
          pointer-events: none;
          opacity: 0;
        }
        .skip-to-main:focus {
          top: 0;
          pointer-events: auto;
          opacity: 1;
          outline: none;
          box-shadow: 0 0 0 3px rgba(195, 245, 59, 0.3), 0 8px 32px rgba(0,0,0,0.4);
        }
      `}</style>
    </a>
  );
}

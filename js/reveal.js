// Shared reveal observer for all pages.
(function () {
  const revealNodes = document.querySelectorAll('.reveal');
  if (revealNodes.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });

  revealNodes.forEach((node) => observer.observe(node));

  // Ensure above-the-fold first section content is revealed with a quick stagger.
  document.querySelectorAll('section:first-of-type .reveal').forEach((node, index) => {
    setTimeout(() => node.classList.add('visible'), 60 + index * 110);
  });
}());

(function () {
  try {
    var savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') document.documentElement.classList.add('dark');
    if (savedTheme === 'light') document.documentElement.classList.remove('dark');
  } catch (e) {}
})();

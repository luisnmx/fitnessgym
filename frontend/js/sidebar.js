// FitnesGym — Shell compartido (sidebar + navegación móvil).
// Cada página incluye un marcador <div id="app-shell"></div> y llama:
//   <script src="../js/sidebar.js"></script>
//   <script>renderAppShell('key-de-la-pagina-actual')</script>
// Keys válidas: inicio, socios, gestion-socios, gestion-planes, productos, ventas, historial-ventas.
(function () {
  const NAV = [
    { key: 'inicio', label: 'Inicio', icon: 'home', href: 'index.html' },
    { key: 'socios', label: 'Panel de Socios', icon: 'person_add', href: 'socios.html' },
    { key: 'gestion-socios', label: 'Gestión de Socios', icon: 'groups', href: 'gestion-socios.html' },
    { key: 'gestion-planes', label: 'Gestión de Planes', icon: 'credit_card', href: 'gestion-planes.html' },
    { key: 'productos', label: 'Productos', icon: 'inventory_2', href: 'productos.html' },
    { key: 'ventas', label: 'POS', icon: 'point_of_sale', href: 'ventas.html' },
    { key: 'historial-ventas', label: 'Historial de Ventas', icon: 'receipt_long', href: 'historial-ventas.html' },
  ];

  function navLinkDesktop(item, active) {
    const activeCls = active
      ? 'bg-primary-container text-on-primary-container font-bold'
      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface';
    const aria = active ? ' aria-current="page"' : '';
    return (
      '<a' + aria +
      ' class="flex items-center gap-space-sm px-space-md py-space-sm rounded-lg transition-colors ' + activeCls + '"' +
      ' href="' + item.href + '">' +
      '<span class="material-symbols-outlined text-[20px]">' + item.icon + '</span>' +
      '<span class="font-label-lg text-label-lg">' + item.label + '</span>' +
      '</a>'
    );
  }

  function navLinkMobile(item, active) {
    const activeCls = active
      ? 'bg-primary-container text-on-primary-container font-bold'
      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface';
    const aria = active ? ' aria-current="page"' : '';
    return (
      '<a' + aria +
      ' class="shrink-0 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ' + activeCls + '"' +
      ' href="' + item.href + '">' +
      '<span class="material-symbols-outlined text-[16px]">' + item.icon + '</span>' +
      '<span class="font-label-md text-label-md">' + item.label + '</span>' +
      '</a>'
    );
  }

  function renderAppShell(activeKey) {
    const desktopNav = NAV.map((i) => navLinkDesktop(i, i.key === activeKey)).join('');
    const mobileNav = NAV.map((i) => navLinkMobile(i, i.key === activeKey)).join('');
    const username = (window.FitnesGymAuth && FitnesGymAuth.currentUsername()) || 'Administrador';

    const aside =
      '<aside class="fixed left-0 top-0 h-full w-64 bg-surface-container-low z-50 hidden md:flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)]">' +
      '  <div class="flex flex-col">' +
      '    <div class="h-16 px-space-md flex items-center gap-space-sm bg-surface-container-lowest">' +
      '      <div class="flex flex-col">' +
      '        <span class="font-headline-sm text-headline-sm text-on-surface leading-none tracking-tight">FitnesGym</span>' +
      '        <span class="font-label-sm text-label-sm text-primary tracking-widest uppercase">Studio</span>' +
      '      </div>' +
      '    </div>' +
      '    <div class="px-space-md py-space-sm">' +
      '      <div class="flex items-center justify-between px-space-sm py-space-xs bg-surface-container rounded-lg">' +
      '        <div class="flex items-center gap-space-xs">' +
      '          <span class="h-2 w-2 rounded-full bg-primary animate-pulse"></span>' +
      '          <span class="font-label-sm text-label-sm text-on-surface">ONLINE</span>' +
      '        </div>' +
      '      </div>' +
      '    </div>' +
      '    <nav class="flex flex-col gap-space-xs px-space-sm mt-space-xs">' + desktopNav + '</nav>' +
      '  </div>' +
      '  <div class="p-space-md bg-surface-container-lowest">' +
      '    <div class="flex items-center gap-space-sm">' +
      '      <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center">' +
      '        <span class="material-symbols-outlined text-on-primary text-[18px]">person</span>' +
      '      </div>' +
      '      <div class="flex flex-col min-w-0">' +
      '        <span class="font-label-md text-label-md text-on-surface leading-tight truncate">' + username + '</span>' +
      '        <span class="font-label-sm text-label-sm text-on-surface-variant leading-tight">Sesión activa</span>' +
      '      </div>' +
      '    </div>' +
      '    <div class="flex flex-col gap-space-xs mt-space-sm">' +
      '      <button type="button" onclick="FitnesGymAuth.openChangePassword()" class="flex items-center gap-space-xs px-space-sm py-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors w-full text-left cursor-pointer">' +
      '        <span class="material-symbols-outlined text-[18px]">lock_reset</span>' +
      '        <span class="font-label-md text-label-md">Cambiar contraseña</span>' +
      '      </button>' +
      '      <button type="button" onclick="FitnesGymAuth.logout()" class="flex items-center gap-space-xs px-space-sm py-space-xs rounded-lg text-secondary hover:bg-secondary-container/20 transition-colors w-full text-left cursor-pointer">' +
      '        <span class="material-symbols-outlined text-[18px]">logout</span>' +
      '        <span class="font-label-md text-label-md">Cerrar sesión</span>' +
      '      </button>' +
      '    </div>' +
      '  </div>' +
      '</aside>';

    const mobileNavHtml =
      '<nav class="md:hidden fixed top-16 right-0 left-0 z-30 flex items-center gap-1.5 overflow-x-auto bg-surface-container-low px-3 py-2 shadow-md" aria-label="Navegación móvil">' +
      mobileNav +
      '</nav>';

    const html = aside + mobileNavHtml;
    const target = document.getElementById('app-shell');
    if (target) {
      target.innerHTML = html;
    } else {
      document.body.insertAdjacentHTML('afterbegin', html);
    }
  }

  window.renderAppShell = renderAppShell;
})();